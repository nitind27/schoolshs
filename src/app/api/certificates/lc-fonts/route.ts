import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { cleanLcFonts } from "@/lib/certificates/lc-fonts";

async function settingsFor(schoolId: string, schoolName: string) {
  const existing = await prisma.schoolSettings.findUnique({ where: { schoolId } });
  if (existing) return existing;
  return prisma.schoolSettings.create({
    data: { schoolId, schoolName: schoolName || "My School" },
  });
}

export async function GET() {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk", "teacher"]);
    const settings = await settingsFor(session.schoolId, session.schoolName || "");
    return NextResponse.json({ fonts: cleanLcFonts(settings.lcFontJson) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to load font sizes" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = (await request.json()) as { fonts?: unknown };
    const fonts = cleanLcFonts(body.fonts);
    await settingsFor(session.schoolId, session.schoolName || "");
    await prisma.schoolSettings.update({
      where: { schoolId: session.schoolId },
      data: { lcFontJson: fonts },
    });
    return NextResponse.json({ fonts });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to save font sizes" }, { status: 500 });
  }
}
