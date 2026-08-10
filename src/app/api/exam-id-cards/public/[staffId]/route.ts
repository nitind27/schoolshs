import { NextResponse } from "next/server";
import { getPublicExamStaffCard } from "@/lib/exam-id-public";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    const { staffId } = await params;
    const data = await getPublicExamStaffCard(staffId);
    if (!data) {
      return NextResponse.json({ error: "Exam ID not found" }, { status: 404 });
    }
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch (error) {
    console.error("[public exam-id GET]", error);
    return NextResponse.json({ error: "Failed to load exam ID" }, { status: 500 });
  }
}
