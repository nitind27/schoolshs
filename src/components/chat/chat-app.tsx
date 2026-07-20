"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageCircle, Search, Send, Paperclip, Users, Hash,
  Loader2, Image as ImageIcon, FileText, X, Plus, Wifi, WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";
import { useChatSocket } from "@/hooks/use-chat-socket";
import type { ChatMessageDto, ChatRoomDto, ChatUserDto, PendingAttachment } from "@/lib/chat/types";
import { ROLE_LABELS } from "@/lib/roles";
import { toast } from "@/components/ui/toast";

function avatarColor(name: string) {
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-rose-500 to-pink-500",
    "from-indigo-500 to-blue-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-11 h-11 text-base" : "w-10 h-10 text-sm";
  return (
    <div
      className={cn(
        "shrink-0 rounded-xl bg-gradient-to-br font-bold text-white flex items-center justify-center shadow-md",
        sz,
        avatarColor(name)
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function ChatApp({ variant = "page" }: { variant?: "page" | "drawer" }) {
  const t = useT();
  const isDrawer = variant === "drawer";
  const [rooms, setRooms] = useState<ChatRoomDto[]>([]);
  const [users, setUsers] = useState<ChatUserDto[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "discussion" | "direct">("all");
  const [showNewChat, setShowNewChat] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ userId: string; name: string } | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRoomRef = useRef<string | null>(null);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || null;

  const loadRooms = useCallback(async () => {
    const res = await fetch("/api/chat/rooms");
    if (res.ok) {
      const data = await res.json();
      setRooms(data.rooms || []);
    }
    setLoadingRooms(false);
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/chat/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
  }, []);

  const loadMessages = useCallback(async (roomId: string) => {
    setLoadingMessages(true);
    const res = await fetch(`/api/chat/rooms/${roomId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
    }
    setLoadingMessages(false);
  }, []);

  const handleIncomingMessage = useCallback(
    (message: ChatMessageDto) => {
      if (message.roomId === activeRoomId) {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      }
      loadRooms();
    },
    [activeRoomId, loadRooms]
  );

  const { connected, onlineUsers, typingUsers, joinRoom, leaveRoom, sendText, markRead, startTyping, stopTyping } =
    useChatSocket({
      onMessage: handleIncomingMessage,
      onRoomUpdated: () => loadRooms(),
    });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setCurrentUser({ userId: d.user.userId, name: d.user.name });
      });
    loadRooms();
    loadUsers();
  }, [loadRooms, loadUsers]);

  useEffect(() => {
    if (!activeRoomId) return;

    if (prevRoomRef.current && prevRoomRef.current !== activeRoomId) {
      leaveRoom(prevRoomRef.current);
    }
    prevRoomRef.current = activeRoomId;

    joinRoom(activeRoomId);
    loadMessages(activeRoomId);
    markRead(activeRoomId);
    fetch(`/api/chat/rooms/${activeRoomId}/messages`, { method: "PATCH" });
    loadRooms();
  }, [activeRoomId, joinRoom, leaveRoom, loadMessages, markRead, loadRooms]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    setMobileShowChat(true);
    setShowNewChat(false);
  };

  const startDirectChat = async (userId: string) => {
    const res = await fetch("/api/chat/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      const data = await res.json();
      await loadRooms();
      selectRoom(data.roomId);
    }
  };

  const handleSend = async () => {
    if (!activeRoomId || !text.trim()) return;
    const content = text.trim();
    setText("");
    stopTyping(activeRoomId);
    sendText(activeRoomId, content);
  };

  const handleTyping = (value: string) => {
    setText(value);
    if (!activeRoomId) return;
    startTyping(activeRoomId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => stopTyping(activeRoomId), 1200);
  };

  const handleFileUpload = async (file: File) => {
    if (!activeRoomId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("roomId", activeRoomId);
      form.append("file", file);
      const up = await fetch("/api/chat/upload", { method: "POST", body: form });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) {
        throw new Error(String(upData.error || t("chat.uploadFailed")));
      }
      const { attachment, messageType } = upData;

      const msgRes = await fetch(`/api/chat/rooms/${activeRoomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: messageType,
          content: file.name,
          attachments: [attachment as PendingAttachment],
        }),
      });
      const msgData = await msgRes.json().catch(() => ({}));
      if (!msgRes.ok) {
        throw new Error(String(msgData.error || t("chat.sendFailed")));
      }

      if (msgData.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === msgData.message.id) ? prev : [...prev, msgData.message as ChatMessageDto]
        );
      }
      await loadMessages(activeRoomId);
      await loadRooms();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("chat.uploadFailed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredRooms = rooms.filter((r) => {
    if (tab === "discussion" && r.type !== "school") return false;
    if (tab === "direct" && r.type !== "direct") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.lastMessage?.content?.toLowerCase().includes(q);
    }
    return true;
  });

  const roomTyping = typingUsers.filter(
    (tu) => tu.typing && tu.userId !== currentUser?.userId && activeRoom?.participants.some((p) => p.id === tu.userId)
  );

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 overflow-hidden bg-white",
        isDrawer
          ? "h-full rounded-none border-0 shadow-none sm:rounded-2xl sm:border sm:border-slate-200/80 sm:shadow-lg"
          : "h-full w-full rounded-none border-0 shadow-none"
      )}
    >
      {/* Left panel — room list */}
      <div
        className={cn(
          "flex w-full flex-col border-r border-slate-100 bg-gradient-to-b from-slate-50 to-white lg:w-[320px] lg:shrink-0",
          mobileShowChat && activeRoomId ? "hidden lg:flex" : "flex"
        )}
      >
        <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-4 text-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold leading-tight">{t("chat.title")}</h2>
                <p className="flex items-center gap-1 text-[11px] text-white/80">
                  {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {connected ? t("chat.live") : t("chat.connecting")}
                  <span className="mx-1">·</span>
                  {onlineUsers.length} {t("chat.online")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowNewChat((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
              title={t("chat.newMessage")}
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("chat.search")}
              className="w-full rounded-xl border-0 bg-white/15 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/50 focus:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>

        {showNewChat && (
          <div className="shrink-0 border-b border-slate-100 bg-violet-50/80 p-3 max-h-48 overflow-y-auto">
            <p className="mb-2 text-xs font-semibold text-violet-700">{t("chat.startDirect")}</p>
            <div className="space-y-1">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => startDirectChat(u.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white transition-colors"
                >
                  <Avatar name={u.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{u.name}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex shrink-0 gap-1 border-b border-slate-100 p-2">
          {(["all", "discussion", "direct"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all",
                tab === key
                  ? "bg-violet-100 text-violet-700 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              {t(`chat.tab.${key}`)}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1">
          {loadingRooms ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            </div>
          ) : filteredRooms.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{t("chat.noRooms")}</p>
          ) : (
            filteredRooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => selectRoom(room.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all",
                  activeRoomId === room.id
                    ? "bg-gradient-to-r from-violet-50 to-indigo-50 ring-1 ring-violet-200 shadow-sm"
                    : "hover:bg-slate-50"
                )}
              >
                <div className="relative">
                  {room.type === "school" ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow">
                      <Hash className="h-5 w-5" />
                    </div>
                  ) : (
                    <Avatar name={room.name} />
                  )}
                  {room.unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {room.unreadCount > 9 ? "9+" : room.unreadCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{room.name}</p>
                    {room.lastMessage && (
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {formatTime(room.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {room.lastMessage
                      ? room.lastMessage.type === "text"
                        ? room.lastMessage.content
                        : room.lastMessage.type === "image"
                          ? `📷 ${t("chat.photo")}`
                          : `📎 ${room.lastMessage.content || t("chat.file")}`
                      : t("chat.noMessagesYet")}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel — conversation */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col bg-slate-50/50",
          !mobileShowChat && !activeRoomId ? "hidden lg:flex" : "flex"
        )}
      >
        {!activeRoom ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100">
              <Users className="h-10 w-10 text-violet-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{t("chat.welcomeTitle")}</h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">{t("chat.welcomeDesc")}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur">
              <button
                type="button"
                className="lg:hidden rounded-lg p-1.5 hover:bg-slate-100"
                onClick={() => setMobileShowChat(false)}
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
              {activeRoom.type === "school" ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                  <Hash className="h-5 w-5" />
                </div>
              ) : (
                <Avatar name={activeRoom.name} />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-slate-900">{activeRoom.name}</h3>
                <p className="text-xs text-slate-500">
                  {activeRoom.type === "school"
                    ? `${activeRoom.participants.length} ${t("chat.members")}`
                    : onlineUsers.some((u) => activeRoom.participants.some((p) => p.id === u.id && p.id !== currentUser?.userId))
                      ? t("chat.onlineNow")
                      : t("chat.offline")}
                </p>
              </div>
              <div className="hidden sm:flex -space-x-2">
                {activeRoom.participants.slice(0, 4).map((p) => (
                  <div key={p.id} className="ring-2 ring-white rounded-xl">
                    <Avatar name={p.name} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-3"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgb(226 232 240 / 0.5) 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            >
              {loadingMessages ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
                </div>
              ) : (
                messages.map((msg) => {
                  const mine = msg.senderId === currentUser?.userId;
                  return (
                    <div key={msg.id} className={cn("flex gap-2", mine ? "flex-row-reverse" : "flex-row")}>
                      {!mine && <Avatar name={msg.sender.name} size="sm" />}
                      <div className={cn("max-w-[75%] space-y-1", mine ? "items-end" : "items-start")}>
                        {!mine && (
                          <p className="px-1 text-[11px] font-medium text-slate-500">{msg.sender.name}</p>
                        )}
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2.5 shadow-sm",
                            mine
                              ? "rounded-br-md bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
                              : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-100"
                          )}
                        >
                          {msg.type === "image" && msg.attachments[0] ? (
                            <a href={msg.attachments[0].url} target="_blank" rel="noreferrer" className="block">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={msg.attachments[0].url}
                                alt={msg.attachments[0].fileName}
                                className="max-h-64 rounded-xl object-cover"
                              />
                            </a>
                          ) : msg.type === "file" && msg.attachments[0] ? (
                            <a
                              href={msg.attachments[0].url}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                "flex items-center gap-2 rounded-lg p-2 transition-colors",
                                mine ? "bg-white/15 hover:bg-white/25" : "bg-slate-50 hover:bg-slate-100"
                              )}
                            >
                              <FileText className="h-8 w-8 shrink-0 opacity-80" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{msg.attachments[0].fileName}</p>
                                <p className="text-[11px] opacity-70">
                                  {(msg.attachments[0].fileSize / 1024).toFixed(0)} KB
                                </p>
                              </div>
                            </a>
                          ) : (
                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>
                          )}
                        </div>
                        <p className={cn("px-1 text-[10px] text-slate-400", mine && "text-right")}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              {roomTyping.length > 0 && (
                <p className="text-xs italic text-violet-500 animate-pulse">
                  {roomTyping.map((u) => u.name).join(", ")} {t("chat.typing")}
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white p-3">
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-600 transition-colors disabled:opacity-50"
                  title={t("chat.attach")}
                >
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                </button>
                <div className="relative min-w-0 flex-1">
                  <textarea
                    value={text}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    placeholder={t("chat.placeholder")}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                  <ImageIcon className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-300" />
                </div>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!text.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200 hover:shadow-violet-300 transition-all disabled:opacity-40 disabled:shadow-none"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-slate-400">{t("chat.hint")}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
