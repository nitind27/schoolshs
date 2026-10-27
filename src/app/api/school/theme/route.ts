import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { isThemeId, themeById } from "@/lib/themes";

export async function GET() {
  try {
    const session = await requireSchoolAuth();
    const settings = await prisma.schoolSettings.findUnique({
      where: { schoolId: session.schoolId },
      select: { themeId: true },
    });
    const theme = themeById(settings?.themeId);
    return NextResponse.json({ themeId: theme.id });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to load theme" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "supervisor"]);
    const body = await request.json();
    if (!isThemeId(body.themeId)) {
      return NextResponse.json({ error: "Unknown theme" }, { status: 400 });
    }
    await prisma.schoolSettings.upsert({
      where: { schoolId: session.schoolId },
      create: {
        schoolId: session.schoolId,
        schoolName: session.schoolName || "My School",
        themeId: body.themeId,
      },
      update: { themeId: body.themeId },
    });
    return NextResponse.json({ themeId: body.themeId });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to save theme" }, { status: 500 });
  }
}
