import "server-only";

import type { GeneralRegisterEntry, Student } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { entryPayloadFromStudent } from "@/lib/certificates/general-register";

export { stableDraftAadhaarFromGr, grEntryToStudentPartial } from "@/lib/gr-student-utils";

export async function findStudentByGrNumber(schoolId: string, grNumber: string) {
  const gr = grNumber.trim();
  if (!gr) return null;
  return prisma.student.findFirst({
    where: { schoolId, grNumber: gr },
    orderBy: { updatedAt: "desc" },
  });
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

  const existing = await prisma.generalRegisterEntry.findFirst({
    where: { schoolId, academicYear, grNumber },
  });

  if (existing) {
    return prisma.generalRegisterEntry.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.generalRegisterEntry.create({
    data: {
      schoolId,
      academicYear,
      ...data,
    },
  });
}
