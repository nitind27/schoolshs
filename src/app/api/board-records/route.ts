import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);

    const where: Record<string, unknown> = { schoolId: session.schoolId };
    if (session.role === "teacher" && session.staffId) {
      const classes = await prisma.schoolClass.findMany({
        where: { classTeacherId: session.staffId },
        select: { id: true },
      });
      where.classId = { in: classes.map((c) => c.id) };
    }

    const students = await prisma.student.findMany({
      where: {
        ...where,
        OR: [{ standard: "10" }, { standard: "12" }],
      },
      select: {
        id: true,
        firstName: true,
        surname: true,
        standard: true,
        section: true,
        rollNumber: true,
        grNumber: true,
        board10th: true,
        percentage10th: true,
        year10th: true,
        board12th: true,
        percentage12th: true,
        year12th: true,
        marksheet10Path: true,
        marksheet12Path: true,
        childUid: true,
        aadhaarNumber: true,
        sscSeatPrefix: true,
        sscSeatNumber: true,
        hscSeatPrefix: true,
        hscSeatNumber: true,
        gsebFetchedAt: true,
        gsebResultJson: true,
      },
      orderBy: [{ standard: "asc" }, { section: "asc" }, { rollNumber: "asc" }],
    });

    return NextResponse.json({ students });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
