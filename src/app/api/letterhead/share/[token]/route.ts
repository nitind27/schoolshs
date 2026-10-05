import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isLetterheadDocumentState } from "@/lib/letterhead/defaults";
import { isShareToken } from "@/lib/letterhead/share";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    if (!isShareToken(token)) {
      return NextResponse.json({ error: "Letter not found" }, { status: 404 });
    }
    const row = await prisma.letterheadShare.findUnique({ where: { token } });
    if (!row || !isLetterheadDocumentState(row.snapshot)) {
      return NextResponse.json({ error: "Letter not found" }, { status: 404 });
    }
    const data = { ...row.snapshot, stampLibrary: undefined };
    return NextResponse.json({
      title: row.title,
      pageCount: row.pageCount,
      data,
    });
  } catch (error) {
    console.error("GET /api/letterhead/share/[token]", error);
    return NextResponse.json({ error: "Could not open letter" }, { status: 500 });
  }
}
