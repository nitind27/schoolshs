import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/db";
import { AuthError, getSession } from "@/lib/auth";
import { canUseChat } from "@/lib/chat/types";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
};

async function assertUploadAccess(segments: string[]) {
  const session = await getSession();
  if (!session) throw new AuthError("Login required", 401);

  if (segments[0] === "students" && segments[1]) {
    const studentId = segments[1];
    if (session.role === "student" && session.studentId !== studentId) {
      throw new AuthError("Access denied", 403);
    }
    if (session.role !== "super_admin" && session.schoolId) {
      const student = await prisma.student.findFirst({
        where: { id: studentId, schoolId: session.schoolId },
        select: { id: true },
      });
      if (!student) throw new AuthError("Access denied", 403);
    }
    return;
  }

  if (segments[0] === "chat") {
    const [, schoolId, roomId] = segments;
    if (!session.schoolId || !canUseChat(session.role)) {
      throw new AuthError("Access denied", 403);
    }
    if (!schoolId || schoolId !== session.schoolId) {
      throw new AuthError("Access denied", 403);
    }
    if (!roomId) throw new AuthError("Not found", 404);

    const participant = await prisma.chatParticipant.findFirst({
      where: {
        roomId,
        userId: session.userId,
        room: { schoolId: session.schoolId },
      },
      select: { id: true },
    });
    if (!participant) throw new AuthError("Access denied", 403);
    return;
  }

  throw new AuthError("Not found", 404);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    if (!segments?.length || (segments[0] !== "students" && segments[0] !== "chat")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await assertUploadAccess(segments);

    const uploadRoot = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadRoot, ...segments);
    const resolved = path.resolve(filePath);

    if (!resolved.startsWith(path.resolve(uploadRoot))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!existsSync(resolved)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const ext = path.extname(resolved).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    const buffer = await readFile(resolved);
    const fileName = path.basename(resolved);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": mime.startsWith("image/")
          ? "inline"
          : `inline; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
