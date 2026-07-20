import { NextResponse } from "next/server";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { canUseChat, CHAT_ALLOWED_MIME, CHAT_MAX_FILE_BYTES } from "@/lib/chat/types";
import { assertRoomAccess, saveChatUpload } from "@/lib/chat/service";

export async function POST(request: Request) {
  try {
    const session = await requireSchoolAuth();
    if (!canUseChat(session.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const form = await request.formData();
    const roomId = form.get("roomId") as string | null;
    const file = form.get("file") as File | null;

    if (!roomId || !file) {
      return NextResponse.json({ error: "roomId and file required" }, { status: 400 });
    }

    if (file.size > CHAT_MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 400 });
    }

    const mime = file.type || "application/octet-stream";
    if (!CHAT_ALLOWED_MIME.has(mime)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    await assertRoomAccess(roomId, session.userId, session.schoolId);
    const attachment = await saveChatUpload(session.schoolId, roomId, file);

    return NextResponse.json({
      attachment,
      messageType: mime.startsWith("image/") ? "image" : "file",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 500 });
  }
}
