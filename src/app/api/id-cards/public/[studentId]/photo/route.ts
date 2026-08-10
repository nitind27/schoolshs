import { NextResponse } from "next/server";
import { resolvePublicStudentPhotoRel, serveUploadRelative } from "@/lib/id-card-public";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const { studentId } = await params;
    const rel = await resolvePublicStudentPhotoRel(studentId);
    if (!rel) return NextResponse.json({ error: "No photo" }, { status: 404 });
    return serveUploadRelative(rel);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
