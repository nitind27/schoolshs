"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  MessageCircle,
  UserRound,
  ClipboardList,
  GraduationCap,
  Info,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";

type FeedItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  source: "notification" | "chat";
};

function typeIcon(type: string) {
  switch (type) {
    case "chat":
      return MessageCircle;
    case "student":
    case "admission":
      return UserRound;
    case "attendance":
      return ClipboardList;
    case "result":
      return GraduationCap;
    case "timetable":
      return CalendarClock;
    default:
      return Info;
  }
}

function timeAgo(iso: string, t: (k: string, p?: Record<string, string | number>) => string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("notifications.justNow");
  if (m < 60) return t("notifications.minsAgo", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("notifications.hoursAgo", { n: h });
  const d = Math.floor(h / 24);
  return t("notifications.daysAgo", { n: d });
}

export function NotificationBell() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?take=20");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items || []);
      setUnread(data.unreadCount || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const markAll = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setUnread(data.unreadCount || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  const markOne = async (item: FeedItem) => {
    if (item.source === "chat" || item.readAt) return;
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [item.id] }),
    });
    setItems((prev) =>
      prev.map((x) => (x.id === item.id ? { ...x, readAt: new Date().toISOString() } : x))
    );
    setUnread((n) => Math.max(0, n - 1));
  };

  const badge = unread > 99 ? "99+" : unread > 0 ? String(unread) : null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white",
          "text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors",
          open && "border-blue-300 bg-blue-50 text-blue-700"
        )}
        aria-label={t("notifications.title")}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {badge && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-1.5rem,360px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/80">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-slate-900">{t("notifications.title")}</p>
              <p className="text-[11px] text-slate-500">
                {unread > 0
                  ? t("notifications.unreadCount", { count: unread })
                  : t("notifications.allCaughtUp")}
              </p>
            </div>
            {unread > 0 && (
              <button
                type="button"
                disabled={loading}
                onClick={markAll}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-[min(70vh,420px)] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">{t("notifications.empty")}</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => {
                  const Icon = typeIcon(item.type);
                  const unreadItem = !item.readAt;
                  const inner = (
                    <div
                      className={cn(
                        "flex gap-2.5 px-3 py-2.5 transition-colors hover:bg-slate-50",
                        unreadItem && "bg-blue-50/50"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          item.type === "chat"
                            ? "bg-violet-100 text-violet-700"
                            : item.type === "student" || item.type === "admission"
                              ? "bg-teal-100 text-teal-700"
                              : item.type === "attendance"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm leading-snug text-slate-900",
                              unreadItem ? "font-semibold" : "font-medium"
                            )}
                          >
                            {item.title}
                          </p>
                          {unreadItem && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                          )}
                        </div>
                        {item.body && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.body}</p>
                        )}
                        <p className="mt-1 text-[10px] text-slate-400">
                          {timeAgo(item.createdAt, t)}
                        </p>
                      </div>
                    </div>
                  );

                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          onClick={() => {
                            void markOne(item);
                            setOpen(false);
                          }}
                        >
                          {inner}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => void markOne(item)}
                        >
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
