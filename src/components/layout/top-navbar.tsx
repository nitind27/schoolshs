"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Languages, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/i18n/locale-provider";
import { LOCALES, type Locale } from "@/i18n/types";
import { NotificationBell } from "@/components/layout/notification-bell";
import { NavbarChatButton } from "@/components/layout/navbar-chat";
import { NavbarLetterheadButton } from "@/components/layout/navbar-letterhead";
import { toast } from "@/components/ui/toast";

type AuthUser = {
  name: string;
  email?: string;
  role?: string;
  schoolName?: string | null;
};

export function TopNavbar({
  profileHref,
  showProfile = true,
  sidebarWidth = 260,
}: {
  profileHref?: string;
  showProfile?: boolean;
  sidebarWidth?: number;
}) {
  const t = useT();
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user || null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (langRef.current && !langRef.current.contains(target)) setLangOpen(false);
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const logout = async () => {
    setProfileOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.push({
        title: t("common.logoutSuccess"),
        description: t("common.logoutSuccessDesc"),
        variant: "success",
        duration: 4500,
      });
      // Brief pause so the toast paints before route change
      await new Promise((r) => setTimeout(r, 280));
    } catch {
      toast.error(t("common.networkError"));
    }
    router.push("/login");
    router.refresh();
  };

  const initial = (user?.name || "?").charAt(0).toUpperCase();
  const currentLang = LOCALES.find((l) => l.code === locale);
  const showNotifications = user?.role !== "student";
  const showChat = Boolean(user?.role && ["school_admin", "teacher", "clerk"].includes(user.role));
  const showLetterhead = Boolean(user?.role && ["school_admin", "clerk"].includes(user.role));

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-40 h-14 border-b border-slate-200/80",
        "bg-white/90 backdrop-blur-md shadow-sm",
        "flex items-center justify-end gap-1.5 px-3 sm:px-4",
        "pl-16 lg:pl-4 left-0 lg:left-[var(--shell-sidebar-w)]",
      )}
      style={{ ["--shell-sidebar-w" as string]: `${sidebarWidth}px` }}
    >
      {showLetterhead && <NavbarLetterheadButton role={user?.role} />}
      {showChat && <NavbarChatButton role={user?.role} />}
      {showNotifications && <NotificationBell />}

      {/* Language */}
      <div className="relative" ref={langRef}>
        <button
          type="button"
          onClick={() => {
            setLangOpen((v) => !v);
            setProfileOpen(false);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 h-9 rounded-xl border border-slate-200 bg-white px-2.5",
            "text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors",
            langOpen && "border-blue-300 bg-blue-50 text-blue-700",
          )}
          aria-label={t("lang.language")}
          aria-expanded={langOpen}
        >
          <Languages className="h-4 w-4" />
          <span className="text-xs font-semibold hidden sm:inline">
            {currentLang?.nativeLabel || locale.toUpperCase()}
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", langOpen && "rotate-180")} />
        </button>

        {langOpen && (
          <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/80 p-1.5 z-50">
            <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {t("lang.language")}
            </p>
            {LOCALES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLocale(l.code as Locale);
                  setLangOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors",
                  locale === l.code
                    ? "bg-blue-50 text-blue-800 font-semibold"
                    : "text-slate-700 hover:bg-slate-50",
                )}
              >
                <span>{l.nativeLabel}</span>
                <span className="text-[10px] font-bold uppercase text-slate-400">{l.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="relative" ref={profileRef}>
        <button
          type="button"
          onClick={() => {
            setProfileOpen((v) => !v);
            setLangOpen(false);
          }}
          className={cn(
            "inline-flex items-center gap-2 h-9 rounded-xl border border-slate-200 bg-white pl-1 pr-2",
            "text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors",
            profileOpen && "border-blue-300 bg-blue-50",
          )}
          aria-label={t("accountSettings.myProfile")}
          aria-expanded={profileOpen}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white uppercase shadow-sm">
            {initial}
          </span>
          <span className="hidden md:flex flex-col items-start leading-tight max-w-[140px]">
            <span className="text-xs font-semibold truncate w-full">{user?.name || "…"}</span>
            <span className="text-[10px] text-slate-400 truncate w-full">
              {user?.schoolName || user?.email || ""}
            </span>
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", profileOpen && "rotate-180")} />
        </button>

        {profileOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/80 p-1.5 z-50">
            <div className="px-2.5 py-2 border-b border-slate-100 mb-1">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || user?.schoolName}</p>
            </div>

            {showProfile && profileHref && (
              <Link
                href={profileHref}
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User className="h-4 w-4 text-slate-400" />
                {t("accountSettings.myProfile")}
              </Link>
            )}

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              {t("common.logout")}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
