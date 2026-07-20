import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  translateEnglishNameParts,
  translateEnglishToGujarati,
} from "@/lib/gujarati/google-translate";

export async function POST(request: NextRequest) {
  try {
    await requireSchoolAuth();
    const body = (await request.json()) as { text?: string; word?: string };
    const text = String(body.text ?? body.word ?? "").trim();
    if (!text) {
      return NextResponse.json({ gujarati: "" });
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
