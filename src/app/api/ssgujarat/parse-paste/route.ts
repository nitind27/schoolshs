import { NextRequest, NextResponse } from "next/server";
import { parseSsgGujaratPaste } from "@/lib/ssgujarat/parse-ssg-paste";
import { mapSsgPasteToStudent, compactStudentPartial } from "@/lib/ssgujarat/map-to-student";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = String(body.text || "").trim();

    if (text.length < 50) {
      return NextResponse.json({ error: "SSGujarat school data paste karein (minimum 50 characters)" }, { status: 400 });
    }

    const parsed = parseSsgGujaratPaste(text);
    const mapped = compactStudentPartial(mapSsgPasteToStudent(parsed));

    if (!mapped.firstName && !mapped.aadhaarNumber && !parsed.childUid) {
      return NextResponse.json(
        { error: "Data parse nahi hua — SSGujarat se copy karke poora paste karein" },
        { status: 400 }
      );
    }

    return NextResponse.json({ parsed, mapped });
  } catch (error) {
    console.error("SSG paste parse error:", error);
    return NextResponse.json({ error: "Paste parse failed" }, { status: 500 });
  }
}
