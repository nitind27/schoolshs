import { NextRequest, NextResponse } from "next/server";
import { parseSsgGujaratPaste } from "@/lib/ssgujarat/parse-ssg-paste";
import { mapSsgPasteToStudent, compactStudentPartial } from "@/lib/ssgujarat/map-to-student";
import { SSG_MSG } from "@/lib/ssgujarat/message-codes";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = String(body.text || "").trim();

    if (text.length < 50) {
      return NextResponse.json({ error: SSG_MSG.PASTE_TOO_SHORT }, { status: 400 });
    }

    const parsed = parseSsgGujaratPaste(text);
    const mapped = compactStudentPartial(mapSsgPasteToStudent(parsed));

    if (!mapped.firstName && !mapped.aadhaarNumber && !parsed.childUid) {
      return NextResponse.json({ error: SSG_MSG.PASTE_PARSE_FAILED }, { status: 400 });
    }

    return NextResponse.json({ parsed, mapped });
  } catch (error) {
    console.error("SSG paste parse error:", error);
    return NextResponse.json({ error: "Paste parse failed" }, { status: 500 });
  }
}
