import { NextResponse } from "next/server";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { canUseChat } from "@/lib/chat/types";
import { listChatUsers } from "@/lib/chat/service";

export async function GET() {
  try {
    const session = await requireSchoolAuth();
    if (!canUseChat(session.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const users = await listChatUsers(session.schoolId, session.userId);
    return NextResponse.json({ users });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
