import { NextResponse } from "next/server";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { canUseChat } from "@/lib/chat/types";
import { listRoomsForUser, getOrCreateDirectRoom } from "@/lib/chat/service";

export async function GET() {
  try {
    const session = await requireSchoolAuth();
    if (!canUseChat(session.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const rooms = await listRoomsForUser(session);
    return NextResponse.json({ rooms });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed to load rooms" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSchoolAuth();
    if (!canUseChat(session.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body as { userId?: string };
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const room = await getOrCreateDirectRoom(session, userId);
    return NextResponse.json({ roomId: room.id });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
