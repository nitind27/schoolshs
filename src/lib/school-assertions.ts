import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/auth";

export class SchoolScopeError extends AuthError {
  constructor(message = "Resource not found in your school") {
    super(message, 404);
  }
}

export async function assertStudentsInSchool(schoolId: string, studentIds: string[]) {
  const unique = [...new Set(studentIds.filter(Boolean))];
  if (!unique.length) return;

  const count = await prisma.student.count({
    where: { schoolId, id: { in: unique }, status: { not: "archived" } },
  });
  if (count !== unique.length) {
    throw new SchoolScopeError("One or more students do not belong to your school");
  }
}

export async function assertStaffInSchool(schoolId: string, staffIds: string[]) {
  const unique = [...new Set(staffIds.filter(Boolean))];
  if (!unique.length) return;

  const count = await prisma.staff.count({
    where: { schoolId, id: { in: unique }, isActive: true },
  });
  if (count !== unique.length) {
    throw new SchoolScopeError("One or more staff members do not belong to your school");
  }
}

export async function assertExamInSchool(schoolId: string, examId: string) {
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
  if (!exam) throw new SchoolScopeError("Exam not found in your school");
  return exam;
}

export async function assertClassInSchool(schoolId: string, classId: string) {
  const schoolClass = await prisma.schoolClass.findFirst({ where: { id: classId, schoolId } });
  if (!schoolClass) throw new SchoolScopeError("Class not found in your school");
  return schoolClass;
}

export async function assertExamSubjectsInSchool(
  schoolId: string,
  examId: string,
  subjectIds: string[],
) {
  await assertExamInSchool(schoolId, examId);
  const unique = [...new Set(subjectIds.filter(Boolean))];
  if (!unique.length) return;

  const count = await prisma.examSubject.count({
    where: { examId, id: { in: unique } },
  });
  if (count !== unique.length) {
    throw new SchoolScopeError("Invalid subject for this exam");
  }
}
