import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { setClassRelease, getClassRelease } from "@/lib/timetable-server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const classId = String(body.classId || "").trim();
    const academicYear = String(body.academicYear || "2025-26").trim();
    const release = body.release !== false;

    if (!classId) {
      return NextResponse.json({ error: "Class is required" }, { status: 400 });
    }

    const cls = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: session.schoolId },
    });
    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const row = await setClassRelease(
      session.schoolId,
      classId,
      academicYear,
      release,
      session.userId,
    );

    return NextResponse.json({
      ok: true,
      isReleased: row.isReleased,
      releasedAt: row.releasedAt,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("timetable release:", error);
    return NextResponse.json({ error: "Failed to update release" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const classId = request.nextUrl.searchParams.get("classId") || "";
    const academicYear = request.nextUrl.searchParams.get("academicYear") || "2025-26";

    if (!classId) {
      return NextResponse.json({ error: "classId required" }, { status: 400 });
    }

    const row = await getClassRelease(session.schoolId, classId, academicYear);
    return NextResponse.json({
      isReleased: row?.isReleased ?? false,
      releasedAt: row?.releasedAt ?? null,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
