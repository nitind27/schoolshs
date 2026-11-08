import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  translateEnglishNameParts,
  translateEnglishToGujarati,
  translateTextToGujarati,
} from "@/lib/gujarati/google-translate";

export async function POST(request: NextRequest) {
  try {
    await requireSchoolAuth();
    const body = (await request.json()) as { text?: string; word?: string; mode?: string };
    const text = String(body.text ?? body.word ?? "").trim();
    if (!text) {
      return NextResponse.json({ gujarati: "" });
    }

    if (body.mode === "text") {
      const gujarati = await translateTextToGujarati(text);
      return NextResponse.json({ gujarati });
    }

    let gujarati = await translateEnglishToGujarati(text);
    if (!gujarati && text.includes(" ")) {
      gujarati = await translateEnglishNameParts(text);
    }

    return NextResponse.json({ gujarati });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
