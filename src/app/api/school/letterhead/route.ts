import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  defaultLetterheadForSchoolCode,
  isLetterheadDocumentState,
  type LetterheadDocumentState,
} from "@/lib/letterhead/defaults";

export async function GET() {
  try {
    const session = await requireSchoolAuth();
    const school = await prisma.school.findUnique({
      where: { id: session.schoolId },
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        settings: {
          select: {
            schoolName: true,
            schoolAddress: true,
            schoolPhone: true,
            schoolEmail: true,
            logoPath: true,
            letterheadJson: true,
          },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const saved = school.settings?.letterheadJson;
    const fromDb = isLetterheadDocumentState(saved) ? (saved as LetterheadDocumentState) : null;
    const data =
      fromDb ||
      defaultLetterheadForSchoolCode(school.code, {
        name: school.settings?.schoolName || school.name,
        address: school.settings?.schoolAddress || school.address,
        phone: school.settings?.schoolPhone || school.phone,
        email: school.settings?.schoolEmail || school.email,
      });

    // Prefer settings logo when letterhead has no custom logo
    if ((!data.logo || data.logo === "/shs/logo.png") && school.settings?.logoPath) {
      data.logo = school.settings.logoPath;
    }

    return NextResponse.json({
      schoolId: school.id,
      schoolCode: school.code,
      schoolName: school.settings?.schoolName || school.name,
      saved: Boolean(fromDb),
      data,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/school/letterhead", error);
    return NextResponse.json({ error: "Failed to load letterhead" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const body = await request.json();
    const data = body?.data ?? body;

    if (!isLetterheadDocumentState(data)) {
      return NextResponse.json({ error: "Invalid letterhead payload" }, { status: 400 });
    }

    // Keep payload bounded (avoid huge base64 stamp/logo abuse)
    const raw = JSON.stringify(data);
    if (raw.length > 2_500_000) {
      return NextResponse.json({ error: "Letterhead data too large" }, { status: 413 });
    }

    const school = await prisma.school.findUnique({
      where: { id: session.schoolId },
      select: { id: true, code: true, name: true },
    });
    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    await prisma.schoolSettings.upsert({
      where: { schoolId: session.schoolId },
      create: {
        schoolId: session.schoolId,
        schoolName: session.schoolName || school.name || "My School",
        letterheadJson: data as object,
      },
      update: {
        letterheadJson: data as object,
      },
    });

    return NextResponse.json({
      ok: true,
      schoolId: school.id,
      schoolCode: school.code,
      saved: true,
      data,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PUT /api/school/letterhead", error);
    return NextResponse.json({ error: "Failed to save letterhead" }, { status: 500 });
  }
}
