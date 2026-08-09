import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/auth";
import { isUserRole } from "@/lib/roles";
import {
  getWelcomeMessage,
  type HelpLang,
} from "@/lib/help/engine";
import { answerHelpConversational } from "@/lib/help/conversation";
import {
  appendHelpMessage,
  getOrCreateOpenConversation,
  loadConversationMessages,
  replyMeta,
} from "@/lib/help/service";
import { prisma } from "@/lib/db";

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
    const preferred = parseLang(request.nextUrl.searchParams.get("lang")) || "gu";
    const conversationId = request.nextUrl.searchParams.get("conversationId");

    if (conversationId) {
      const conv = await prisma.helpConversation.findFirst({
        where: { id: conversationId, userId: session.userId },
      });
      if (!conv) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      const messages = await loadConversationMessages(conv.id);
      return NextResponse.json({
        conversationId: conv.id,
        status: conv.status,
        lang: conv.lang,
        role: session.role,
        messages,
        rating: conv.rating,
      });
    }

    const open = await prisma.helpConversation.findFirst({
      where: {
        userId: session.userId,
        status: "bot",
      },
      orderBy: { updatedAt: "desc" },
    });

    if (open) {
      const messages = await loadConversationMessages(open.id);
      if (messages.length) {
        return NextResponse.json({
          conversationId: open.id,
          status: open.status,
          lang: open.lang,
          role: session.role,
          messages,
          suggestions: getWelcomeMessage(session.role, preferred).suggestions,
          rating: open.rating,
          resumed: true,
        });
      }
    }

    const welcome = getWelcomeMessage(session.role, preferred);
    const conv = await getOrCreateOpenConversation({
      userId: session.userId,
      schoolId: session.schoolId || null,
      role: session.role,
      lang: preferred,
    });
    await appendHelpMessage({
      conversationId: conv.id,
      senderRole: "bot",
      content: welcome.text,
      meta: replyMeta(welcome),
    });

    return NextResponse.json({
      conversationId: conv.id,
      status: conv.status,
      ...welcome,
      role: session.role,
      messages: [
        {
          id: "welcome",
          senderRole: "bot",
          content: welcome.text,
          createdAt: new Date().toISOString(),
          meta: replyMeta(welcome),
        },
      ],
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
    const action = String(body.action || "ask");
    const preferredLang = parseLang(body.lang) || "gu";
    let conversationId = String(body.conversationId || "").trim();

    const ensureConv = async () => {
      if (conversationId) {
        const existing = await prisma.helpConversation.findFirst({
          where: { id: conversationId, userId: session.userId },
        });
        if (existing) return existing;
      }
      return getOrCreateOpenConversation({
        userId: session.userId,
        schoolId: session.schoolId || null,
        role: session.role,
        lang: preferredLang,
      });
    };

    if (action === "escalate") {
      // Manual staff chat disabled — keep auto system help only
      const conv = await ensureConv();
      const reply = answerHelpConversational(
        String(body.message || body.subject || "system help"),
        session.role,
        preferredLang,
        {},
      );
      return NextResponse.json({
        conversationId: conv.id,
        status: "bot",
        role: session.role,
        lang: preferredLang,
        text:
          preferredLang === "gu"
            ? "આ સ્ટાફ ચેટ નથી. સિસ્ટમ વિશે પૂછો — હું ઓટો જવાબ આપીશ."
            : preferredLang === "hi"
              ? "यह स्टाफ चैट नहीं है। सिस्टम के बारे में पूछें — मैं ऑटो जवाब दूँगा।"
              : "This is not a staff chat. Ask about the system — I’ll auto-reply.",
        suggestions: reply.suggestions || getWelcomeMessage(session.role, preferredLang).suggestions,
        escalated: false,
      });
    }

    if (action === "feedback") {
      const conv = await ensureConv();
      const rating = Number(body.rating);
      if (![1, 2, 3, 4, 5].includes(rating)) {
        return NextResponse.json({ error: "rating 1–5 required" }, { status: 400 });
      }
      await prisma.helpConversation.update({
        where: { id: conv.id },
        data: {
          rating,
          feedback: String(body.feedback || "").trim().slice(0, 500) || null,
        },
      });
      return NextResponse.json({ ok: true, conversationId: conv.id, rating });
    }

    if (action === "close") {
      const conv = await ensureConv();
      await prisma.helpConversation.update({
        where: { id: conv.id },
        data: { status: "closed", closedAt: new Date() },
      });
      return NextResponse.json({ ok: true, conversationId: conv.id, status: "closed" });
    }

    if (action === "new") {
      if (conversationId) {
        await prisma.helpConversation.updateMany({
          where: {
            id: conversationId,
            userId: session.userId,
            status: { in: ["bot", "waiting", "active"] },
          },
          data: { status: "closed", closedAt: new Date() },
        });
      }
      const welcome = getWelcomeMessage(session.role, preferredLang);
      const conv = await prisma.helpConversation.create({
        data: {
          userId: session.userId,
          schoolId: session.schoolId || null,
          role: session.role,
          lang: preferredLang,
          status: "bot",
        },
      });
      await appendHelpMessage({
        conversationId: conv.id,
        senderRole: "bot",
        content: welcome.text,
        meta: replyMeta(welcome),
      });
      return NextResponse.json({
        conversationId: conv.id,
        status: conv.status,
        ...welcome,
        role: session.role,
      });
    }

    // Default: ask / message
    const message = String(body.message || "").trim();
    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    const conv = await ensureConv();
    conversationId = conv.id;

    // Always stay in auto bot mode (no staff live-chat)
    if (conv.status !== "bot") {
      await prisma.helpConversation.update({
        where: { id: conv.id },
        data: { status: "bot", lang: preferredLang },
      });
    }

    await appendHelpMessage({
      conversationId: conv.id,
      senderRole: "user",
      senderId: session.userId,
      content: message,
    });

    const history = await loadConversationMessages(conv.id);
    const lastBot = [...history]
      .reverse()
      .find((m) => m.senderRole === "bot" && m.meta);
    const meta = lastBot?.meta || {};
    const lastTopicId =
      typeof meta.topicId === "string" ? meta.topicId : null;
    const lastIntent =
      typeof meta.intent === "string" ? meta.intent : null;
    const lastDiagnosticId =
      typeof meta.diagnosticId === "string" ? meta.diagnosticId : null;
    const diagnosticStep =
      typeof meta.diagnosticStep === "number" ? meta.diagnosticStep : null;
    const recentMessages = history
      .filter((m) => m.senderRole === "user" || m.senderRole === "bot")
      .slice(-8)
      .map((m) => m.content);

    const reply = answerHelpConversational(
      message,
      session.role,
      preferredLang,
      {
        lastTopicId,
        lastIntent: lastIntent as import("@/lib/help/intents").HelpIntent | null,
        lastDiagnosticId,
        diagnosticStep,
        recentMessages,
      },
    );
    await appendHelpMessage({
      conversationId: conv.id,
      senderRole: "bot",
      content: reply.text,
      meta: replyMeta(reply),
    });
    await prisma.helpConversation.update({
      where: { id: conv.id },
      data: { lang: reply.lang, status: "bot" },
    });

    return NextResponse.json({
      conversationId: conv.id,
      status: "bot",
      ...reply,
      role: session.role,
      canEscalate: false,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[help chat]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
