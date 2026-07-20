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
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);
