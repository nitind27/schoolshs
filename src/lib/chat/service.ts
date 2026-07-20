import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/session-token";
import {
  chatAttachmentUrl,
  directRoomKey,
  type ChatMessageDto,
  type ChatRoomDto,
  type ChatUserDto,
  type PendingAttachment,
} from "@/lib/chat/types";

function toUserDto(u: { id: string; name: string; email: string; role: string }): ChatUserDto {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

function toMessageDto(
  msg: {
    id: string;
    roomId: string;
    senderId: string;
    type: string;
    content: string | null;
    createdAt: Date;
    sender: { id: string; name: string; email: string; role: string };
    attachments: { id: string; fileName: string; mimeType: string; fileSize: number; filePath: string }[];
  },
  schoolId: string
): ChatMessageDto {
  return {
    id: msg.id,
    roomId: msg.roomId,
    senderId: msg.senderId,
    sender: toUserDto(msg.sender),
    type: msg.type as ChatMessageDto["type"],
    content: msg.content,
    createdAt: msg.createdAt.toISOString(),
    attachments: msg.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      mimeType: a.mimeType,
      fileSize: a.fileSize,
      url: chatAttachmentUrl(schoolId, msg.roomId, path.basename(a.filePath)),
    })),
  };
}

export async function ensureSchoolDiscussionRoom(schoolId: string, schoolName?: string | null) {
  const existing = await prisma.chatRoom.findFirst({
    where: { schoolId, type: "school" },
  });
  if (existing) return existing;

  const staffUsers = await prisma.user.findMany({
    where: { schoolId, isActive: true, role: { in: ["school_admin", "teacher", "clerk"] } },
    select: { id: true },
  });

  return prisma.chatRoom.create({
    data: {
      schoolId,
      type: "school",
      name: schoolName ? `${schoolName} — Staff Discussion` : "Staff Discussion",
      participants: {
        create: staffUsers.map((u) => ({ userId: u.id })),
      },
    },
  });
}

export async function syncSchoolDiscussionParticipants(schoolId: string) {
  const room = await ensureSchoolDiscussionRoom(schoolId);
  const staffUsers = await prisma.user.findMany({
    where: { schoolId, isActive: true, role: { in: ["school_admin", "teacher", "clerk"] } },
    select: { id: true },
  });
  const existing = await prisma.chatParticipant.findMany({
    where: { roomId: room.id },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map((p) => p.userId));
  const missing = staffUsers.filter((u) => !existingIds.has(u.id));
  if (missing.length) {
    await prisma.chatParticipant.createMany({
      data: missing.map((u) => ({ roomId: room.id, userId: u.id })),
      skipDuplicates: true,
    });
  }
  return room;
}

export async function getOrCreateDirectRoom(
  session: SessionUser & { schoolId: string },
  otherUserId: string
) {
  const other = await prisma.user.findFirst({
    where: {
      id: otherUserId,
      schoolId: session.schoolId,
      isActive: true,
      role: { in: ["school_admin", "teacher", "clerk"] },
    },
  });
  if (!other) throw new Error("User not found");

  const key = directRoomKey(session.userId, otherUserId);
  const existing = await prisma.chatRoom.findUnique({
    where: { directKey: key },
    include: { participants: { include: { user: true } } },
  });
  if (existing) return existing;

  return prisma.chatRoom.create({
    data: {
      schoolId: session.schoolId,
      type: "direct",
      name: other.name,
      directKey: key,
      participants: {
        create: [{ userId: session.userId }, { userId: otherUserId }],
      },
    },
    include: { participants: { include: { user: true } } },
  });
}

export async function assertRoomAccess(roomId: string, userId: string, schoolId: string) {
  const participant = await prisma.chatParticipant.findFirst({
    where: { roomId, userId, room: { schoolId } },
    include: { room: true },
  });
  if (!participant) throw new Error("Access denied");
  return participant;
}

export async function listRoomsForUser(session: SessionUser & { schoolId: string }): Promise<ChatRoomDto[]> {
  await syncSchoolDiscussionParticipants(session.schoolId);

  const participants = await prisma.chatParticipant.findMany({
    where: { userId: session.userId, room: { schoolId: session.schoolId } },
    include: {
      room: {
        include: {
          participants: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: { select: { id: true, name: true, email: true, role: true } },
              attachments: true,
            },
          },
        },
      },
    },
    orderBy: { room: { updatedAt: "desc" } },
  });

  const roomIds = participants.map((p) => p.roomId);
  const unreadCounts = await getUnreadCounts(session.userId, roomIds);

  return participants.map((p) => {
    const room = p.room;
    const lastRaw = room.messages[0];
    const displayName =
      room.type === "direct"
        ? room.participants.find((x) => x.userId !== session.userId)?.user.name || room.name || "Direct Chat"
        : room.name || "Discussion";

    return {
      id: room.id,
      type: room.type as ChatRoomDto["type"],
      name: displayName,
      schoolId: room.schoolId,
      participants: room.participants.map((x) => toUserDto(x.user)),
      lastMessage: lastRaw ? toMessageDto(lastRaw, room.schoolId) : null,
      unreadCount: unreadCounts.get(room.id) || 0,
      updatedAt: lastRaw?.createdAt.toISOString() || room.updatedAt.toISOString(),
    };
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

async function getUnreadCounts(userId: string, roomIds: string[]) {
  const map = new Map<string, number>();
  if (!roomIds.length) return map;

  const parts = await prisma.chatParticipant.findMany({
    where: { userId, roomId: { in: roomIds } },
    select: { roomId: true, lastReadAt: true },
  });

  for (const part of parts) {
    const count = await prisma.chatMessage.count({
      where: {
        roomId: part.roomId,
        senderId: { not: userId },
        ...(part.lastReadAt ? { createdAt: { gt: part.lastReadAt } } : {}),
      },
    });
    map.set(part.roomId, count);
  }
  return map;
}

export async function listMessages(
  session: SessionUser & { schoolId: string },
  roomId: string,
  cursor?: string,
  limit = 40
) {
  await assertRoomAccess(roomId, session.userId, session.schoolId);

  const messages = await prisma.chatMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      sender: { select: { id: true, name: true, email: true, role: true } },
      attachments: true,
    },
  });

  return {
    messages: messages.reverse().map((m) => toMessageDto(m, session.schoolId)),
    nextCursor: messages.length === limit ? messages[0]?.id : null,
  };
}

