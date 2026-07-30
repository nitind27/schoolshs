import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  applyStandardToClasses,
  listSchoolSubjects,
  listStandardSubjects,
  seedSchoolSubjectsFromDefaults,
  seedStandardDefaultsIfEmpty,
  setStandardSubjects,
  standardAssignmentOverview,
  upsertSchoolSubjects,
} from "@/lib/school-subjects";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "master";
    const standard = searchParams.get("standard") || "";
    const stream = searchParams.get("stream") || "";
    const academicYear = searchParams.get("academicYear") || "";

    if (view === "overview") {
      const overview = await standardAssignmentOverview(session.schoolId);
      const subjects = await listSchoolSubjects(session.schoolId);
      return NextResponse.json({ overview, subjects, total: subjects.length });
    }

    if (view === "standard") {
      if (!standard) {
        return NextResponse.json({ error: "standard required" }, { status: 400 });
      }
      let links = await listStandardSubjects(session.schoolId, standard, stream);
      if (!links.length) {
        links = await seedStandardDefaultsIfEmpty(session.schoolId, standard, stream);
      }
      const subjects = await listSchoolSubjects(session.schoolId);
      const classWhere: Record<string, unknown> = {
        schoolId: session.schoolId,
        standard,
      };
      if (stream) classWhere.stream = stream;
      if (academicYear) classWhere.academicYear = academicYear;
      const classes = await prisma.schoolClass.findMany({
        where: classWhere,
        orderBy: [{ section: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          standard: true,
          section: true,
          stream: true,
          academicYear: true,
          _count: { select: { classSubjects: true } },
        },
      });
      return NextResponse.json({
        subjects,
        assignedIds: links.map((l) => l.subjectId),
        assigned: links.map((l) => ({
          id: l.subjectId,
          name: l.subject.name,
          code: l.subject.code,
          shortName: l.subject.shortName,
          type: l.subject.type,
          maxMarks: l.subject.maxMarks,
          sortOrder: l.sortOrder,
        })),
        classes,
      });
    }

    // master
    let subjects = await listSchoolSubjects(session.schoolId);
    if (!subjects.length && searchParams.get("seed") === "1") {
      subjects = await seedSchoolSubjectsFromDefaults(session.schoolId);
    }
    return NextResponse.json({ subjects, total: subjects.length });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/subjects:", error);
    return NextResponse.json({ error: "Failed to load subjects" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const action = body.action || "save_master";

    if (action === "seed_defaults") {
      const subjects = await seedSchoolSubjectsFromDefaults(session.schoolId);
      return NextResponse.json({ subjects, seeded: true });
    }

    if (action === "save_master") {
      const subjects = await upsertSchoolSubjects(session.schoolId, body.subjects || []);
      return NextResponse.json({ subjects, ok: true });
    }

    if (action === "save_standard") {
      const standard = String(body.standard || "").trim();
      if (!standard) {
        return NextResponse.json({ error: "standard required" }, { status: 400 });
      }
      const stream = String(body.stream || "");
      const subjectIds = Array.isArray(body.subjectIds) ? body.subjectIds.map(String) : [];
      const links = await setStandardSubjects(session.schoolId, standard, stream, subjectIds);
      return NextResponse.json({
        ok: true,
        assignedIds: links.map((l) => l.subjectId),
        count: links.length,
      });
    }

    if (action === "apply_to_classes") {
      const standard = String(body.standard || "").trim();
      if (!standard) {
        return NextResponse.json({ error: "standard required" }, { status: 400 });
      }
      const result = await applyStandardToClasses({
        schoolId: session.schoolId,
        standard,
        stream: String(body.stream || ""),
        academicYear: body.academicYear || undefined,
        classIds: Array.isArray(body.classIds) ? body.classIds.map(String) : undefined,
        syncExam: body.syncExam !== false,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const msg = error instanceof Error ? error.message : "Failed";
    console.error("PUT /api/subjects:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
