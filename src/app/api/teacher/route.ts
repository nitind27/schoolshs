import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSchoolAuth(["teacher"]);

    const classes = await prisma.schoolClass.findMany({
      where: { schoolId: session.schoolId, classTeacherId: session.staffId || undefined },
      include: {
        students: { orderBy: { rollNumber: "asc" } },
        classTeacher: true,
      },
    });

    const stats = {
      totalStudents: classes.reduce((s, c) => s + c.students.length, 0),
      totalClasses: classes.length,
    };

    return NextResponse.json({ classes, stats });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
