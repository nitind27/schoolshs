import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  findStudentByGrNumber,
  grEntryToStudentPartial,
} from "@/lib/gr-student-sync";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const params = request.nextUrl.searchParams;
    const grNumber = String(params.get("grNumber") || "").trim();
    const classId = params.get("classId") || "";
    const academicYear = params.get("academicYear") || "2025-26";

    if (!grNumber) {
      return NextResponse.json({ error: "GR number required" }, { status: 400 });
    }

    const student = await findStudentByGrNumber(session.schoolId, grNumber);

    let grEntry = await prisma.generalRegisterEntry.findFirst({
      where: {
        schoolId: session.schoolId,
        academicYear,
        grNumber,
      },
    });

    if (!grEntry && student?.id) {
      grEntry = await prisma.generalRegisterEntry.findFirst({
        where: { schoolId: session.schoolId, studentId: student.id, academicYear },
      });
    }

    let classMeta = null;
    if (classId) {
      classMeta = await prisma.schoolClass.findFirst({
        where: { id: classId, schoolId: session.schoolId },
        select: { id: true, name: true, standard: true, section: true, academicYear: true },
      });
    }

    const fromGr = grEntry ? grEntryToStudentPartial(grEntry) : {};
    const suggested: Record<string, unknown> = {
      grNumber,
      ...(classMeta
        ? {
            classId: classMeta.id,
            standard: classMeta.standard,
            section: classMeta.section,
            financialYear: classMeta.academicYear,
          }
        : {}),
      ...fromGr,
    };

    if (student) {
      return NextResponse.json({
        found: true,
        source: grEntry ? "both" : "student",
        student,
        grEntry,
        suggested: {
          ...suggested,
          ...student,
          grNumber,
        },
      });
    }

    if (grEntry) {
      return NextResponse.json({
        found: true,
        source: "gr_entry",
        student: null,
        grEntry,
        suggested,
      });
    }

    return NextResponse.json({
      found: false,
      source: null,
      student: null,
      grEntry: null,
      suggested: {
        grNumber,
        ...(classMeta
          ? {
              classId: classMeta.id,
              standard: classMeta.standard,
              section: classMeta.section,
              financialYear: classMeta.academicYear,
            }
          : {}),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("lookup-gr error:", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
