import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/auth";
import { isUserRole } from "@/lib/roles";
import {
  getWelcomeMessage,
  wantsHumanAgent,
  type HelpLang,
} from "@/lib/help/engine";
import { answerHelpConversational } from "@/lib/help/conversation";
import {
  appendHelpMessage,
  escalateSystemText,
  getOrCreateOpenConversation,
  loadConversationMessages,
  notifySchoolHelpStaff,
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
        status: { in: ["bot", "waiting", "active"] },
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
      const conv = await ensureConv();
      if (conv.status === "closed") {
        return NextResponse.json({ error: "Conversation closed" }, { status: 400 });
      }
      if (!session.schoolId) {
        return NextResponse.json(
          { error: "Help desk handoff needs a school account" },
          { status: 400 },
        );
      }
      const updated = await prisma.helpConversation.update({
        where: { id: conv.id },
        data: {
          status: "waiting",
          lang: preferredLang,
          subject: String(body.subject || "Help request").slice(0, 120),
        },
      });
      const sys = escalateSystemText(preferredLang);
      await appendHelpMessage({
        conversationId: conv.id,
        senderRole: "system",
        content: sys,
      });
      await notifySchoolHelpStaff({
        schoolId: session.schoolId,
        conversationId: conv.id,
        askerName: session.name || "User",
        preview: String(body.message || body.subject || "Needs help"),
      });
      return NextResponse.json({
        conversationId: updated.id,
        status: updated.status,
        role: session.role,
        lang: preferredLang,
        text: sys,
        escalated: true,
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

    await appendHelpMessage({
      conversationId: conv.id,
      senderRole: "user",
      senderId: session.userId,
      content: message,
    });

    // Live staff mode — store user message only; staff replies manually
    if (conv.status === "waiting" || conv.status === "active") {
      await prisma.helpConversation.update({
        where: { id: conv.id },
        data: { updatedAt: new Date(), lang: preferredLang },
      });
      return NextResponse.json({
        conversationId: conv.id,
        status: conv.status,
        role: session.role,
        lang: preferredLang,
        text:
          preferredLang === "gu"
            ? "તમારો મેસેજ સ્ટાફને મોકલાયો. જવાબ આવે ત્યાં સુધી રાહ જુઓ."
            : preferredLang === "hi"
              ? "आपका संदेश स्टाफ को भेज दिया गया। जवाब आने तक प्रतीक्षा करें।"
              : "Your message was sent to staff. Please wait for their reply.",
        waitingForStaff: true,
        suggestions: [],
      });
    }

    // Explicit human request
    if (wantsHumanAgent(message) && session.schoolId) {
      await prisma.helpConversation.update({
        where: { id: conv.id },
        data: { status: "waiting", subject: message.slice(0, 120), lang: preferredLang },
      });
      const sys = escalateSystemText(preferredLang);
      await appendHelpMessage({
        conversationId: conv.id,
        senderRole: "system",
        content: sys,
      });
      await notifySchoolHelpStaff({
        schoolId: session.schoolId,
        conversationId: conv.id,
        askerName: session.name || "User",
        preview: message,
      });
      return NextResponse.json({
        conversationId: conv.id,
        status: "waiting",
        role: session.role,
        lang: preferredLang,
        text: sys,
        escalated: true,
        canEscalate: false,
      });
    }

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
      data: { lang: reply.lang },
    });

    return NextResponse.json({
      conversationId: conv.id,
      status: conv.status,
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
