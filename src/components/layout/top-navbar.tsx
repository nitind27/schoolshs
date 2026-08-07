"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Languages, LogOut, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/i18n/locale-provider";
import { LOCALES, type Locale } from "@/i18n/types";
import { NotificationBell } from "@/components/layout/notification-bell";
import { NavbarChatButton } from "@/components/layout/navbar-chat";
import { NavbarLetterheadButton } from "@/components/layout/navbar-letterhead";
import { NavbarMegaMenu } from "@/components/layout/navbar-mega-menu";
import { NavbarGrSearch } from "@/components/layout/navbar-gr-search";
import { FeatureTourTrigger } from "@/components/feature-tour/feature-tour-panel";
import { toast } from "@/components/ui/toast";
import { AUTH_CHANGED_EVENT, notifyAuthChanged } from "@/lib/auth-client";
import "./top-navbar.css";

type AuthUser = {
  name: string;
  email?: string;
  role?: string;
  schoolName?: string | null;
};

function roleLabel(role: string | undefined, t: (k: string) => string) {
  if (!role) return "";
  const key = `roles.${role}`;
  const label = t(key);
  return label === key ? role : label;
}

export function TopNavbar({
  profileHref,
  showProfile = true,
  sidebarWidth = 260,
  variant = "default",
}: {
  profileHref?: string;
  showProfile?: boolean;
  sidebarWidth?: number;
  /** Admin control-center chrome (super_admin shell) */
  variant?: "default" | "admin";
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
    let alive = true;
    const load = () => {
      fetch("/api/auth/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (alive) setUser(d.user || null);
        })
        .catch(() => {
          if (alive) setUser(null);
        });
    };
    load();
    const onAuth = () => load();
    window.addEventListener(AUTH_CHANGED_EVENT, onAuth);
    return () => {
      alive = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuth);
    };
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (langRef.current && !langRef.current.contains(target))
        setLangOpen(false);
      if (profileRef.current && !profileRef.current.contains(target))
        setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const logout = async () => {
    setProfileOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      notifyAuthChanged({ role: null, userId: null });
      toast.push({
        title: t("common.logoutSuccess"),
        description: t("common.logoutSuccessDesc"),
        variant: "success",
        duration: 4500,
      });
      await new Promise((r) => setTimeout(r, 280));
    } catch {
      toast.error(t("common.networkError"));
    }
    router.push("/login");
    router.refresh();
  };

  const initial = (
    user?.schoolName ||
    user?.name ||
    "?"
  )
    .trim()
    .charAt(0)
    .toUpperCase() || "?";
  const currentLang = LOCALES.find((l) => l.code === locale);
  const showNotifications = user?.role !== "student";
  const showChat = Boolean(
    user?.role && ["school_admin", "teacher", "clerk"].includes(user.role),
  );
  const showLetterhead = Boolean(
    user?.role && ["school_admin", "clerk"].includes(user.role),
  );
  const showMegaMenu = Boolean(
    user?.role && ["school_admin", "clerk"].includes(user.role),
  );
  const showGrSearch = Boolean(
    user?.role && ["school_admin", "teacher", "clerk"].includes(user.role),
  );
  const brandTitle = user?.schoolName || t("landing.productName");
  const roleText = roleLabel(user?.role, t);

  const isAdmin = variant === "admin";

  return (
    <header
      className={cn(
        "tn-shell fixed top-0 right-0 z-40",
        isAdmin && "tn-shell--admin",
        "flex items-center gap-2 px-2 sm:gap-3 sm:px-4",
        "pl-[3.25rem] lg:pl-5 left-0 lg:left-[var(--shell-sidebar-w)]",
      )}
      style={{ ["--shell-sidebar-w" as string]: `${sidebarWidth}px` }}
      data-has-search={showGrSearch ? "true" : "false"}
      data-variant={variant}
    >
      <div className="tn-toolbar">
      {/* Brand first */}
      <div className="tn-shell-left mr-auto flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
        {!showMegaMenu && (
          <span
            className={cn(
              "hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white sm:inline-flex",
              isAdmin
                ? "bg-gradient-to-br from-sky-500 to-sky-700 shadow-sm shadow-sky-500/30"
                : "bg-[var(--tn-ink)]",
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
        )}

        <div className="tn-brand hidden min-w-0 sm:flex">
          <p className="tn-brand-name" title={brandTitle}>
            {isAdmin ? t("admin.shellBrand") : brandTitle}
          </p>
          {roleText ? (
            <p className="tn-brand-meta">
              <span className="tn-brand-dot" aria-hidden />
              {roleText}
            </p>
          ) : null}
        </div>

        {isAdmin && (
          <span className="admin-tn-badge hidden md:inline-flex" title={t("admin.shellLiveHint")}>
            <span className="admin-tn-badge__dot" aria-hidden />
            {t("admin.shellLive")}
          </span>
        )}

        {showMegaMenu && (
          <>
            <span className="tn-divider hidden sm:block" aria-hidden />
            <NavbarMegaMenu />
          </>
        )}
      </div>

      {showGrSearch && (
        <NavbarGrSearch
          scope={user?.role === "teacher" ? "teacher" : "school"}
        />
      )}

      <div className="tn-actions flex shrink-0 items-center gap-1.5 sm:gap-2">
        <div className="tn-tools">
          {showLetterhead && <NavbarLetterheadButton role={user?.role} />}
          {showChat && <NavbarChatButton role={user?.role} />}
          {showNotifications && <NotificationBell />}
          {showMegaMenu && <FeatureTourTrigger />}
        </div>

        <span className="tn-divider hidden sm:block" aria-hidden />

        <div className="relative" ref={langRef}>
          <button
            type="button"
            onClick={() => {
              setLangOpen((v) => !v);
              setProfileOpen(false);
            }}
            className="tn-btn tn-lang"
            data-active={langOpen ? "true" : "false"}
            aria-label={t("lang.language")}
            aria-expanded={langOpen}
          >
            <Languages className="h-3.5 w-3.5 opacity-70" />
            <span className="hidden sm:inline">
              {currentLang?.nativeLabel || locale.toUpperCase()}
            </span>
            <ChevronDown
              className={cn(
                "hidden sm:block h-3 w-3 opacity-50 transition-transform",
                langOpen && "rotate-180",
              )}
            />
          </button>

          {langOpen && (
            <div className="tn-dropdown tn-lang-menu absolute right-0 z-50 mt-2 w-44 rounded-xl p-1.5">
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
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors",
                    locale === l.code
                      ? "bg-teal-50 font-semibold text-teal-900"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span>{l.nativeLabel}</span>
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    {l.code}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen((v) => !v);
              setLangOpen(false);
            }}
            className="tn-btn tn-profile"
            data-active={profileOpen ? "true" : "false"}
            aria-label={t("accountSettings.myProfile")}
            aria-expanded={profileOpen}
            title={user?.name || user?.schoolName || undefined}
          >
            <span className="tn-avatar">{initial}</span>
          </button>

          {profileOpen && (
            <div className="tn-dropdown tn-profile-menu absolute right-0 z-50 mt-2 w-60 rounded-xl p-1.5">
              <div className="mb-1 rounded-lg bg-slate-50 px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user?.name}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {user?.email || user?.schoolName}
                </p>
                {roleText ? (
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-teal-700">
                    {roleText}
                  </p>
                ) : null}
              </div>

              {showProfile && profileHref && (
                <Link
                  href={profileHref}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  {t("accountSettings.myProfile")}
                </Link>
              )}

              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                {t("common.logout")}
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
