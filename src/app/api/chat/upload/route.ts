import { NextResponse } from "next/server";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import {
  canUseChat,
  CHAT_MAX_FILE_BYTES,
  resolveChatFileMime,
  isChatImageMime,
} from "@/lib/chat/types";
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

    const mime = resolveChatFileMime(file.name, file.type);
    if (!mime) {
      return NextResponse.json(
        { error: "File type not allowed. Use image, PDF, Word, Excel or text." },
        { status: 400 }
      );
    }

    await assertRoomAccess(roomId, session.userId, session.schoolId);
    const attachment = await saveChatUpload(session.schoolId, roomId, file, mime);

    return NextResponse.json({
      attachment,
      messageType: isChatImageMime(mime) ? "image" : "file",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 500 });
  }
}
