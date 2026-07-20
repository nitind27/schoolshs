"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import type { ChatMessageDto } from "@/lib/chat/types";

type TypingUser = { userId: string; name: string; typing: boolean };

export function useChatSocket(handlers?: {
  onMessage?: (message: ChatMessageDto) => void;
  onRoomUpdated?: (roomId: string) => void;
}) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; name: string }[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    const socket = io({
      path: "/api/socketio",
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("presence:update", (data: { users?: { id: string; name: string }[] }) => {
      setOnlineUsers(data.users || []);
    });

    socket.on("message:new", (data: { message: ChatMessageDto }) => {
      handlersRef.current?.onMessage?.(data.message);
    });

    socket.on("room:updated", (data: { roomId: string }) => {
      handlersRef.current?.onRoomUpdated?.(data.roomId);
    });

    socket.on("typing:status", (data: TypingUser & { roomId: string }) => {
      setTypingUsers((prev) => {
        const rest = prev.filter((t) => t.userId !== data.userId);
        return data.typing ? [...rest, { userId: data.userId, name: data.name, typing: true }] : rest;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit("room:join", roomId);
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit("room:leave", roomId);
  }, []);

  const sendText = useCallback((roomId: string, content: string) => {
    socketRef.current?.emit("message:send", { roomId, type: "text", content });
  }, []);

  const markRead = useCallback((roomId: string) => {
    socketRef.current?.emit("message:read", roomId);
  }, []);

  const startTyping = useCallback((roomId: string) => {
    socketRef.current?.emit("typing:start", roomId);
  }, []);

  const stopTyping = useCallback((roomId: string) => {
    socketRef.current?.emit("typing:stop", roomId);
  }, []);

  return {
    connected,
    onlineUsers,
    typingUsers,
    joinRoom,
    leaveRoom,
    sendText,
    markRead,
    startTyping,
    stopTyping,
  };
}
