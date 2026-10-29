import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { ensureClassExam } from "@/lib/class-subjects";
import {
  componentTerms,
  finalTerm,
  getTerm,
  mergeExamTermIntoMeta,
  metaFromTemplateTerms,
  parseExamTermMeta,
  serializeExamTermMeta,
  totalTermMaxFromMeta,
  type ExamTermDef,
  type ExamTermTemplateInput,
} from "@/lib/results/exam-terms";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/constants";

/**
 * MariaDB driver-adapter upsert can open an interactive transaction and fail
 * with P2028 on some hosted pools. A plain update/create flow avoids that
 * transaction while preserving the same behavior.
 */
async function saveSchoolExamTemplate(
  schoolId: string,
  examTemplate: string,
): Promise<void> {
  const updated = await prisma.schoolSettings.updateMany({
    where: { schoolId },
    data: { examTemplate },
  });
  if (updated.count > 0) return;

  try {
    await prisma.schoolSettings.create({
      data: { schoolId, examTemplate },
    });
  } catch (error) {
    // A concurrent first save may have created the settings row.
    if ((error as { code?: string }).code !== "P2002") throw error;
    await prisma.schoolSettings.updateMany({
      where: { schoolId },
      data: { examTemplate },
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk", "teacher"]);
    const academicYear =
      request.nextUrl.searchParams.get("academicYear") || DEFAULT_ACADEMIC_YEAR;

    const [classes, settings] = await Promise.all([
      prisma.schoolClass.findMany({
      where: { schoolId: session.schoolId, academicYear },
      orderBy: [{ standard: "asc" }, { section: "asc" }],
      select: {
        id: true,
        name: true,
        standard: true,
        section: true,
        stream: true,
        academicYear: true,
        _count: { select: { students: true } },
      },
      }),
      prisma.schoolSettings.findUnique({
        where: { schoolId: session.schoolId },
        select: { examTemplate: true },
      }),
    ]);

    const exams = await prisma.exam.findMany({
      where: {
        schoolId: session.schoolId,
        academicYear,
        examType: "Annual",
      },
      select: {
        id: true,
        standard: true,
        section: true,
        termMeta: true,
        isPublished: true,
      },
    });

    const examByClass = new Map(
      exams.map((e) => [`${e.standard}::${e.section}`, e]),
    );

    const rows = classes.map((c) => {
      const exam = examByClass.get(`${c.standard}::${c.section}`);
      const applied = Boolean(exam?.id);
      const meta = applied ? parseExamTermMeta(exam?.termMeta) : null;
      const comps = meta ? componentTerms(meta) : [];
      const generalComps = comps.filter((t) => t.subjectScope !== "computer");
      const fin = meta ? finalTerm(meta) : null;
      return {
        ...c,
        examId: exam?.id ?? null,
        isPublished: exam?.isPublished ?? false,
        midExamCount: generalComps.length,
        totalOutOf: meta ? totalTermMaxFromMeta(meta) : 0,
        termsList: (meta?.terms ?? []).map((t) => ({
          key: t.key,
          labelEn: t.labelEn,
          labelGu: t.labelGu,
          totalMax: t.totalMax,
          maxMarks: t.maxMarks,
          internalMax: t.internalMax,
          role: t.role,
          subjectScope: t.subjectScope === "computer" ? "computer" : "all",
        })),
        terms: {
          mid1: generalComps[0]?.maxMarks ?? 50,
          mid2: generalComps[1]?.maxMarks ?? 50,
          mid3: generalComps[2]?.maxMarks ?? 50,
          final: fin?.maxMarks ?? 80,
          internal: fin?.internalMax ?? 20,
        },
      };
    });

    const savedTemplate = settings?.examTemplate
      ? parseExamTermMeta(settings.examTemplate).terms.map((term) => ({
          key: term.key,
          labelEn: term.labelEn,
          labelGu: term.labelGu,
          totalMax: term.totalMax,
          maxMarks: term.maxMarks,
          internalMax: term.internalMax ?? 0,
          role: term.role,
          subjectScope: term.subjectScope === "computer" ? "computer" : "all",
        }))
      : null;

    return NextResponse.json({
      classes: rows,
      academicYear,
      savedTemplate,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("GET /api/exams:", e);
    return NextResponse.json({ error: "Failed to load exams" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const { action } = body;

    if (action !== "apply" && action !== "save_template" && action !== "apply_exam") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (action === "apply_exam") {
      return applySingleExam(session.schoolId, body);
    }

    if (!Array.isArray(body.templateTerms) || !body.templateTerms.length) {
      return NextResponse.json({ error: "Add at least one exam in the template" }, { status: 400 });
    }

    const invalidSplit = body.templateTerms.find(
      (term: {
        totalMax?: unknown;
        maxMarks?: unknown;
        internalMax?: unknown;
      }) =>
        Math.max(0, Number(term.totalMax) || 0) !==
        Math.max(0, Number(term.maxMarks) || 0) +
          Math.max(0, Number(term.internalMax) || 0),
    );
    if (invalidSplit) {
      return NextResponse.json(
        { error: "Paper marks + Teacher/Internal marks must equal Total marks" },
        { status: 400 },
      );
    }

    // Need at least one non-computer exam (component or final role both accepted)
    const hasGeneralExam = body.templateTerms.some(
      (term: { role?: string; key?: string; subjectScope?: string }) =>
        term.subjectScope !== "computer",
    );
    if (!hasGeneralExam) {
      return NextResponse.json(
        { error: "Keep at least one exam that is not Computer-only" },
        { status: 400 },
      );
    }

    const base = metaFromTemplateTerms(body.templateTerms);
    const serializedTemplate = serializeExamTermMeta(base);

    if (action === "save_template") {
      await saveSchoolExamTemplate(session.schoolId, serializedTemplate);
      return NextResponse.json({
        success: true,
        totalOutOf: totalTermMaxFromMeta(base),
        termMeta: base,
      });
    }

    const classIds: string[] = Array.isArray(body.classIds) ? body.classIds : [];
    if (!classIds.length) {
      return NextResponse.json({ error: "Select at least one class" }, { status: 400 });
    }

    // Applying also keeps this as the latest school-wide saved template.
    await saveSchoolExamTemplate(session.schoolId, serializedTemplate);

    const classes = await prisma.schoolClass.findMany({
      where: { schoolId: session.schoolId, id: { in: classIds } },
    });

    let applied = 0;
    for (const schoolClass of classes) {
      const { exam } = await ensureClassExam(session.schoolId, schoolClass);
      const prev = parseExamTermMeta(exam.termMeta);

      const nextTerms: ExamTermDef[] = base.terms.map((term) => {
        const older = getTerm(prev, term.key);
        return {
          ...term,
          published: older?.published ?? false,
          publishedAt: older?.publishedAt ?? null,
          locked: older?.locked ?? false,
          examDate: term.examDate ?? older?.examDate ?? null,
        };
      });

      const next = {
        version: 2 as const,
        terms: nextTerms,
        midExamCount: nextTerms.filter((t) => t.role === "component").length,
      };

      await prisma.exam.update({
        where: { id: exam.id },
        data: { termMeta: serializeExamTermMeta(next) },
      });
      applied++;
    }

    return NextResponse.json({
      success: true,
      applied,
      totalOutOf: totalTermMaxFromMeta(base),
      termMeta: base,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("PUT /api/exams:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to apply exams" },
      { status: 500 },
    );
  }
}

function hasInvalidMarksSplit(term: {
  totalMax?: unknown;
  maxMarks?: unknown;
  internalMax?: unknown;
}) {
  return (
    Math.max(0, Number(term.totalMax) || 0) !==
    Math.max(0, Number(term.maxMarks) || 0) +
      Math.max(0, Number(term.internalMax) || 0)
  );
}

async function applySingleExam(
  schoolId: string,
  body: {
    classIds?: unknown;
    examTerm?: ExamTermTemplateInput;
  },
) {
  const classIds: string[] = Array.isArray(body.classIds) ? body.classIds : [];
  if (!classIds.length) {
    return NextResponse.json({ error: "Select at least one class" }, { status: 400 });
  }

  const examTerm = body.examTerm;
  if (!examTerm || !String(examTerm.labelEn || "").trim()) {
    return NextResponse.json({ error: "Select an exam type" }, { status: 400 });
  }

  const normalized: ExamTermTemplateInput = {
    key: examTerm.key,
    labelEn: String(examTerm.labelEn).trim(),
    labelGu: String(examTerm.labelGu || examTerm.labelEn).trim(),
    maxMarks: Math.max(0, Number(examTerm.maxMarks) || 0),
    internalMax: Math.max(0, Number(examTerm.internalMax) || 0),
    totalMax: Math.max(0, Number(examTerm.totalMax) || 0),
    role: examTerm.role === "final" ? "final" : "component",
    subjectScope: examTerm.subjectScope === "computer" ? "computer" : "all",
  };

  if (hasInvalidMarksSplit(normalized)) {
    return NextResponse.json(
      { error: "Paper marks + Teacher/Internal marks must equal Total marks" },
      { status: 400 },
    );
  }

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId, id: { in: classIds } },
  });
  if (!classes.length) {
    return NextResponse.json({ error: "Select at least one class" }, { status: 400 });
  }

  const existingExams = await prisma.exam.findMany({
    where: {
      schoolId,
      examType: "Annual",
      OR: classes.map((schoolClass) => ({
        standard: schoolClass.standard,
        section: schoolClass.section,
        academicYear: schoolClass.academicYear,
      })),
    },
    select: { id: true, standard: true, section: true, academicYear: true, termMeta: true },
  });
  const examByClass = new Map(
    existingExams.map((exam) => [`${exam.standard}::${exam.section}::${exam.academicYear}`, exam]),
  );

  if (normalized.subjectScope === "computer") {
    const blocked = classes.filter((schoolClass) => {
      const existing = examByClass.get(
        `${schoolClass.standard}::${schoolClass.section}::${schoolClass.academicYear}`,
      );
      if (!existing) return true;
      const prev = parseExamTermMeta(existing.termMeta);
      const next = mergeExamTermIntoMeta(prev, normalized, { startFresh: false });
      return !next.terms.some((term) => term.subjectScope !== "computer");
    });
    if (blocked.length) {
      return NextResponse.json(
        { error: "Add a subject exam before a Computer-only exam" },
        { status: 400 },
      );
    }
  }

  const settings = await prisma.schoolSettings.findUnique({
    where: { schoolId },
    select: { examTemplate: true },
  });
  const catalog = settings?.examTemplate
    ? parseExamTermMeta(settings.examTemplate)
    : { version: 2 as const, terms: [], midExamCount: 0 };
  const nextCatalog = mergeExamTermIntoMeta(catalog, normalized);
  await saveSchoolExamTemplate(schoolId, serializeExamTermMeta(nextCatalog));

  let applied = 0;
  for (const schoolClass of classes) {
    const existing = examByClass.get(
      `${schoolClass.standard}::${schoolClass.section}::${schoolClass.academicYear}`,
    );
    const { exam } = await ensureClassExam(schoolId, schoolClass);
    const prev = parseExamTermMeta(exam.termMeta);
    const startFresh = !existing;
    const next = mergeExamTermIntoMeta(prev, normalized, { startFresh });

    await prisma.exam.update({
      where: { id: exam.id },
      data: { termMeta: serializeExamTermMeta(next) },
    });
    applied++;
  }

  return NextResponse.json({
    success: true,
    applied,
    totalOutOf: totalTermMaxFromMeta(nextCatalog),
    termMeta: nextCatalog,
  });
}
