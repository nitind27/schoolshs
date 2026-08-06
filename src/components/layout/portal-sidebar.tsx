"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Menu, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { TopNavbar } from "@/components/layout/top-navbar";
import { SidebarNavEntries, type NavEntry } from "@/components/layout/sidebar-nav";
import {
  SIDEBAR_EXPANDED_W,
  SidebarCollapseHeaderBtn,
  SidebarCollapseToggle,
  useSidebarCollapse,
} from "@/components/layout/sidebar-collapse";
import "@/components/layout/sidebar-shell.css";

/* ────────────────── Theme map ────────────────────────────── */
type Theme = "emerald" | "amber" | "violet" | "sky" | "blue" | "teacher" | "clerk" | "student" | "ca";

const THEMES: Record<Theme, { gradient: string; accent: string; badge: string; text: string; border: string }> = {
  blue:    { gradient: "from-slate-900 via-blue-950 to-indigo-950", accent: "#3b82f6",  badge: "bg-blue-500",   text: "text-blue-200",   border: "border-blue-900" },
  emerald: { gradient: "from-slate-900 via-emerald-950 to-teal-950", accent: "#10b981", badge: "bg-emerald-500", text: "text-emerald-200", border: "border-emerald-900" },
  amber:   { gradient: "from-slate-900 via-amber-950 to-orange-950", accent: "#f59e0b", badge: "bg-amber-500",   text: "text-amber-200",   border: "border-amber-900" },
  violet: { gradient: "from-slate-900 via-violet-950 to-purple-950", accent: "#8b5cf6", badge: "bg-violet-500", text: "text-violet-200",  border: "border-violet-900" },
  sky:     { gradient: "from-slate-900 via-sky-950 to-cyan-950",    accent: "#0ea5e9",  badge: "bg-sky-500",     text: "text-sky-200",     border: "border-sky-900" },
  teacher: { gradient: "from-slate-950 via-teal-950 to-indigo-950", accent: "#2dd4bf", badge: "bg-teal-500", text: "text-teal-200", border: "border-teal-900" },
  clerk:   { gradient: "from-slate-950 via-cyan-950 to-slate-900",  accent: "#22d3ee", badge: "bg-cyan-500", text: "text-cyan-100", border: "border-cyan-900" },
  student: { gradient: "from-slate-950 via-slate-900 to-teal-950", accent: "#14b8a6", badge: "bg-teal-600", text: "text-teal-100", border: "border-teal-900" },
  ca:      { gradient: "from-stone-950 via-amber-950 to-yellow-950", accent: "#fbbf24", badge: "bg-amber-400", text: "text-amber-100", border: "border-amber-900/40" },
};

/* ────────────────── Nav item types ──────────────────────── */
export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  group?: string;
}

export type { NavEntry };

/* ────────────────── PortalLayout ────────────────────────── */
export function PortalLayout({
  children,
  profileHref,
  showProfile = true,
  shellClassName,
}: {
  children: React.ReactNode;
  profileHref?: string;
  showProfile?: boolean;
  shellClassName?: string;
}) {
  const { widthFor } = useSidebarCollapse();
  const width = widthFor(SIDEBAR_EXPANDED_W);

  useEffect(() => {
    document.documentElement.style.setProperty("--shell-sidebar-w", `${width}px`);
  }, [width]);

  return (
    <div className={cn("min-h-screen", shellClassName || "bg-gradient-to-br from-slate-100 via-sky-50/30 to-slate-100")}>
      <TopNavbar profileHref={profileHref} showProfile={showProfile} sidebarWidth={width} />
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
  navEntries,
  homeHref,
  roleIcon: RoleIcon,
  footerExtra,
}: {
  title: string;
  subtitle: string;
  theme: Theme;
  navItems?: NavItem[];
  /** Prefer this for collapsible submenus (clerk / complex portals). */
  navEntries?: NavEntry[];
  homeHref: string;
  roleIcon?: React.ComponentType<{ className?: string }>;
  footerExtra?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { collapsed, widthFor } = useSidebarCollapse();
  const width = widthFor(SIDEBAR_EXPANDED_W);
  const [mobileOpen, setMobileOpen] = useState(false);
  const colors = THEMES[theme];
  const useEntries = Boolean(navEntries?.length);

  useEffect(() => {
    document.documentElement.style.setProperty("--shell-sidebar-w", `${width}px`);
  }, [width]);

  const grouped: Record<string, NavItem[]> = {};
  if (!useEntries && navItems) {
    for (const item of navItems) {
      const g = item.group || "__main__";
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(item);
    }
  }

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="shell-menu-btn fixed left-2.5 z-[45] lg:hidden flex items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-slate-700 cursor-pointer"
      >
        <Menu className="h-[1.15rem] w-[1.15rem]" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        data-collapsed={collapsed && !mobileOpen ? "true" : "false"}
        className={cn(
          "shell-aside fixed inset-y-0 left-0 z-50 flex h-screen flex-col overflow-hidden",
          `bg-gradient-to-b ${colors.gradient}`,
          "transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
        style={{
          width: mobileOpen ? SIDEBAR_EXPANDED_W : width,
          borderRight: "1px solid rgba(255,255,255,.06)",
        }}
      >
        <div
          className={cn("shell-brand flex shrink-0 items-center justify-between gap-2 px-3 py-3.5 border-b", colors.border)}
          style={{ borderColor: "rgba(255,255,255,.08)" }}
        >
          <Link href={homeHref} className="flex min-w-0 items-center gap-3 group" title={title}>
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
            <div className="shell-brand-text min-w-0">
              <h1 className="truncate text-sm font-bold text-white leading-tight">{title}</h1>
              <p className={cn("truncate text-xs leading-tight mt-0.5", colors.text)}>{subtitle}</p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <SidebarCollapseHeaderBtn />
            <button
              type="button"
              onClick={closeMobile}
              className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white lg:hidden cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="shell-nav min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 space-y-1">
          {useEntries && navEntries ? (
            <SidebarNavEntries
              items={navEntries}
              pathname={pathname}
              onNavigate={closeMobile}
              accentColor={`${colors.accent}4D`}
              inactiveTextClass={colors.text}
              collapsed={collapsed && !mobileOpen}
            />
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="space-y-0.5 pb-3">
                {group !== "__main__" && (
                  <p
                    className={cn(
                      "shell-group-label px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest",
                      colors.text,
                    )}
                    style={{ opacity: 0.6 }}
                  >
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
                        onClick={closeMobile}
                        title={collapsed && !mobileOpen ? item.label : undefined}
                        className={cn(
                          "shell-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group",
                          isActive
                            ? "bg-white/[.12] text-white shadow-sm"
                            : cn(colors.text, "hover:bg-white/[.07] hover:text-white"),
                          collapsed && !mobileOpen && "justify-center px-2",
                        )}
                      >
                        <span
                          className={cn(
                            "shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                            isActive ? "text-white" : "text-white/50 group-hover:text-white/80",
                          )}
                          style={isActive ? { background: `${colors.accent}30` } : {}}
                        >
                          <item.icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="shell-nav-label flex-1 truncate leading-tight">{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className={cn(
                              "shell-nav-badge shrink-0 min-w-[20px] h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1.5",
                              colors.badge,
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                        {isActive && (
                          <ChevronRight className="shell-nav-chevron shrink-0 h-3.5 w-3.5 text-white/40" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </nav>

        <div className="shell-footer shrink-0 space-y-2 px-2.5 py-2" style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {footerExtra}
          <SidebarCollapseToggle />
        </div>
      </aside>
    </>
  );
}
