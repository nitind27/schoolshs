import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { getRequestPublicOrigin } from "@/lib/env-auth";
import { isLetterheadDocumentState } from "@/lib/letterhead/defaults";
import { saveLetterheadShare, sharePageUrl } from "@/lib/letterhead/share";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const body = await request.json();
    const data = body?.data;
    const pages = Array.isArray(body?.pages) ? body.pages : [];
    if (!isLetterheadDocumentState(data)) {
      return NextResponse.json({ error: "Invalid letterhead" }, { status: 400 });
    }

    const saved = await saveLetterheadShare({
      schoolId: session.schoolId,
      createdById: session.userId,
      data,
      pages,
    });
    if (!saved) {
      return NextResponse.json({ error: "Select at least one page" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      token: saved.token,
      title: saved.title,
      pageCount: saved.pageCount,
      url: sharePageUrl(getRequestPublicOrigin(request), saved.token),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "too_large") {
      return NextResponse.json({ error: "Letterhead is too large to share" }, { status: 413 });
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/school/letterhead/share", error);
    return NextResponse.json({ error: "Could not create share link" }, { status: 500 });
  }
}
