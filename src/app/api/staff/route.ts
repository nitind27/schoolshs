import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { passwordRecord } from "@/lib/user-password";
import { fillStaffGuNames } from "@/lib/gujarati/transliterate-server";
import {
  generateStaffNumericPassword,
  pickStaffPortalRole,
  shouldCreatePortalLogin,
} from "@/lib/staff-portal";
import { buildStaffCredentialsEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mail";

function salaryFields(body: Record<string, unknown>) {
  return {
    monthlySalary: body.monthlySalary != null && body.monthlySalary !== "" ? Number(body.monthlySalary) : null,
    hra: body.hra != null && body.hra !== "" ? Number(body.hra) : 0,
    conveyance: body.conveyance != null && body.conveyance !== "" ? Number(body.conveyance) : 0,
    pfDeduction: body.pfDeduction != null && body.pfDeduction !== "" ? Number(body.pfDeduction) : 0,
    bankName: String(body.bankName || "").trim() || null,
    bankAccount: String(body.bankAccount || "").trim() || null,
    ifscCode: String(body.ifscCode || "").trim() || null,
  };
}

function normalizeStaff(body: Record<string, unknown>) {
  return {
    employeeId: String(body.employeeId || "").trim() || null,
    firstName: String(body.firstName || "").trim(),
    firstNameGu: String(body.firstNameGu || "").trim() || null,
    lastName: String(body.lastName || "").trim(),
    lastNameGu: String(body.lastNameGu || "").trim() || null,
    designation: String(body.designation || "").trim(),
    department: String(body.department || "").trim() || null,
    mobileNumber: String(body.mobileNumber || "").replace(/\s/g, "").trim(),
    email: String(body.email || "").trim().toLowerCase() || null,
    gender: String(body.gender || "").trim() || null,
    dateOfJoining: String(body.dateOfJoining || "").trim() || null,
    dateOfBirth: String(body.dateOfBirth || "").trim() || null,
    panNumber: String(body.panNumber || "").trim().toUpperCase() || null,
    gpfCpfNo: String(body.gpfCpfNo || "").trim() || null,
    aadhaarNumber: String(body.aadhaarNumber || "").replace(/\s/g, "") || null,
    qualification: String(body.qualification || "").trim() || null,
    payLevel: String(body.payLevel || "").trim() || null,
    isActive: body.isActive !== false,
    photoPath: String(body.photoPath || "").trim() || null,
    ...salaryFields(body),
  };
}

function roleLabel(role: string) {
  if (role === "clerk") return "Clerk";
  if (role === "teacher") return "Teacher";
  return role;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const designation = searchParams.get("designation");
    const activeOnly = searchParams.get("active") !== "false";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const where: Record<string, unknown> = { schoolId: session.schoolId };
    if (activeOnly) where.isActive = true;
    if (designation) where.designation = designation;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { mobileNumber: { contains: search } },
        { employeeId: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        orderBy: [{ designation: "asc" }, { firstName: "asc" }],
        include: { _count: { select: { classes: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.staff.count({ where }),
    ]);

    return NextResponse.json({ staff, total, page, limit });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to fetch staff", staff: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const body = await request.json();
    const data = await fillStaffGuNames(normalizeStaff(body));

    if (!data.firstName || !data.lastName || !data.designation || !data.mobileNumber) {
      return NextResponse.json({ error: "Name, designation and mobile are required" }, { status: 400 });
    }

    if (!data.employeeId) {
      return NextResponse.json({ error: "Teacher code is required" }, { status: 400 });
    }

    data.employeeId = data.employeeId.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,20}$/.test(data.employeeId)) {
      return NextResponse.json(
        { error: "Teacher code must be 2–20 characters (letters, numbers, - or _)" },
        { status: 400 },
      );
    }

    if (!/^[6-9]\d{9}$/.test(data.mobileNumber)) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
    }

    if (!data.email || !data.email.includes("@")) {
      return NextResponse.json(
        { error: "Email is required — it is used as the portal login username" },
        { status: 400 },
      );
    }

    const existing = await prisma.staff.findUnique({
      where: { schoolId_employeeId: { schoolId: session.schoolId, employeeId: data.employeeId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Teacher code already exists" }, { status: 409 });
    }

    const createPortal = shouldCreatePortalLogin(data.designation);
    let generatedPassword: string | null = null;
    let portalRole: string | null = null;
    let emailSent = false;
    let emailError: string | null = null;

    if (createPortal) {
      const emailTaken = await prisma.user.findFirst({
        where: { email: data.email },
        select: { id: true },
      });
      if (emailTaken) {
        return NextResponse.json(
          { error: "This email is already used by another portal account" },
          { status: 409 },
        );
      }
      generatedPassword = generateStaffNumericPassword(8);
      portalRole = pickStaffPortalRole(data.designation);
    }

    const staff = await prisma.$transaction(async (tx) => {
      const created = await tx.staff.create({
        data: { ...data, schoolId: session.schoolId },
      });

      if (createPortal && generatedPassword && portalRole && data.email) {
        await tx.user.create({
          data: {
            email: data.email,
            ...passwordRecord(generatedPassword),
            name: `${created.firstName} ${created.lastName}`.trim(),
            role: portalRole,
            schoolId: session.schoolId,
            staffId: created.id,
            isActive: true,
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
        });
      }

      return created;
    });

    if (createPortal && generatedPassword && portalRole && data.email) {
      try {
        const school = await prisma.school.findUnique({
          where: { id: session.schoolId! },
          select: {
            code: true,
            name: true,
            settings: { select: { schoolName: true } },
          },
        });
        const schoolName = school?.settings?.schoolName || school?.name || "Your School";
        const origin = new URL(request.url).origin;
        const mail = buildStaffCredentialsEmail({
          staffName: `${staff.firstName} ${staff.lastName}`.trim(),
          schoolName,
          schoolCode: school?.code,
          loginEmail: data.email,
          password: generatedPassword,
          roleLabel: roleLabel(portalRole),
          designation: staff.designation,
          employeeId: staff.employeeId,
          loginUrl: `${origin}/login`,
        });
        await sendMail({
          to: data.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
        emailSent = true;
      } catch (e) {
        emailError = e instanceof Error ? e.message : "Failed to send email";
        console.error("[staff POST] welcome email failed:", e);
      }
    }

    return NextResponse.json(
      {
        ...staff,
        portal: createPortal
          ? {
              created: true,
              username: data.email,
              password: generatedPassword,
              role: portalRole,
              emailSent,
              emailError,
            }
          : {
              created: false,
              reason: "Designation does not need portal login",
            },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[staff POST]", error);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}
