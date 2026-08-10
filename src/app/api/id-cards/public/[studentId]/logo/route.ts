import { NextResponse } from "next/server";
import { resolvePublicStudentAssetRel, serveUploadRelative } from "@/lib/id-card-public";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const { studentId } = await params;
    const rel = await resolvePublicStudentAssetRel(studentId, "logo");
    if (!rel) return NextResponse.json({ error: "No logo" }, { status: 404 });
    return serveUploadRelative(rel);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
