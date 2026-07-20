import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import {
  parseStreamFromClassName,
  type BoardClassInfo,
} from "@/lib/board-records/class-utils";

function countSeatsFilled(
  students: Array<{
    standard: string;
    sscSeatNumber: string | null;
    hscSeatNumber: string | null;
  }>,
  standard: string
) {
  return students.filter((s) => {
    const seat = standard === "10" ? s.sscSeatNumber : s.hscSeatNumber;
    return seat && seat.length === 7;
  }).length;
}

export async function GET() {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);

    const classWhere: Record<string, unknown> = {
      schoolId: session.schoolId,
      standard: { in: ["10", "12"] },
    };
    if (session.role === "teacher" && session.staffId) {
      classWhere.classTeacherId = session.staffId;
    }

    const classes = await prisma.schoolClass.findMany({
      where: classWhere,
      orderBy: [{ standard: "asc" }, { section: "asc" }],
      include: {
        classTeacher: { select: { firstName: true, lastName: true } },
        students: {
          select: {
            id: true,
            sscSeatNumber: true,
            hscSeatNumber: true,
          },
        },
      },
    });

    const alsoStudents = await prisma.student.findMany({
      where: {
        schoolId: session.schoolId,
        classId: null,
        standard: { in: ["10", "12"] },
      },
      select: {
        id: true,
        standard: true,
        section: true,
        sscSeatNumber: true,
        hscSeatNumber: true,
      },
    });

    const buildClassInfo = (cls: (typeof classes)[0], extraStudents: typeof alsoStudents = []): BoardClassInfo => {
      const matched = alsoStudents.filter(
        (s) => s.standard === cls.standard && s.section === cls.section
      );
      const allStudents = [...cls.students, ...matched];
      return {
        id: cls.id,
        name: cls.name,
        standard: cls.standard,
        section: cls.section,
        stream: parseStreamFromClassName(cls.name, cls.standard, cls.stream),
        academicYear: cls.academicYear,
        studentCount: allStudents.length,
        seatsFilled: countSeatsFilled(
          allStudents.map((s) => ({ ...s, standard: cls.standard })),
          cls.standard
        ),
        classTeacher: cls.classTeacher
          ? `${cls.classTeacher.firstName} ${cls.classTeacher.lastName}`
          : null,
      };
    };

    const class10 = classes.filter((c) => c.standard === "10").map((c) => buildClassInfo(c));
    const class12 = classes.filter((c) => c.standard === "12").map((c) => buildClassInfo(c));

    const sscStudents = class10.reduce((n, c) => n + c.studentCount, 0);
    const hscStudents = class12.reduce((n, c) => n + c.studentCount, 0);
    const sscSeats = class10.reduce((n, c) => n + c.seatsFilled, 0);
    const hscSeats = class12.reduce((n, c) => n + c.seatsFilled, 0);

    return NextResponse.json({
      ssc: {
        classes: class10,
        totalClasses: class10.length,
        totalStudents: sscStudents,
        seatsFilled: sscSeats,
      },
      hsc: {
        classes: class12,
        totalClasses: class12.length,
        totalStudents: hscStudents,
        seatsFilled: hscSeats,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
