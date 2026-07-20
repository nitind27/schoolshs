import { prisma } from "@/lib/db";
import {
  getMarksSheetConfig,
  type MarksSheetConfig,
  type MarksSheetSubjectDef,
} from "@/lib/results/marks-sheet-config";
import { defaultExamTermMeta, serializeExamTermMeta } from "@/lib/results/exam-terms";
import { resultSessionName } from "@/lib/results/config";

export type ClassSubjectRecord = {
  id: string;
  classId: string;
  name: string;
  code: string;
  shortName: string;
  type: string;
  maxMarks: number;
  sortOrder: number;
  isActive: boolean;
};

export type ClassSubjectInput = {
  id?: string;
  name: string;
  code: string;
  shortName?: string;
  type?: "numeric" | "grade";
  maxMarks?: number;
  sortOrder?: number;
  isActive?: boolean;
};

type SchoolClassRef = {
  id: string;
  standard: string;
  section: string;
  stream: string;
  academicYear: string;
};

export function defaultSubjectsForClass(
  standard: string,
  stream?: string | null,
): MarksSheetSubjectDef[] {
  return getMarksSheetConfig(standard, stream).subjects;
}

export function classSubjectsToMarksSheetConfig(
  subjects: ClassSubjectRecord[],
): MarksSheetConfig {
  const base = getMarksSheetConfig("10");
  const active = subjects
    .filter((s) => s.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    ...base,
    subjects: active.map((s) => ({
      name: s.name,
      shortName: s.shortName || s.name.slice(0, 2),
      type: s.type === "grade" ? "grade" : "numeric",
      code: s.code,
    })),
  };
}

