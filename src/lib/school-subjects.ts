import { prisma } from "@/lib/db";
import {
  ARTS_MARKS_SHEET_SUBJECTS,
  COMMERCE_MARKS_SHEET_SUBJECTS,
  SECONDARY_MARKS_SHEET_SUBJECTS,
  type MarksSheetSubjectDef,
} from "@/lib/results/marks-sheet-config";
import { replaceClassSubjects, type ClassSubjectInput } from "@/lib/class-subjects";

export type SchoolSubjectInput = {
  id?: string;
  name: string;
  code: string;
  shortName?: string;
  type?: "numeric" | "grade";
  maxMarks?: number;
  sortOrder?: number;
  isActive?: boolean;
};

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "_");
}

function uniqueCatalog(): MarksSheetSubjectDef[] {
  const map = new Map<string, MarksSheetSubjectDef>();
  for (const s of [
    ...SECONDARY_MARKS_SHEET_SUBJECTS,
    ...ARTS_MARKS_SHEET_SUBJECTS,
    ...COMMERCE_MARKS_SHEET_SUBJECTS,
  ]) {
    if (!map.has(s.code)) map.set(s.code, s);
  }
  return Array.from(map.values());
}

export async function listSchoolSubjects(schoolId: string) {
  return prisma.schoolSubject.findMany({
    where: { schoolId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function seedSchoolSubjectsFromDefaults(schoolId: string) {
  const existing = await prisma.schoolSubject.findMany({ where: { schoolId } });
  const have = new Set(existing.map((e) => e.code));
  const catalog = uniqueCatalog();
  const missing = catalog.filter((s) => !have.has(s.code));

  if (missing.length) {
    const baseOrder = existing.length;
    await prisma.schoolSubject.createMany({
      data: missing.map((s, i) => ({
        schoolId,
        name: s.name,
        code: s.code,
        shortName: s.shortName,
        type: s.type,
        maxMarks: s.type === "grade" ? 0 : 100,
        sortOrder: baseOrder + i,
        isActive: true,
      })),
    });
  }

  return listSchoolSubjects(schoolId);
}

export async function upsertSchoolSubjects(schoolId: string, inputs: SchoolSubjectInput[]) {
  const cleaned = inputs.map((s, i) => ({
    id: s.id,
    name: String(s.name || "").trim(),
    code: normalizeCode(String(s.code || "")),
    shortName: String(s.shortName || "").trim(),
    type: (s.type === "grade" ? "grade" : "numeric") as "numeric" | "grade",
    maxMarks: s.type === "grade" ? 0 : Math.max(0, Number(s.maxMarks) || 100),
    sortOrder: s.sortOrder ?? i,
    isActive: s.isActive !== false,
  }));

  if (cleaned.some((s) => !s.name || !s.code)) {
    throw new Error("Each subject needs name and code");
  }
  const codes = cleaned.map((s) => s.code);
  if (cleaned.length && new Set(codes).size !== codes.length) {
    throw new Error("Duplicate subject codes");
  }

  const existing = await prisma.schoolSubject.findMany({ where: { schoolId } });
  const keepIds = new Set(cleaned.map((s) => s.id).filter(Boolean) as string[]);
  const toDelete = existing.filter((e) => !keepIds.has(e.id));

  await prisma.$transaction(async (tx) => {
    if (toDelete.length) {
      await tx.schoolSubject.deleteMany({
        where: { schoolId, id: { in: toDelete.map((d) => d.id) } },
      });
    }
    for (const s of cleaned) {
      if (s.id && existing.some((e) => e.id === s.id)) {
        await tx.schoolSubject.update({
          where: { id: s.id },
          data: {
            name: s.name,
            code: s.code,
            shortName: s.shortName || s.name.slice(0, 2),
            type: s.type,
            maxMarks: s.maxMarks,
            sortOrder: s.sortOrder,
            isActive: s.isActive,
          },
        });
      } else {
        await tx.schoolSubject.create({
          data: {
            schoolId,
            name: s.name,
            code: s.code,
            shortName: s.shortName || s.name.slice(0, 2),
            type: s.type,
            maxMarks: s.maxMarks,
            sortOrder: s.sortOrder,
            isActive: s.isActive,
          },
        });
      }
    }
  });

  return listSchoolSubjects(schoolId);
}

export async function listStandardSubjects(
  schoolId: string,
  standard: string,
  stream = "",
) {
  return prisma.standardSubject.findMany({
    where: { schoolId, standard, stream: stream || "" },
    orderBy: { sortOrder: "asc" },
    include: { subject: true },
  });
}

export async function setStandardSubjects(
  schoolId: string,
  standard: string,
  stream: string,
  subjectIds: string[],
) {
  const streamKey = stream || "";
  const uniqueIds = Array.from(new Set(subjectIds.filter(Boolean)));

  const masters = await prisma.schoolSubject.findMany({
    where: { schoolId, id: { in: uniqueIds }, isActive: true },
  });
  if (masters.length !== uniqueIds.length) {
    throw new Error("One or more subjects not found");
  }

  const byId = new Map(masters.map((m) => [m.id, m]));
  // Preserve order of subjectIds
  const ordered = uniqueIds.map((id) => byId.get(id)!).filter(Boolean);

  await prisma.$transaction(async (tx) => {
    await tx.standardSubject.deleteMany({
      where: { schoolId, standard, stream: streamKey },
    });
    if (ordered.length) {
      await tx.standardSubject.createMany({
        data: ordered.map((s, i) => ({
          schoolId,
          standard,
          stream: streamKey,
          subjectId: s.id,
          sortOrder: i,
        })),
      });
    }
  });

  return listStandardSubjects(schoolId, standard, streamKey);
}

/** Seed standard links from hardcoded GSEB defaults if empty */
export async function seedStandardDefaultsIfEmpty(
  schoolId: string,
  standard: string,
  stream = "",
) {
  const streamKey = stream || "";
  const count = await prisma.standardSubject.count({
    where: { schoolId, standard, stream: streamKey },
  });
  if (count > 0) return listStandardSubjects(schoolId, standard, streamKey);

  await seedSchoolSubjectsFromDefaults(schoolId);
  const masters = await listSchoolSubjects(schoolId);
  const byCode = new Map(masters.map((m) => [m.code, m]));

  let defs: MarksSheetSubjectDef[] = SECONDARY_MARKS_SHEET_SUBJECTS;
  if (["11", "12"].includes(standard)) {
    defs =
      streamKey === "Commerce" ? COMMERCE_MARKS_SHEET_SUBJECTS : ARTS_MARKS_SHEET_SUBJECTS;
  }

  const ids = defs.map((d) => byCode.get(d.code)?.id).filter(Boolean) as string[];
  if (!ids.length) return listStandardSubjects(schoolId, standard, streamKey);
  return setStandardSubjects(schoolId, standard, streamKey, ids);
}

export async function applyStandardToClasses(options: {
  schoolId: string;
  standard: string;
  stream?: string;
  academicYear?: string;
  classIds?: string[];
  syncExam?: boolean;
}) {
  const {
    schoolId,
    standard,
    stream = "",
    academicYear,
    classIds,
    syncExam = true,
  } = options;
  const streamKey = stream || "";

  let links = await listStandardSubjects(schoolId, standard, streamKey);
  if (!links.length) {
    links = await seedStandardDefaultsIfEmpty(schoolId, standard, streamKey);
  }
  if (!links.length) throw new Error("No subjects assigned for this standard");

  const inputs: ClassSubjectInput[] = links
    .filter((l) => l.subject.isActive)
    .map((l, i) => ({
      name: l.subject.name,
      code: l.subject.code,
      shortName: l.subject.shortName,
      type: l.subject.type === "grade" ? "grade" : "numeric",
      maxMarks: l.subject.maxMarks,
      sortOrder: i,
      isActive: true,
    }));

  const where: Record<string, unknown> = { schoolId, standard };
  if (streamKey) where.stream = streamKey;
  if (academicYear) where.academicYear = academicYear;
  if (classIds?.length) where.id = { in: classIds };

  const classes = await prisma.schoolClass.findMany({
    where,
    orderBy: [{ section: "asc" }, { stream: "asc" }],
  });

  if (!classes.length) throw new Error("No matching classes found");

  const results: { classId: string; className: string; count: number }[] = [];
  for (const cls of classes) {
    const subjects = await replaceClassSubjects(cls.id, schoolId, inputs, syncExam);
    results.push({ classId: cls.id, className: cls.name, count: subjects.length });
  }

  return { applied: results.length, results, subjectCount: inputs.length };
}

export async function standardAssignmentOverview(schoolId: string) {
  const links = await prisma.standardSubject.findMany({
    where: { schoolId },
    include: { subject: { select: { id: true, name: true, code: true } } },
    orderBy: [{ standard: "asc" }, { stream: "asc" }, { sortOrder: "asc" }],
  });

  const map = new Map<
    string,
    { standard: string; stream: string; count: number; subjects: { id: string; name: string; code: string }[] }
  >();

  for (const l of links) {
    const key = `${l.standard}::${l.stream || ""}`;
    if (!map.has(key)) {
      map.set(key, { standard: l.standard, stream: l.stream || "", count: 0, subjects: [] });
    }
    const row = map.get(key)!;
    row.count += 1;
    row.subjects.push({
      id: l.subject.id,
      name: l.subject.name,
      code: l.subject.code,
    });
  }

  return Array.from(map.values());
}
