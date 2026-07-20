"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";
import { canUseChat } from "@/lib/chat/types";

/** Opens the full-page chat at `/chat` (not a drawer). */
export function NavbarChatButton({ role }: { role?: string | null }) {
  const t = useT();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  const allowed = role ? canUseChat(role) : false;
  const isActive = pathname === "/chat" || pathname.startsWith("/chat/");

  const loadUnread = useCallback(async () => {
    if (!allowed || isActive) return;
    try {
      const res = await fetch("/api/notifications?take=5");
      if (!res.ok) return;
      const data = await res.json();
      setUnread(Number(data.chatUnread || 0));
    } catch {
      /* ignore */
    }
  }, [allowed, isActive]);

  useEffect(() => {
    if (!allowed) return;
    if (isActive) {
      setUnread(0);
      return;
    }
    loadUnread();
    const id = setInterval(loadUnread, 30000);
    return () => clearInterval(id);
  }, [allowed, isActive, loadUnread]);

  if (!allowed) return null;

  const badge = unread > 99 ? "99+" : unread > 0 ? String(unread) : null;

  return (
    <Link
      href="/chat"
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white",
        "text-slate-600 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700",
        isActive && "border-sky-300 bg-sky-50 text-sky-700"
      )}
      aria-label={t("nav.chat")}
      title={t("nav.chat")}
      aria-current={isActive ? "page" : undefined}
      onClick={() => setUnread(0)}
    >
      <MessageCircle className="h-4 w-4" />
      {badge && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-bold text-white shadow-sm">
          {badge}
        </span>
      )}
    </Link>
  );
}
