import { NextRequest, NextResponse } from "next/server";
import { getRequestPublicOrigin } from "@/lib/env-auth";
import { saveChildLetterheadShare, sharePageUrl } from "@/lib/letterhead/share";

/** Create a view-only link for a subset of an existing public letter. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parentToken = String(body?.parentToken || "").trim();
    const pages = Array.isArray(body?.pages) ? body.pages : [];
    const saved = await saveChildLetterheadShare(parentToken, pages);
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
    console.error("POST /api/letterhead/share", error);
    return NextResponse.json({ error: "Could not create share link" }, { status: 500 });
  }
}
