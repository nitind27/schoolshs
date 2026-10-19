import { prisma } from "@/lib/db";
import {
  getMarksSheetConfig,
  SONGADH_UPPER_PRIMARY_SUBJECTS,
  type MarksSheetConfig,
  type MarksSheetSubjectDef,
} from "@/lib/results/marks-sheet-config";
import {
  defaultExamTermMeta,
  serializeExamTermMeta,
  parseExamTermMeta,
  applyTermMetaToSheetConfig,
  upperPrimaryResultTermMeta,
  isReplaceableUpperPrimaryMeta,
} from "@/lib/results/exam-terms";
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

const SONGADH_UPPER_PRIMARY_CODE = "24261004404";

function matchesUpperPrimarySubject(
  subject: ClassSubjectRecord,
  def: MarksSheetSubjectDef,
) {
  if (subject.code.toUpperCase() === def.code.toUpperCase()) return true;
  if (subject.name === def.name) return true;
  if (def.code === "COMP" && /કોમ્પ્યુટર|કોમ્પ્યુટર|computer/i.test(subject.name)) return true;
  if (def.code === "PE" && /શારીરિક|શા\.?\s*શિક્ષણ|physical/i.test(subject.name)) return true;
  if (def.code === "GK" && /સામાન્ય|general knowledge|\bgk\b/i.test(subject.name)) return true;
  return false;
}

/** Add કોમ્પ્યુટર, શારીરિક શિક્ષણ, સામાન્ય જ્ઞાન on existing classes for school 24261004404. */
export async function ensureSongadhUpperPrimarySubjects(
  schoolId: string,
  classId: string,
): Promise<boolean> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { code: true, udiseCode: true },
  });
  const codes = [school?.code, school?.udiseCode].map((c) => (c || "").trim());
  if (!codes.includes(SONGADH_UPPER_PRIMARY_CODE)) return false;

  const existing = await listClassSubjects(classId);
  let order = existing.reduce((max, s) => Math.max(max, s.sortOrder), -1);
  const taken = new Set<string>();
  let changed = false;

  for (const def of SONGADH_UPPER_PRIMARY_SUBJECTS) {
    const found =
      existing.find(
        (s) => !taken.has(s.id) && s.code.toUpperCase() === def.code.toUpperCase(),
      ) ||
      existing.find((s) => !taken.has(s.id) && matchesUpperPrimarySubject(s, def));
    if (!found) {
      order += 1;
      await prisma.classSubject.create({
        data: {
          classId,
          name: def.name,
          code: def.code,
          shortName: def.shortName,
          type: def.type,
          maxMarks: 100,
          sortOrder: order,
          isActive: true,
        },
      });
      changed = true;
      continue;
    }
    taken.add(found.id);
    if (
      found.name !== def.name ||
      found.code !== def.code ||
      found.shortName !== def.shortName ||
      found.type !== def.type ||
      found.maxMarks !== 100 ||
      !found.isActive
    ) {
      await prisma.classSubject.update({
        where: { id: found.id },
        data: {
          name: def.name,
          code: def.code,
          shortName: def.shortName,
          type: def.type,
          maxMarks: 100,
          isActive: true,
        },
      });
      changed = true;
    }
  }

  return changed;
}

export async function getClassMarksSheetConfig(
  classId: string,
  standard?: string,
  stream?: string | null,
  schoolId?: string,
): Promise<MarksSheetConfig> {
  let subjects = await listClassSubjects(classId);
  const active = subjects.filter((s) => s.isActive);

  if (active.length === 0 && standard) {
    subjects = await seedClassSubjects(classId, standard, stream);
  }

  if (schoolId) {
    const changed = await ensureSongadhUpperPrimarySubjects(schoolId, classId);
    if (changed) subjects = await listClassSubjects(classId);
  }

  if (subjects.filter((s) => s.isActive).length === 0) {
    return getMarksSheetConfig(standard || "10", stream);
  }

  return classSubjectsToMarksSheetConfig(subjects);
}

function foldSubjectName(value: string) {
  return value.toLowerCase().replace(/[.\s_/·\-–—&]+/g, "");
}

const EXAM_SUBJECT_ALIASES: Record<string, string[]> = {
  COMP: ["કોમ્પ્યુટર", "કોમ્પ્યુટર", "computer"],
  PE: [
    "શારીરિક શિક્ષણ",
    "શા. શિક્ષણ",
    "શા. & શિ.",
    "સ્વા.અને શા.શિક્ષણ",
    "health & physical ed.",
    "physical education",
  ],
  GK: ["સામાન્ય જ્ઞાન", "general knowledge", "gk"],
};

function subjectNamesMatch(def: MarksSheetSubjectDef, name: string, code: string) {
  const aliases = EXAM_SUBJECT_ALIASES[def.code];
  if (!aliases) return false;
  const folded = new Set(aliases.map(foldSubjectName));
  return folded.has(foldSubjectName(name)) || folded.has(foldSubjectName(code));
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
  const used = new Set<string>();

  for (let i = 0; i < configSubjects.length; i++) {
    const def = configSubjects[i]!;
    const aliasHit = existing.find(
      (s) => !used.has(s.id) && subjectNamesMatch(def, s.name, s.code || ""),
    );
    const nextMax = def.type === "grade" ? 0 : 100;
    const found =
      [byCode.get(def.code), byName.get(def.name), aliasHit].find(
        (s): s is NonNullable<typeof s> => {
          if (!s) return false;
          return !used.has(s.id);
        },
      ) ?? null;
    if (found) used.add(found.id);
    if (!found) {
      await prisma.examSubject.create({
        data: {
          examId,
          name: def.name,
          code: def.code,
          maxMarks: nextMax,
          sortOrder: i,
        },
      });
    } else if (
      found.sortOrder !== i ||
      found.code !== def.code ||
      found.name !== def.name ||
      found.maxMarks !== nextMax
    ) {
      await prisma.examSubject.update({
        where: { id: found.id },
        data: {
          sortOrder: i,
          code: def.code,
          name: def.name,
          maxMarks: nextMax,
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
    schoolId,
  );

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { code: true, udiseCode: true },
  });
  const upperPrimaryResult =
    school?.code === "24261004404" || school?.udiseCode === "24261004404";
  const starterMeta = upperPrimaryResult
    ? upperPrimaryResultTermMeta()
    : defaultExamTermMeta(2);

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
        termMeta: serializeExamTermMeta(starterMeta),
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

  if (upperPrimaryResult && isReplaceableUpperPrimaryMeta(parseExamTermMeta(exam.termMeta))) {
    const entered = await prisma.examResult.count({ where: { examId: exam.id } });
    if (entered === 0) {
      await prisma.exam.update({
        where: { id: exam.id },
        data: { termMeta: serializeExamTermMeta(upperPrimaryResultTermMeta()) },
      });
      exam = await prisma.exam.findFirst({
        where: { id: exam.id },
        include: { subjects: { orderBy: { sortOrder: "asc" } } },
      });
    }
  }

  if (!exam) throw new Error("Failed to ensure class exam");

  const meta = parseExamTermMeta(exam.termMeta);
  const sheetWithTerms = applyTermMetaToSheetConfig(sheetConfig, meta);

  return { exam, sheetConfig: sheetWithTerms };
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
