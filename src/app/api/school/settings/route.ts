import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSchoolAuth();
    let settings = await prisma.schoolSettings.findUnique({ where: { schoolId: session.schoolId } });
    if (!settings) {
      settings = await prisma.schoolSettings.create({
        data: {
          schoolId: session.schoolId,
          schoolName: session.schoolName || "My School",
        },
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const body = await request.json();
    const settings = await prisma.schoolSettings.upsert({
      where: { schoolId: session.schoolId },
      create: {
        schoolId: session.schoolId,
        schoolName: body.schoolName || session.schoolName || "My School",
        schoolAddress: body.schoolAddress || null,
        schoolPhone: body.schoolPhone || null,
        schoolEmail: body.schoolEmail || null,
        academicYear: body.academicYear || "2025-26",
        logoPath: body.logoPath || null,
        idCardPrimaryColor: body.idCardPrimaryColor || "#e91e8c",
        idCardAccentColor: body.idCardAccentColor || "#1e3a8a",
        tagline: body.tagline || null,
        dgSjedUsername: body.dgSjedUsername?.trim() || null,
        dgSjedPassword: body.dgSjedPassword || null,
        dgCitizenLoginId: body.dgCitizenLoginId?.trim() || null,
        dgCitizenPassword: body.dgCitizenPassword || null,
        dgCitizenLoginMethod: body.dgCitizenLoginMethod || "mobile",
      },
      update: {
        schoolName: body.schoolName,
        schoolAddress: body.schoolAddress || null,
        schoolPhone: body.schoolPhone || null,
        schoolEmail: body.schoolEmail || null,
        academicYear: body.academicYear || "2025-26",
        logoPath: body.logoPath || null,
        idCardPrimaryColor: body.idCardPrimaryColor || "#e91e8c",
        idCardAccentColor: body.idCardAccentColor || "#1e3a8a",
        tagline: body.tagline || null,
        ...(body.dgSjedUsername !== undefined && { dgSjedUsername: body.dgSjedUsername?.trim() || null }),
        ...(body.dgSjedPassword !== undefined && body.dgSjedPassword !== "" && { dgSjedPassword: body.dgSjedPassword }),
        ...(body.dgCitizenLoginId !== undefined && { dgCitizenLoginId: body.dgCitizenLoginId?.trim() || null }),
        ...(body.dgCitizenPassword !== undefined && body.dgCitizenPassword !== "" && { dgCitizenPassword: body.dgCitizenPassword }),
        ...(body.dgCitizenLoginMethod !== undefined && { dgCitizenLoginMethod: body.dgCitizenLoginMethod }),
      },
    });
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
