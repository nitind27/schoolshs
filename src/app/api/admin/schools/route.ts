import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { passwordRecord, recordPasswordChange } from "@/lib/user-password";
import { defaultFeaturesForPlan, normalizeFeatureList, normalizeModuleFormats } from "@/lib/school-features";
import {
  isKnownCertificatePackId,
  resolveCertificatePackId,
} from "@/lib/certificates/packs-registry";
import { parseDate, parseDecimal } from "@/lib/admin-school";
import { generateUniqueSchoolCode } from "@/lib/school-code";
import {
  getRequestOriginFromHeaders,
  onboardSchoolAdminUser,
} from "@/lib/email-verification";
import {
  getEmailVerificationRequired,
  isPendingAdminEmailVerified,
  consumePendingAdminEmailVerification,
} from "@/lib/pending-admin-email-otp";
import { sendSchoolAdminWelcomeEmail } from "@/lib/school-admin-welcome";
import { Prisma } from "@/generated/prisma/client";
import { repairEmptySubscriptionJson } from "@/lib/repair-subscription-json";

const schoolInclude = {
  _count: { select: { students: true, users: true, classes: true, staff: true, payments: true } },
  users: {
    where: { role: "school_admin" },
    select: { id: true, email: true, name: true, isActive: true, lastLoginAt: true },
  },
  subscription: true,
  settings: { select: { logoPath: true, schoolName: true } },
} as const;

