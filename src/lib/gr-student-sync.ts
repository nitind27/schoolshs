import "server-only";

import type { GeneralRegisterEntry, Student } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { entryPayloadFromStudent } from "@/lib/certificates/general-register";

export { stableDraftAadhaarFromGr, grEntryToStudentPartial } from "@/lib/gr-student-utils";

export async function findStudentsByGrNumber(
  schoolId: string,
  grNumber: string,
  excludeStudentId?: string,
) {
  const gr = grNumber.trim();
  if (!gr) return [];
  return prisma.student.findMany({
    where: {
      schoolId,
      grNumber: gr,
      status: { not: "archived" },
      ...(excludeStudentId ? { id: { not: excludeStudentId } } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function findStudentByGrNumber(
  schoolId: string,
  grNumber: string,
  excludeStudentId?: string,
) {
  const rows = await findStudentsByGrNumber(schoolId, grNumber, excludeStudentId);
  return rows[0] ?? null;
}

function payloadToGrDb(
  payload: ReturnType<typeof entryPayloadFromStudent>,
  studentId: string
) {
  return {
    studentId,
    grNumber: payload.grNumber,
    surname: payload.surname,
    firstName: payload.firstName,
    fatherName: payload.fatherName,
    motherName: payload.motherName,
    religionCaste: payload.religionCaste,
    birthPlaceJson: JSON.stringify(payload.birthPlaceLines || []),
    dateOfBirth: payload.dateOfBirth,
    dobWordsGu: payload.dobWordsGu,
    childUidDigits: payload.childUidDigits,
    lastSchool: payload.lastSchool,
    udiseDigits: payload.udiseDigits,
    admissionDate: payload.admissionDate,
    feeStatus: payload.feeStatus,
    standard: payload.standard,
    section: payload.section,
    progress: payload.progress,
    conduct: payload.conduct || "સારી",
    leavingDate: payload.leavingDate,
    leavingStdClass: payload.leavingStdClass,
    lcIssueDate: payload.lcIssueDate,
    remarks: payload.remarks,
  };
}

/** Upsert class-wise GR register row linked to this student */
export async function syncGrEntryForStudent(
  schoolId: string,
  student: Student
): Promise<GeneralRegisterEntry | null> {
  if (student.status === "draft") return null;

  const grNumber = student.grNumber?.trim();
  if (!grNumber) return null;

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { udiseCode: true },
  });

  let academicYear = student.financialYear || "2025-26";
  if (student.classId) {
    const cls = await prisma.schoolClass.findFirst({
      where: { id: student.classId, schoolId },
      select: { academicYear: true },
    });
    if (cls?.academicYear) academicYear = cls.academicYear;
  }

  const payload = entryPayloadFromStudent(student, academicYear, grNumber, school?.udiseCode);
  const data = payloadToGrDb(payload, student.id);

  const byStudent = await prisma.generalRegisterEntry.findFirst({
    where: { schoolId, academicYear, studentId: student.id },
  });
  const byGr = await prisma.generalRegisterEntry.findFirst({
    where: { schoolId, academicYear, grNumber },
  });

  if (byStudent) {
    if (byGr && byGr.id !== byStudent.id) {
      if (!byGr.studentId || byGr.studentId === student.id) {
        await prisma.generalRegisterEntry.delete({ where: { id: byStudent.id } });
        return prisma.generalRegisterEntry.update({
          where: { id: byGr.id },
          data,
        });
      }
      // Another student already holds this GR in the register — do not steal it.
      return byStudent;
    }
    return prisma.generalRegisterEntry.update({
      where: { id: byStudent.id },
      data,
    });
  }

  if (byGr) {
    if (!byGr.studentId || byGr.studentId === student.id) {
      return prisma.generalRegisterEntry.update({
        where: { id: byGr.id },
        data,
      });
    }
    return null;
  }

  return prisma.generalRegisterEntry.create({
    data: {
      schoolId,
      academicYear,
      ...data,
    },
  });
}
