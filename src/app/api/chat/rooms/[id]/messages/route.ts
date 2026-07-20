import { NextResponse } from "next/server";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { canUseChat } from "@/lib/chat/types";
import { listMessages, createMessage, markRoomRead } from "@/lib/chat/service";
import { emitChatMessage, emitRoomUpdated } from "@/lib/chat/socket-server";
import { prisma } from "@/lib/db";
import type { PendingAttachment } from "@/lib/chat/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSchoolAuth();
    if (!canUseChat(session.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;

    const result = await listMessages(session, id, cursor);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSchoolAuth();
    if (!canUseChat(session.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id: roomId } = await params;
    const body = await request.json();
    const { type = "text", content, attachments = [] } = body as {
      type?: string;
      content?: string;
      attachments?: PendingAttachment[];
    };

    const trimmed = content?.trim() || "";
    if (type === "text" && !trimmed && !attachments.length) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    const message = await createMessage(
      session,
      roomId,
      attachments.length ? (type === "image" ? "image" : "file") : type,
      trimmed || null,
      attachments
    );

    emitChatMessage(roomId, message);

    const participants = await prisma.chatParticipant.findMany({
      where: { roomId },
      select: { userId: true },
    });
    emitRoomUpdated(
      roomId,
      participants.filter((p) => p.userId !== session.userId).map((p) => p.userId)
    );

    return NextResponse.json({ message });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Send failed" }, { status: 500 });
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSchoolAuth();
    if (!canUseChat(session.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    await markRoomRead(session, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