export async function listClassSubjects(classId: string): Promise<ClassSubjectRecord[]> {
  return prisma.classSubject.findMany({
    where: { classId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function seedClassSubjects(
  classId: string,
  standard: string,
  stream?: string | null,
): Promise<ClassSubjectRecord[]> {
  const existing = await prisma.classSubject.count({ where: { classId } });
  if (existing > 0) return listClassSubjects(classId);

  const defaults = defaultSubjectsForClass(standard, stream);
  await prisma.classSubject.createMany({
    data: defaults.map((s, i) => ({
      classId,
      name: s.name,
      code: s.code,
      shortName: s.shortName,
      type: s.type,
      maxMarks: s.type === "grade" ? 0 : 100,
      sortOrder: i,
      isActive: true,
    })),
  });

  return listClassSubjects(classId);
}

export async function getClassMarksSheetConfig(
  classId: string,
  standard?: string,
  stream?: string | null,
): Promise<MarksSheetConfig> {
  let subjects = await listClassSubjects(classId);
  const active = subjects.filter((s) => s.isActive);

  if (active.length === 0 && standard) {
    subjects = await seedClassSubjects(classId, standard, stream);
  }

  if (subjects.filter((s) => s.isActive).length === 0) {
    return getMarksSheetConfig(standard || "10", stream);
  }

  return classSubjectsToMarksSheetConfig(subjects);
}

export async function syncExamSubjects(
  examId: string,
  configSubjects: MarksSheetSubjectDef[],
) {
  const existing = await prisma.examSubject.findMany({
    where: { examId },
    orderBy: { sortOrder: "asc" },
  });

  const byCode = new Map(existing.map((s) => [s.code || s.name, s]));
  const byName = new Map(existing.map((s) => [s.name, s]));

  for (let i = 0; i < configSubjects.length; i++) {
    const def = configSubjects[i]!;
    const found = byCode.get(def.code) || byName.get(def.name);
    if (!found) {
      await prisma.examSubject.create({
        data: {
          examId,
          name: def.name,
          code: def.code,
          maxMarks: def.type === "grade" ? 0 : 100,
          sortOrder: i,
        },
      });
    } else if (found.sortOrder !== i || found.code !== def.code || found.name !== def.name) {
      await prisma.examSubject.update({
        where: { id: found.id },
        data: {
          sortOrder: i,
          code: def.code,
          name: def.name,
          maxMarks: def.type === "grade" ? 0 : 100,
        },
      });
    }
  }

  return prisma.examSubject.findMany({
    where: { examId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function ensureClassExam(
  schoolId: string,
  schoolClass: SchoolClassRef,
  options?: { reopeningDate?: string | null },
) {
  const sheetConfig = await getClassMarksSheetConfig(
    schoolClass.id,
    schoolClass.standard,
    schoolClass.stream,
  );

  let exam = await prisma.exam.findFirst({
    where: {
      schoolId,
      standard: schoolClass.standard,
      section: schoolClass.section,
      academicYear: schoolClass.academicYear,
      examType: "Annual",
    },
    include: { subjects: { orderBy: { sortOrder: "asc" } } },
  });

  if (!exam) {
    exam = await prisma.exam.create({
      data: {
        schoolId,
        name: resultSessionName(schoolClass.standard, schoolClass.academicYear),
        examType: "Annual",
        academicYear: schoolClass.academicYear,
        standard: schoolClass.standard,
        section: schoolClass.section,
        term: "Annual",
        maxMarks: 1000,
        passingMarks: 33,
        reopeningDate: options?.reopeningDate || null,
        termMeta: serializeExamTermMeta(defaultExamTermMeta(2)),
        subjects: {
          create: sheetConfig.subjects.map((s, i) => ({
            name: s.name,
            code: s.code,
            maxMarks: s.type === "grade" ? 0 : 100,
            sortOrder: i,
          })),
        },
      },
      include: { subjects: { orderBy: { sortOrder: "asc" } } },
    });
  } else {
    await syncExamSubjects(exam.id, sheetConfig.subjects);
    exam = await prisma.exam.findFirst({
      where: { id: exam.id },
      include: { subjects: { orderBy: { sortOrder: "asc" } } },
    });
  }

  if (!exam) throw new Error("Failed to ensure class exam");

  return { exam, sheetConfig };
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "_");
}

export async function replaceClassSubjects(
  classId: string,
  schoolId: string,
  inputs: ClassSubjectInput[],
  syncExam = true,
): Promise<ClassSubjectRecord[]> {
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: classId, schoolId },
  });
  if (!schoolClass) throw new Error("Class not found");

  const cleaned = inputs.map((s, i) => ({
    name: String(s.name || "").trim(),
    code: normalizeCode(String(s.code || "")),
    shortName: String(s.shortName || "").trim(),
    type: s.type === "grade" ? "grade" : "numeric",
    maxMarks: s.type === "grade" ? 0 : Math.max(0, Number(s.maxMarks) || 100),
    sortOrder: s.sortOrder ?? i,
    isActive: s.isActive !== false,
  }));

  if (!cleaned.length) throw new Error("At least one subject required");
  if (cleaned.some((s) => !s.name || !s.code)) {
    throw new Error("Each subject needs name and code");
  }

  const codes = cleaned.map((s) => s.code);
  if (new Set(codes).size !== codes.length) {
    throw new Error("Duplicate subject codes");
  }

  await prisma.$transaction(async (tx) => {
    await tx.classSubject.deleteMany({ where: { classId } });
    await tx.classSubject.createMany({
      data: cleaned.map((s) => ({
        classId,
        name: s.name,
        code: s.code,
        shortName: s.shortName || s.name.slice(0, 2),
        type: s.type,
        maxMarks: s.maxMarks,
        sortOrder: s.sortOrder,
        isActive: s.isActive,
      })),
    });
  });

  if (syncExam) {
    await ensureClassExam(schoolId, schoolClass);
  }

  return listClassSubjects(classId);
}

export async function resetClassSubjectsToDefaults(
  classId: string,
  schoolId: string,
): Promise<ClassSubjectRecord[]> {
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: classId, schoolId },
  });
  if (!schoolClass) throw new Error("Class not found");

  await prisma.classSubject.deleteMany({ where: { classId } });
  const subjects = await seedClassSubjects(
    classId,
    schoolClass.standard,
    schoolClass.stream,
  );
  await ensureClassExam(schoolId, schoolClass);
  return subjects;
}
