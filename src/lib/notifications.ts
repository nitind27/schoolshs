import "server-only";

import { prisma } from "@/lib/db";
import type { UserRole } from "@/lib/roles";
import { canUseChat } from "@/lib/chat/types";

export type NotificationType =
  | "chat"
  | "student"
  | "attendance"
  | "admission"
  | "result"
  | "system"
  | "timetable";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  source: "notification" | "chat";
};

export async function createNotification(opts: {
  userId: string;
  schoolId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  return prisma.notification.create({
    data: {
      userId: opts.userId,
      schoolId: opts.schoolId ?? null,
      type: opts.type,
      title: opts.title,
      body: opts.body ?? null,
      href: opts.href ?? null,
      metaJson: opts.meta ? JSON.stringify(opts.meta) : null,
    },
  });
}

/** Notify all active users of a school with given roles */
export async function notifySchoolRoles(opts: {
  schoolId: string;
  roles: UserRole[];
  type: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
  meta?: Record<string, unknown> | null;
  excludeUserId?: string;
}) {
  const users = await prisma.user.findMany({
    where: {
      schoolId: opts.schoolId,
      isActive: true,
      role: { in: opts.roles },
      ...(opts.excludeUserId ? { id: { not: opts.excludeUserId } } : {}),
    },
    select: { id: true },
  });

  if (!users.length) return 0;

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      schoolId: opts.schoolId,
      type: opts.type,
      title: opts.title,
      body: opts.body ?? null,
      href: opts.href ?? null,
      metaJson: opts.meta ? JSON.stringify(opts.meta) : null,
    })),
  });
  return users.length;
}

export async function getChatUnreadTotal(userId: string): Promise<number> {
  const parts = await prisma.chatParticipant.findMany({
    where: { userId },
    select: { roomId: true, lastReadAt: true },
  });
  if (!parts.length) return 0;

  let total = 0;
  for (const part of parts) {
    const count = await prisma.chatMessage.count({
      where: {
        roomId: part.roomId,
        senderId: { not: userId },
        ...(part.lastReadAt ? { createdAt: { gt: part.lastReadAt } } : {}),
      },
    });
    total += count;
  }
  return total;
}

export async function listUserNotifications(
  userId: string,
  take = 20
): Promise<NotificationItem[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    href: r.href,
    readAt: r.readAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    source: "notification" as const,
  }));
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function markNotificationsRead(
  userId: string,
  ids?: string[]
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
      ...(ids?.length ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });
  return result.count;
}

export async function buildNotificationFeed(
  userId: string,
  role: UserRole,
  opts?: { take?: number }
) {
  const take = opts?.take ?? 20;
  const [items, eventUnread, chatUnread] = await Promise.all([
    listUserNotifications(userId, take),
    getUnreadNotificationCount(userId),
    canUseChat(role) ? getChatUnreadTotal(userId) : Promise.resolve(0),
  ]);

  const feed: NotificationItem[] = [...items];

  if (chatUnread > 0 && canUseChat(role)) {
    feed.unshift({
      id: "chat-unread",
      type: "chat",
      title: chatUnread === 1 ? "1 new chat message" : `${chatUnread} new chat messages`,
      body: "Open Staff Chat to view and reply",
      href: "/chat",
      readAt: null,
      createdAt: new Date().toISOString(),
      source: "chat",
    });
  }

  feed.sort((a, b) => {
    if (!!a.readAt !== !!b.readAt) return a.readAt ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return {
    items: feed.slice(0, take),
    unreadCount: eventUnread + chatUnread,
    eventUnread,
    chatUnread,
  };
}

/** Notify chat room participants (except sender) of a new message */
export async function notifyChatParticipants(opts: {
  schoolId: string;
  roomId: string;
  senderId: string;
  senderName: string;
  preview: string;
}) {
  const parts = await prisma.chatParticipant.findMany({
    where: { roomId: opts.roomId, userId: { not: opts.senderId } },
    select: { userId: true },
  });
  if (!parts.length) return;

  const title = `Message from ${opts.senderName}`;
  const body = opts.preview.slice(0, 140);
  const href = "/chat";

  // Avoid flooding: only create if user has no unread chat-type notification in last 2 minutes
  const since = new Date(Date.now() - 2 * 60 * 1000);
  for (const p of parts) {
    const recent = await prisma.notification.findFirst({
      where: {
        userId: p.userId,
        type: "chat",
        readAt: null,
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    if (recent) {
      await prisma.notification.update({
        where: { id: recent.id },
        data: { title, body, href, updatedAt: new Date() },
      });
      continue;
    }
    await createNotification({
      userId: p.userId,
      schoolId: opts.schoolId,
      type: "chat",
      title,
      body,
      href,
      meta: { roomId: opts.roomId },
    });
  }
}
