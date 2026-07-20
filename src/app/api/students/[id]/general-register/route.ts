import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  mapEntryToGrRow,
  mapStudentToGrRow,
} from "@/lib/certificates/general-register";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSchoolAuth();
    const { id } = await params;

    const student = await prisma.student.findFirst({
      where: { id, schoolId: session.schoolId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    let academicYear = student.financialYear || "2025-26";
    let classLabel = "";
    let classId = student.classId || "";

    if (student.classId) {
      const cls = await prisma.schoolClass.findFirst({
        where: { id: student.classId, schoolId: session.schoolId },
        select: { id: true, name: true, standard: true, section: true, stream: true, academicYear: true },
      });
      if (cls) {
        classId = cls.id;
        if (cls.academicYear) academicYear = cls.academicYear;
        const streamLabel = cls.stream ? ` ${cls.stream}` : "";
        classLabel = `ધોરણ ${cls.standard}${streamLabel} — વર્ગ ${cls.section}`;
      }
    } else if (student.standard) {
      const streamLabel = "";
      classLabel = `ધોરણ ${student.standard}${streamLabel}${student.section ? ` — વર્ગ ${student.section}` : ""}`;
    }

    const school = await prisma.school.findUnique({
      where: { id: session.schoolId },
      select: { udiseCode: true },
    });
    const settings = await prisma.schoolSettings.findFirst({
      where: { schoolId: session.schoolId },
    });

    const grNumber = student.grNumber?.trim();
    let grEntry = null;

    if (grNumber) {
      grEntry = await prisma.generalRegisterEntry.findFirst({
        where: { schoolId: session.schoolId, academicYear, grNumber },
        include: { student: { select: { mobileNumber: true } } },
      });
    }

    if (!grEntry) {
      grEntry = await prisma.generalRegisterEntry.findFirst({
        where: { schoolId: session.schoolId, studentId: student.id, academicYear },
        include: { student: { select: { mobileNumber: true } } },
      });
    }

    const row = grEntry
      ? mapEntryToGrRow(
          {
            ...grEntry,
            student: { mobileNumber: student.mobileNumber || grEntry.student?.mobileNumber },
          },
          1,
        )
      : mapStudentToGrRow(student, 1, school?.udiseCode);

    return NextResponse.json({
      row,
      schoolName: settings?.schoolName || session.schoolName || "",
      academicYear,
      classLabel,
      classId,
      hasSavedEntry: Boolean(grEntry),
      hasGrNumber: Boolean(grNumber),
      source: grEntry ? "saved" : "student_preview",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("student general-register error:", error);
    return NextResponse.json({ error: "Failed to load register" }, { status: 500 });
  }
}
