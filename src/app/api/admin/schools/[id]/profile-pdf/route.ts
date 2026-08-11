import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireAuth } from "@/lib/auth";
import { getRequestOriginFromHeaders } from "@/lib/email-verification";
import {
  buildSchoolProfilePdf,
  SCHOOL_PROFILE_PDF_PASSWORD,
} from "@/lib/admin/school-profile-pdf";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(["super_admin"]);
    const { id } = await params;
    const variant =
      request.nextUrl.searchParams.get("variant") === "credentials" ? "credentials" : "full";

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        settings: true,
        subscription: true,
        users: {
          where: { role: { in: ["school_admin", "clerk", "teacher", "ca"] } },
          select: {
            name: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            emailVerified: true,
            mustChangePassword: true,
          },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        },
        payments: {
          orderBy: { paymentDate: "desc" },
          take: 20,
          select: {
            amount: true,
            paymentDate: true,
            paymentMethod: true,
            referenceNo: true,
            notes: true,
            receivedBy: true,
          },
        },
        _count: { select: { students: true, staff: true, classes: true, users: true } },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const origin = getRequestOriginFromHeaders(request.headers, request.nextUrl.origin);
    const bytes = await buildSchoolProfilePdf({
      variant,
      school: {
        name: school.name,
        code: school.code,
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
        udiseCode: school.udiseCode,
        isActive: school.isActive,
        createdAt: school.createdAt,
        updatedAt: school.updatedAt,
      },
      settings: school.settings
        ? {
            logoPath: school.settings.logoPath,
            schoolName: school.settings.schoolName,
            schoolAddress: school.settings.schoolAddress,
            schoolPhone: school.settings.schoolPhone,
            schoolEmail: school.settings.schoolEmail,
            academicYear: school.settings.academicYear,
            tagline: school.settings.tagline,
            idCardWebsite: school.settings.idCardWebsite,
          }
        : null,
      subscription: school.subscription,
      users: school.users,
      payments: variant === "full" ? school.payments : [],
      counts: school._count,
      loginUrl: `${origin.replace(/\/$/, "")}/login`,
      generatedAt: new Date(),
    });

    const safeCode = school.code.replace(/[^A-Z0-9_-]/gi, "");
    const filename =
      variant === "credentials"
        ? `Codeat-School-Credentials-${safeCode}.pdf`
        : `Codeat-School-Profile-${safeCode}.pdf`;

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Pdf-Password-Hint": SCHOOL_PROFILE_PDF_PASSWORD,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("School profile PDF failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
