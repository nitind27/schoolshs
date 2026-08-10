import { NextResponse } from "next/server";
import { resolvePublicExamAssetRel, serveUploadRelative } from "@/lib/exam-id-public";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    const { staffId } = await params;
    const rel = await resolvePublicExamAssetRel(staffId, "signature");
    if (!rel) return NextResponse.json({ error: "No signature" }, { status: 404 });
    return serveUploadRelative(rel);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
