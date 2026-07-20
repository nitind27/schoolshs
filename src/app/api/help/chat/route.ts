import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/auth";
import { isUserRole } from "@/lib/roles";
import { answerHelpQuery, getWelcomeMessage, type HelpLang } from "@/lib/help/engine";

function parseLang(v: unknown): HelpLang | undefined {
  if (v === "en" || v === "hi" || v === "gu") return v;
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!isUserRole(session.role)) {
      return NextResponse.json({ error: "Unsupported role" }, { status: 403 });
    }
    const preferred = parseLang(request.nextUrl.searchParams.get("lang"));
    const welcome = getWelcomeMessage(session.role, preferred || "en");
    return NextResponse.json({
      ...welcome,
      role: session.role,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!isUserRole(session.role)) {
      return NextResponse.json({ error: "Unsupported role" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const message = String(body.message || "").trim();
    const preferredLang = parseLang(body.lang);

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }
    if (message.length > 500) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    // Role always from session — never from client body
    const reply = answerHelpQuery(message, session.role, preferredLang);
    return NextResponse.json({
      ...reply,
      role: session.role,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[help chat]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
