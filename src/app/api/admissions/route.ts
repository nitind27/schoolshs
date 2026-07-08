import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const standard = searchParams.get("standard");

    const students = await prisma.student.findMany({
      where: {
        schoolId: session.schoolId,
        admissionStatus: status,
        ...(standard ? { standard } : {}),
      },
      include: { schoolClass: true },
      orderBy: { createdAt: "desc" },
    });

    const stats = await prisma.student.groupBy({
      by: ["admissionStatus"],
      where: { schoolId: session.schoolId },
      _count: true,
    });

    return NextResponse.json({ students, stats });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const { studentId, admissionStatus, notes } = await request.json();

    const student = await prisma.student.update({
      where: { id: studentId, schoolId: session.schoolId },
      data: {
        admissionStatus,
        verifiedAt: admissionStatus === "verified" ? new Date() : null,
        verifiedBy: admissionStatus === "verified" ? session.name : null,
        ...(notes ? { notes } : {}),
      },
    });

    return NextResponse.json(student);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
