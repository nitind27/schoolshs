import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  appendHelpMessage,
  loadConversationMessages,
  notifyAskerStaffReply,
  staffJoinedText,
} from "@/lib/help/service";
import type { HelpLang } from "@/lib/help/engine";

const STAFF_ROLES = ["school_admin", "clerk"] as const;

type Ctx = { params: Promise<{ id: string }> };

async function loadOwned(id: string, schoolId: string) {
  return prisma.helpConversation.findFirst({
    where: { id, schoolId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
}

export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const session = await requireSchoolAuth([...STAFF_ROLES]);
    const { id } = await params;
    const conv = await loadOwned(id, session.schoolId);
    if (!conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const messages = await loadConversationMessages(conv.id);
    return NextResponse.json({
      conversation: {
        id: conv.id,
        status: conv.status,
        role: conv.role,
        lang: conv.lang,
        subject: conv.subject,
        rating: conv.rating,
        feedback: conv.feedback,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        user: conv.user,
        assignedTo: conv.assignedTo,
      },
      messages,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const session = await requireSchoolAuth([...STAFF_ROLES]);
    const { id } = await params;
    const conv = await loadOwned(id, session.schoolId);
    if (!conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "reply");

    if (action === "claim") {
      const updated = await prisma.helpConversation.update({
        where: { id: conv.id },
        data: {
          status: "active",
          assignedToId: session.userId,
        },
      });
      const lang = (conv.lang as HelpLang) || "gu";
      await appendHelpMessage({
        conversationId: conv.id,
        senderRole: "system",
        content: `${session.name || "Staff"}: ${staffJoinedText(lang)}`,
      });
      return NextResponse.json({ ok: true, status: updated.status });
    }

    if (action === "close") {
      await prisma.helpConversation.update({
        where: { id: conv.id },
        data: { status: "closed", closedAt: new Date() },
      });
      await appendHelpMessage({
        conversationId: conv.id,
        senderRole: "system",
        content: "Conversation closed by staff.",
      });
      return NextResponse.json({ ok: true, status: "closed" });
    }

    if (action === "reopen") {
      await prisma.helpConversation.update({
        where: { id: conv.id },
        data: {
          status: "active",
          closedAt: null,
          assignedToId: session.userId,
        },
      });
      return NextResponse.json({ ok: true, status: "active" });
    }

    // Manual reply
    const message = String(body.message || "").trim();
    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    if (conv.status === "closed") {
      return NextResponse.json({ error: "Reopen conversation to reply" }, { status: 400 });
    }

    await prisma.helpConversation.update({
      where: { id: conv.id },
      data: {
        status: "active",
        assignedToId: conv.assignedToId || session.userId,
      },
    });

    const msg = await appendHelpMessage({
      conversationId: conv.id,
      senderRole: "staff",
      senderId: session.userId,
      content: message,
    });

    await notifyAskerStaffReply({
      userId: conv.userId,
      schoolId: session.schoolId,
      conversationId: conv.id,
      preview: message,
    });

    return NextResponse.json({
      ok: true,
      message: {
        id: msg.id,
        senderRole: "staff",
        content: message,
        createdAt: msg.createdAt.toISOString(),
        senderName: session.name,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[help desk reply]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
