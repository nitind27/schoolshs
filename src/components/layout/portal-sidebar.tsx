"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GraduationCap, Menu, X, LogOut, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useT } from "@/i18n/locale-provider";

/* ────────────────── Theme map ────────────────────────────── */
type Theme = "emerald" | "amber" | "violet" | "sky" | "blue";

const THEMES: Record<Theme, { gradient: string; accent: string; badge: string; text: string; border: string }> = {
  blue:    { gradient: "from-slate-900 via-blue-950 to-indigo-950", accent: "#3b82f6",  badge: "bg-blue-500",   text: "text-blue-200",   border: "border-blue-900" },
  emerald: { gradient: "from-slate-900 via-emerald-950 to-teal-950", accent: "#10b981", badge: "bg-emerald-500", text: "text-emerald-200", border: "border-emerald-900" },
  amber:   { gradient: "from-slate-900 via-amber-950 to-orange-950", accent: "#f59e0b", badge: "bg-amber-500",   text: "text-amber-200",   border: "border-amber-900" },
  violet:  { gradient: "from-slate-900 via-violet-950 to-purple-950", accent: "#8b5cf6", badge: "bg-violet-500", text: "text-violet-200",  border: "border-violet-900" },
  sky:     { gradient: "from-slate-900 via-sky-950 to-cyan-950",    accent: "#0ea5e9",  badge: "bg-sky-500",     text: "text-sky-200",     border: "border-sky-900" },
};

/* ────────────────── Nav item types ──────────────────────── */
export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  group?: string;
}

/* ────────────────── PortalLayout ────────────────────────── */
export function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      {children}
    </div>
  );
}

/* ────────────────── PortalSidebar ───────────────────────── */
export function PortalSidebar({
  title,
  subtitle,
  theme,
  navItems,
  homeHref,
  roleIcon: RoleIcon,
  footerExtra,
}: {
  title: string;
  subtitle: string;
  theme: Theme;
  navItems: NavItem[];
  homeHref: string;
  roleIcon?: React.ComponentType<{ className?: string }>;
  footerExtra?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; schoolName?: string | null; role: string } | null>(null);
  const colors = THEMES[theme];

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  /* group nav items */
  const grouped: Record<string, NavItem[]> = {};
  for (const item of navItems) {
    const g = item.group || "__main__";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(item);
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="fixed top-4 left-4 z-50 lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-md text-slate-700"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] flex-col overflow-hidden",
          `bg-gradient-to-b ${colors.gradient}`,
          "transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
        style={{ borderRight: "1px solid rgba(255,255,255,.06)" }}
      >
        {/* Header */}
        <div className={cn("flex shrink-0 items-center justify-between gap-2 p-4 border-b", colors.border)} style={{ borderColor: "rgba(255,255,255,.08)" }}>
          <Link href={homeHref} className="flex min-w-0 items-center gap-3 group">
            <div
              className="shrink-0 rounded-xl p-2.5 flex items-center justify-center"
              style={{ background: `${colors.accent}22`, border: `1px solid ${colors.accent}44` }}
            >
              {RoleIcon ? (
                <RoleIcon className="h-5 w-5 text-white" />
              ) : (
                <GraduationCap className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-white leading-tight">{title}</h1>
              <p className={cn("truncate text-xs leading-tight mt-0.5", colors.text)}>{subtitle}</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              {group !== "__main__" && (
                <p className={cn("px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest", colors.text)} style={{ opacity: .6 }}>
                  {group}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const isActive =
                    item.href === homeHref
                      ? pathname === homeHref
                      : pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group",
                        isActive
                          ? "bg-white/[.12] text-white shadow-sm"
                          : cn(colors.text, "hover:bg-white/[.07] hover:text-white")
                      )}
                    >
                      <span
                        className={cn(
                          "shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                          isActive
                            ? "text-white"
                            : "text-white/50 group-hover:text-white/80"
                        )}
                        style={isActive ? { background: `${colors.accent}30` } : {}}
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="flex-1 truncate leading-tight">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className={cn("shrink-0 min-w-[20px] h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1.5", colors.badge)}>
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <ChevronRight className="shrink-0 h-3.5 w-3.5 text-white/40" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 p-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {footerExtra}
          <LanguageSwitcher variant="sidebar" />

          {user && (
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,.07)" }}>
              {/* Avatar */}
              <div
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white uppercase"
                style={{ background: colors.accent }}
              >
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{user.name}</p>
                <p className={cn("truncate text-[11px]", colors.text)}>{user.schoolName || user.role}</p>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className={cn(
              "w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all",
              "text-white/60 hover:text-white hover:bg-red-500/20"
            )}
          >
            <LogOut className="h-4 w-4" />
            {t("common.logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
