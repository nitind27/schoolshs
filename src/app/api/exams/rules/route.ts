import { NextRequest } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";
import { normalizeGradeBands, parseExamRules, type ExamRules } from "@/lib/results/exam-rules";
import { loadSchoolExamRules, saveSchoolExamRules } from "@/lib/results/exam-stats";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk", "student"]);
    const rules = await loadSchoolExamRules(session.schoolId);
    const canEdit = session.role === "school_admin" || session.role === "clerk";
    return mobileJson({ rules, canEdit }, undefined, origin);
  } catch (error) {
    if (error instanceof AuthError) {
      return mobileJson({ error: error.message }, { status: error.status }, origin);
    }
    console.error("GET /api/exams/rules:", error);
    return mobileJson({ error: "Failed to load exam rules" }, { status: 500 }, origin);
  }
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = (await request.json()) as Partial<ExamRules> & { rules?: Partial<ExamRules> };
    const incoming = body.rules || body;
    const current = await loadSchoolExamRules(session.schoolId);
    const next = parseExamRules(
      JSON.stringify({
        passPercent: incoming.passPercent ?? incoming.passMarks ?? current.passPercent,
        passMarks: incoming.passMarks ?? incoming.passPercent ?? current.passMarks,
        grades: incoming.grades ?? current.grades,
      }),
    );
    next.grades = normalizeGradeBands(next.grades);
    const rules = await saveSchoolExamRules(session.schoolId, next);
    return mobileJson({ success: true, rules }, undefined, origin);
  } catch (error) {
    if (error instanceof AuthError) {
      return mobileJson({ error: error.message }, { status: error.status }, origin);
    }
    console.error("PUT /api/exams/rules:", error);
    return mobileJson({ error: "Failed to save exam rules" }, { status: 500 }, origin);
  }
}