export async function createMessage(
  session: SessionUser & { schoolId: string },
  roomId: string,
  type: string,
  content: string | null,
  pendingAttachments: PendingAttachment[] = []
) {
  await assertRoomAccess(roomId, session.userId, session.schoolId);

  const msg = await prisma.chatMessage.create({
    data: {
      roomId,
      senderId: session.userId,
      type,
      content,
      attachments: pendingAttachments.length
        ? {
            create: pendingAttachments.map((a) => ({
              fileName: a.fileName,
              mimeType: a.mimeType,
              filePath: a.filePath,
              fileSize: a.fileSize,
            })),
          }
        : undefined,
    },
    include: {
      sender: { select: { id: true, name: true, email: true, role: true } },
      attachments: true,
    },
  });

  await prisma.chatRoom.update({
    where: { id: roomId },
    data: { updatedAt: new Date() },
  });

  await prisma.chatParticipant.update({
    where: { roomId_userId: { roomId, userId: session.userId } },
    data: { lastReadAt: new Date() },
  });

  const preview =
    content?.trim() ||
    (pendingAttachments.length
      ? `Sent ${pendingAttachments.length} attachment${pendingAttachments.length > 1 ? "s" : ""}`
      : "New message");

  void import("@/lib/notifications")
    .then(({ notifyChatParticipants }) =>
      notifyChatParticipants({
        schoolId: session.schoolId,
        roomId,
        senderId: session.userId,
        senderName: msg.sender.name,
        preview,
      })
    )
    .catch((err) => console.error("[chat notify]", err));

  return toMessageDto(msg, session.schoolId);
}

export async function markRoomRead(session: SessionUser & { schoolId: string }, roomId: string) {
  await assertRoomAccess(roomId, session.userId, session.schoolId);
  await prisma.chatParticipant.update({
    where: { roomId_userId: { roomId, userId: session.userId } },
    data: { lastReadAt: new Date() },
  });
}

export async function listChatUsers(schoolId: string, excludeUserId: string) {
  const users = await prisma.user.findMany({
    where: {
      schoolId,
      isActive: true,
      role: { in: ["school_admin", "teacher", "clerk"] },
      id: { not: excludeUserId },
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  return users.map(toUserDto);
}

export async function saveChatUpload(
  schoolId: string,
  roomId: string,
  file: File
): Promise<PendingAttachment> {
  const dir = path.join(process.cwd(), "uploads", "chat", schoolId, roomId);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || "";
  const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const storedName = `${randomBytes(8).toString("hex")}_${safeBase || "file"}${ext && !safeBase.endsWith(ext) ? ext : ""}`;
  const filePath = path.join(dir, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    filePath,
    fileSize: buffer.length,
  };
}
