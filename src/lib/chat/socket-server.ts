import type { Server, Socket } from "socket.io";
import { parseSessionToken, type SessionUser } from "@/lib/session-token";
import { canUseChat } from "@/lib/chat/types";
import { createMessage, markRoomRead, assertRoomAccess } from "@/lib/chat/service";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "shs_session";

function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k) out[k] = decodeURIComponent(rest.join("="));
  }
  return out;
}

type AuthedSocket = Socket & { user: SessionUser & { schoolId: string } };

const onlineBySchool = new Map<string, Map<string, string>>();

function setOnline(schoolId: string, userId: string, name: string) {
  if (!onlineBySchool.has(schoolId)) onlineBySchool.set(schoolId, new Map());
  onlineBySchool.get(schoolId)!.set(userId, name);
}

function setOffline(schoolId: string, userId: string) {
  onlineBySchool.get(schoolId)?.delete(userId);
}

function getOnlineList(schoolId: string) {
  const map = onlineBySchool.get(schoolId);
  if (!map) return [];
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
}

function broadcastPresence(io: Server, schoolId: string) {
  io.to(`school:${schoolId}`).emit("presence:update", { users: getOnlineList(schoolId) });
}

export function initSocketServer(io: Server) {
  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.request.headers.cookie);
      const token = cookies[SESSION_COOKIE];
      if (!token) return next(new Error("Unauthorized"));

      const session = await parseSessionToken(token);
      if (!session?.schoolId || !canUseChat(session.role)) {
        return next(new Error("Unauthorized"));
      }

      (socket as AuthedSocket).user = session as SessionUser & { schoolId: string };
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as AuthedSocket).user;
    const schoolId = user.schoolId;

    socket.join(`school:${schoolId}`);
    socket.join(`user:${user.userId}`);
    setOnline(schoolId, user.userId, user.name);
    broadcastPresence(io, schoolId);

    socket.emit("presence:update", { users: getOnlineList(schoolId) });

    socket.on("room:join", async (roomId: string) => {
      try {
        await assertRoomAccess(roomId, user.userId, schoolId);
        socket.join(`room:${roomId}`);
        socket.emit("room:joined", { roomId });
      } catch {
        socket.emit("error", { message: "Cannot join room" });
      }
    });

    socket.on("room:leave", (roomId: string) => {
      socket.leave(`room:${roomId}`);
    });

    socket.on(
      "message:send",
      async (payload: { roomId: string; type?: string; content?: string; attachments?: unknown[] }) => {
        try {
          const { roomId, type = "text", content } = payload || {};
          if (!roomId) return;

          const trimmed = content?.trim() || "";
          if (type === "text" && !trimmed) return;

          const message = await createMessage(user, roomId, type, trimmed || null);
          io.to(`room:${roomId}`).emit("message:new", { message });

          const participants = await prisma.chatParticipant.findMany({
            where: { roomId },
            select: { userId: true },
          });
          for (const p of participants) {
            if (p.userId !== user.userId) {
              io.to(`user:${p.userId}`).emit("room:updated", { roomId });
            }
          }
        } catch (e) {
          socket.emit("error", { message: e instanceof Error ? e.message : "Send failed" });
        }
      }
    );

    socket.on("message:read", async (roomId: string) => {
      try {
        await markRoomRead(user, roomId);
        socket.to(`room:${roomId}`).emit("message:read", { roomId, userId: user.userId });
      } catch {
        /* ignore */
      }
    });

    socket.on("typing:start", (roomId: string) => {
      socket.to(`room:${roomId}`).emit("typing:status", {
        roomId,
        userId: user.userId,
        name: user.name,
        typing: true,
      });
    });

    socket.on("typing:stop", (roomId: string) => {
      socket.to(`room:${roomId}`).emit("typing:status", {
        roomId,
        userId: user.userId,
        name: user.name,
        typing: false,
      });
    });

    socket.on("disconnect", () => {
      setOffline(schoolId, user.userId);
      broadcastPresence(io, schoolId);
    });
  });
}

let ioInstance: Server | null = null;

export function setIoInstance(io: Server) {
  ioInstance = io;
}

export function getIoInstance(): Server | null {
  return ioInstance;
}

export function emitChatMessage(roomId: string, message: unknown) {
  ioInstance?.to(`room:${roomId}`).emit("message:new", { message });
}

export function emitRoomUpdated(roomId: string, userIds: string[]) {
  for (const userId of userIds) {
    ioInstance?.to(`user:${userId}`).emit("room:updated", { roomId });
  }
}
