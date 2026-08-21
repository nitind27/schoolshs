import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { getTeacherScope } from "@/lib/teacher-scope";

export async function GET() {
  try {
    const session = await requireSchoolAuth(["teacher"]);

    if (!session.staffId) {
      return NextResponse.json({
        classes: [],
        stats: { totalStudents: 0, totalClasses: 0, boys: 0, girls: 0 },
        defaultClassId: null,
        currentPeriod: null,
        message: "no_staff",
      });
    }

    const scope = await getTeacherScope(session);
    const classIds = scope.attendanceClassIds;

    const classes = classIds.length
      ? await prisma.schoolClass.findMany({
          where: { schoolId: session.schoolId, id: { in: classIds } },
          select: {
            id: true,
            name: true,
            standard: true,
            section: true,
            stream: true,
            academicYear: true,
            students: {
              where: { status: { not: "archived" } },
              orderBy: [
                { rollNumber: "asc" },
                { surname: "asc" },
                { firstName: "asc" },
              ],
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
                sscSeatPrefix: true,
                sscSeatNumber: true,
                hscSeatPrefix: true,
                hscSeatNumber: true,
              },
            },
          },
        })
      : [];

    const classById = new Map(classes.map((c) => [c.id, c]));
    const scopedClasses = scope.classes
      .map((s) => {
        const cls = classById.get(s.id);
        if (!cls) return null;
        return {
          ...cls,
          isHomeroom: s.isHomeroom,
          isTeaching: s.isTeaching,
          canMarkAttendance: s.canMarkAttendance,
          canEnterMarks: s.canEnterMarks,
          subjects: s.subjects,
          subjectCodes: s.subjectCodes,
        };
      })
      .filter((c): c is NonNullable<typeof c> => Boolean(c));

    let boys = 0;
    let girls = 0;
    let totalStudents = 0;
    for (const cls of scopedClasses) {
      for (const s of cls.students) {
        totalStudents++;
        const g = (s.gender || "").toLowerCase();
        if (g.startsWith("m") || g.includes("boy")) boys++;
        else if (g.startsWith("f") || g.includes("girl")) girls++;
      }
    }

    return NextResponse.json({
      classes: scopedClasses,
      defaultClassId: scope.defaultClassId,
      currentPeriod: scope.currentPeriod,
      stats: {
        totalStudents,
        totalClasses: scopedClasses.length,
        boys,
        girls,
        other: Math.max(0, totalStudents - boys - girls),
      },
    });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[teacher GET]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
