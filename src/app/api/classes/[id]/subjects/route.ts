import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  defaultSubjectsForClass,
  ensureClassExam,
  listClassSubjects,
  replaceClassSubjects,
  resetClassSubjectsToDefaults,
  seedClassSubjects,
} from "@/lib/class-subjects";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

async function loadClass(classId: string, schoolId: string) {
  return prisma.schoolClass.findFirst({
    where: { id: classId, schoolId },
    select: {
      id: true,
      name: true,
      standard: true,
      section: true,
      stream: true,
      academicYear: true,
    },
  });
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const { id } = await params;
    const schoolClass = await loadClass(id, session.schoolId);
    if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    let subjects = await listClassSubjects(id);
    if (!subjects.length) {
      subjects = await seedClassSubjects(id, schoolClass.standard, schoolClass.stream);
    }

    const defaults = defaultSubjectsForClass(schoolClass.standard, schoolClass.stream);

    return NextResponse.json({
      class: schoolClass,
      subjects,
      defaults,
      subjectCount: subjects.filter((s) => s.isActive).length,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET class subjects:", error);
    return NextResponse.json({ error: "Failed to load subjects" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const { id } = await params;
    const schoolClass = await loadClass(id, session.schoolId);
    if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const body = await request.json();

    if (body.action === "reset_defaults") {
      const subjects = await resetClassSubjectsToDefaults(id, session.schoolId);
      return NextResponse.json({ success: true, subjects });
    }

    if (!Array.isArray(body.subjects)) {
      return NextResponse.json({ error: "subjects array required" }, { status: 400 });
    }

    const subjects = await replaceClassSubjects(
      id,
      session.schoolId,
      body.subjects,
      body.syncExam !== false,
    );

    return NextResponse.json({ success: true, subjects });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to save subjects";
    console.error("PATCH class subjects:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const { id } = await params;
    const schoolClass = await loadClass(id, session.schoolId);
    if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const body = await request.json();
    if (body.action === "sync_exam") {
      const { exam, sheetConfig } = await ensureClassExam(session.schoolId, schoolClass);
      return NextResponse.json({
        success: true,
        examId: exam.id,
        subjectCount: sheetConfig.subjects.length,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST class subjects:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
