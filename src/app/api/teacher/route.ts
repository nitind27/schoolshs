import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSchoolAuth(["teacher"]);

    if (!session.staffId) {
      return NextResponse.json({
        classes: [],
        stats: { totalStudents: 0, totalClasses: 0, boys: 0, girls: 0 },
        message: "no_staff",
      });
    }

    const classes = await prisma.schoolClass.findMany({
      where: { schoolId: session.schoolId, classTeacherId: session.staffId },
      orderBy: [{ standard: "asc" }, { section: "asc" }],
      select: {
        id: true,
        name: true,
        standard: true,
        section: true,
        stream: true,
        academicYear: true,
        students: {
          where: { status: { not: "archived" } },
          orderBy: [{ rollNumber: "asc" }, { surname: "asc" }, { firstName: "asc" }],
          select: {
            id: true,
            firstName: true,
            middleName: true,
            surname: true,
            firstNameGu: true,
            surnameGu: true,
            rollNumber: true,
            grNumber: true,
            gender: true,
            category: true,
            caste: true,
            mobileNumber: true,
            dateOfBirth: true,
            status: true,
            aadhaarNumber: true,
            fatherName: true,
            motherName: true,
          },
        },
      },
    });

    let boys = 0;
    let girls = 0;
    let totalStudents = 0;
    for (const cls of classes) {
      for (const s of cls.students) {
        totalStudents++;
        const g = (s.gender || "").toLowerCase();
        if (g.startsWith("m") || g.includes("boy")) boys++;
        else if (g.startsWith("f") || g.includes("girl")) girls++;
      }
    }

    return NextResponse.json({
      classes,
      stats: {
        totalStudents,
        totalClasses: classes.length,
        boys,
        girls,
        other: Math.max(0, totalStudents - boys - girls),
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[teacher GET]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
