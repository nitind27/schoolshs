import type { UserRole } from "@/lib/roles";

export const CHAT_ROLES: UserRole[] = ["school_admin", "teacher", "clerk"];

export type ChatRoomType = "school" | "direct" | "group";

export type ChatMessageType = "text" | "image" | "file" | "system";

export interface ChatUserDto {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ChatAttachmentDto {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  url: string;
}

export interface ChatMessageDto {
  id: string;
  roomId: string;
  senderId: string;
  sender: ChatUserDto;
  type: ChatMessageType;
  content: string | null;
  attachments: ChatAttachmentDto[];
  createdAt: string;
}

export interface ChatRoomDto {
  id: string;
  type: ChatRoomType;
  name: string;
  schoolId: string;
  participants: ChatUserDto[];
  lastMessage: ChatMessageDto | null;
  unreadCount: number;
  updatedAt: string;
}

export interface PendingAttachment {
  fileName: string;
  mimeType: string;
  filePath: string;
  fileSize: number;
}

export function directRoomKey(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join(":");
}

export function canUseChat(role: string): boolean {
  return CHAT_ROLES.includes(role as UserRole);
}

export function chatAttachmentUrl(schoolId: string, roomId: string, fileName: string): string {
  return `/api/uploads/chat/${schoolId}/${roomId}/${encodeURIComponent(fileName)}`;
}

export const CHAT_MAX_FILE_BYTES = 15 * 1024 * 1024;
export const CHAT_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/octet-stream",
]);

const EXT_TO_MIME: Record<string, string> = {
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

/** Resolve MIME from browser type + file extension (mobile often sends empty/octet-stream). */
export function resolveChatFileMime(fileName: string, browserMime?: string): string | null {
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase() : "";
  const fromExt = ext ? EXT_TO_MIME[ext] : undefined;
  const raw = (browserMime || "").trim().toLowerCase();

  if (raw && raw !== "application/octet-stream" && CHAT_ALLOWED_MIME.has(raw)) return raw;
  if (fromExt && CHAT_ALLOWED_MIME.has(fromExt)) return fromExt;
  if (raw.startsWith("image/")) return raw;
  return fromExt || null;
}

export function isChatImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}