export async function GET() {
  try {
    await requireAuth(["super_admin"]);
    let schools;
    try {
      schools = await prisma.school.findMany({
        orderBy: { createdAt: "desc" },
        include: schoolInclude,
      });
    } catch (queryErr) {
      // Empty LONGTEXT JSON fields (e.g. moduleFormats="") break Prisma parse
      const msg = queryErr instanceof Error ? queryErr.message : String(queryErr);
      if (msg.includes("JSON") || msg.includes("Unexpected end")) {
        await repairEmptySubscriptionJson();
        schools = await prisma.school.findMany({
          orderBy: { createdAt: "desc" },
          include: schoolInclude,
        });
      } else {
        throw queryErr;
      }
    }
    return NextResponse.json({ schools });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("GET /api/admin/schools failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const body = await request.json();
    const name = String(body.name || "").trim();
    let code = String(body.code || "").trim().toUpperCase().replace(/\s/g, "");

    if (!name) {
      return NextResponse.json({ error: "School name required" }, { status: 400 });
    }

    if (!code) {
      code = await generateUniqueSchoolCode(prisma, name, {
        city: body.city,
        taluka: body.taluka,
        district: body.district,
      });
    }

    const existing = await prisma.school.findUnique({ where: { code } });
    if (existing) return NextResponse.json({ error: "School code already exists" }, { status: 409 });

    const udise = body.udiseCode ? String(body.udiseCode).trim() : null;
    if (udise) {
      const udiseExists = await prisma.school.findUnique({ where: { udiseCode: udise } });
      if (udiseExists) return NextResponse.json({ error: "UDISE code already exists" }, { status: 409 });
    }

    const planName = String(body.planName || "standard");
    const features = normalizeFeatureList(body.enabledFeatures ?? defaultFeaturesForPlan(planName));
    let moduleFormats = normalizeModuleFormats(body.moduleFormats);
    // If a pack folder exists for this school code and SA didn't pick another, auto-bind it
    if (
      (!body.moduleFormats || !body.moduleFormats.certificates) &&
      isKnownCertificatePackId(code)
    ) {
      moduleFormats = { ...moduleFormats, certificates: resolveCertificatePackId(code) };
    }
    if (
      (!body.moduleFormats || !body.moduleFormats.id_cards) &&
      ["24261004403", "24261004404", "24261004405"].includes(code)
    ) {
      moduleFormats = { ...moduleFormats, id_cards: code };
    }
    const contractValue = parseDecimal(body.contractValue);
    const totalAmount = parseDecimal(body.totalAmount) ?? contractValue;
    const initialPayment = parseDecimal(body.initialPayment);

    const adminEmail = body.adminEmail ? String(body.adminEmail).trim().toLowerCase() : null;
    const adminPassword = body.adminPassword ? String(body.adminPassword) : null;
    const adminName = body.adminName ? String(body.adminName).trim() : null;

    if (adminEmail) {
      if (!adminPassword || !adminName) {
        return NextResponse.json({ error: "Admin name, email and password required" }, { status: 400 });
      }
      if (adminPassword.length < 8) {
        return NextResponse.json({ error: "Admin password min 8 characters" }, { status: 400 });
      }
      const emailTaken = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (emailTaken) return NextResponse.json({ error: "Admin email already registered" }, { status: 409 });

      const emailVerificationRequired = await getEmailVerificationRequired();
      if (emailVerificationRequired) {
        const verified = await isPendingAdminEmailVerified(adminEmail);
        if (!verified) {
          return NextResponse.json(
            { error: "Verify school admin email with OTP before creating the school." },
            { status: 400 },
          );
        }
      }
    }

    const paidAmount = initialPayment ?? 0;
    let paymentStatus = "pending";
    if (totalAmount && paidAmount >= totalAmount) paymentStatus = "paid";
    else if (paidAmount > 0) paymentStatus = "partial";

    let createdAdminUserId: string | null = null;
    let adminPreVerified = false;
    if (adminEmail) {
      adminPreVerified =
        !(await getEmailVerificationRequired()) || (await isPendingAdminEmailVerified(adminEmail));
    }

    const school = await prisma.$transaction(async (tx) => {
      const created = await tx.school.create({
        data: {
          name,
          code,
          district: body.district || null,
          taluka: body.taluka || null,
          city: body.city || null,
          pincode: body.pincode || null,
          address: body.address || null,
          phone: body.phone || null,
          alternatePhone: body.alternatePhone || null,
          email: body.email || null,
          website: body.website || null,
          principalName: body.principalName || null,
          schoolType: body.schoolType || null,
          boardAffiliation: body.boardAffiliation || null,
          udiseCode: udise,
          settings: {
            create: {
              schoolName: name,
              schoolAddress: body.address || null,
              schoolPhone: body.phone || null,
              schoolEmail: body.email || null,
              logoPath: body.logoPath || null,
            },
          },
          subscription: {
            create: {
              planName,
              contractNumber: body.contractNumber || null,
              contractValue: contractValue != null ? new Prisma.Decimal(contractValue) : null,
              contractStartDate: parseDate(body.contractStartDate),
              contractEndDate: parseDate(body.contractEndDate),
              contractDocumentPath: body.contractDocumentPath || null,
              contractNotes: body.contractNotes || null,
              enabledFeatures: features,
              moduleFormats,
              paymentStatus,
              totalAmount: totalAmount != null ? new Prisma.Decimal(totalAmount) : null,
              paidAmount: new Prisma.Decimal(paidAmount),
              nextDueDate: parseDate(body.nextDueDate),
            },
          },
        },
        include: schoolInclude,
      });

      if (adminEmail && adminPassword && adminName) {
        const adminUser = await tx.user.create({
          data: {
            email: adminEmail,
            ...passwordRecord(adminPassword),
            name: adminName,
            role: "school_admin",
            schoolId: created.id,
            emailVerified: adminPreVerified,
            emailVerifiedAt: adminPreVerified ? new Date() : null,
          },
        });
        createdAdminUserId = adminUser.id;
      }

      if (initialPayment && initialPayment > 0) {
        await tx.schoolPayment.create({
          data: {
            schoolId: created.id,
            amount: new Prisma.Decimal(initialPayment),
            paymentDate: new Date(),
            paymentMethod: body.initialPaymentMethod || "bank_transfer",
            referenceNo: body.initialPaymentRef || null,
            notes: "Initial payment at onboarding",
            receivedBy: "Super Admin",
          },
        });
      }

      return tx.school.findUniqueOrThrow({ where: { id: created.id }, include: schoolInclude });
    });

    let welcomeEmailSent = false;
    let welcomeEmailError: string | undefined;

    if (createdAdminUserId) {
      if (adminPreVerified) {
        await consumePendingAdminEmailVerification(adminEmail!);
      } else {
        try {
          await onboardSchoolAdminUser(
            createdAdminUserId,
            getRequestOriginFromHeaders(request.headers, request.nextUrl.origin),
          );
        } catch (emailErr) {
          console.error("School admin verification email failed:", emailErr);
        }
      }

      if (adminEmail && adminPassword && adminName) {
        await recordPasswordChange({
          userId: createdAdminUserId,
          email: adminEmail,
          name: adminName,
          role: "school_admin",
          schoolId: school.id,
          password: adminPassword,
          source: "school_register",
          actorUserId: null,
          actorRole: "super_admin",
          actorName: "Super Admin",
        });
      }

      const loginOrigin = getRequestOriginFromHeaders(
        request.headers,
        request.nextUrl.origin,
      );
      const welcomeResult = await sendSchoolAdminWelcomeEmail({
        adminName: adminName!,
        loginEmail: adminEmail!,
        password: adminPassword!,
        loginUrl: `${loginOrigin}/login`,
        emailVerified: adminPreVerified,
        school: {
          name: school.name,
          code: school.code,
          udiseCode: school.udiseCode,
          district: school.district,
          taluka: school.taluka,
          city: school.city,
          pincode: school.pincode,
          address: school.address,
          phone: school.phone,
          alternatePhone: school.alternatePhone,
          email: school.email,
          website: school.website,
          principalName: school.principalName,
          schoolType: school.schoolType,
          boardAffiliation: school.boardAffiliation,
        },
        subscription: school.subscription
          ? {
              planName: school.subscription.planName,
              contractNumber: school.subscription.contractNumber,
              contractStartDate: school.subscription.contractStartDate,
              contractEndDate: school.subscription.contractEndDate,
              paymentStatus: school.subscription.paymentStatus,
              totalAmount: school.subscription.totalAmount?.toString(),
              paidAmount: school.subscription.paidAmount?.toString(),
              nextDueDate: school.subscription.nextDueDate,
            }
          : null,
        enabledFeatures: features,
      });
      welcomeEmailSent = welcomeResult.sent;
      welcomeEmailError = welcomeResult.error;
    }

    return NextResponse.json(
      { ...school, welcomeEmailSent, welcomeEmailError },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to create school" }, { status: 500 });
  }
}
