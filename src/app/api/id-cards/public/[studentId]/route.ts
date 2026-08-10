import { NextResponse } from "next/server";
import { getPublicStudentIdCard } from "@/lib/id-card-public";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const { studentId } = await params;
    const data = await getPublicStudentIdCard(studentId);
    if (!data) {
      return NextResponse.json({ error: "ID card not found" }, { status: 404 });
    }
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch (error) {
    console.error("[public id-card GET]", error);
    return NextResponse.json({ error: "Failed to load ID card" }, { status: 500 });
  }
}
