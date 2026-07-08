"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Shield, Users, Plus, LogOut, Menu, X, LayoutDashboard, ChevronRight, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useT } from "@/i18n/locale-provider";

const navItems = [
  { href: "/admin",            label: "Dashboard",       icon: LayoutDashboard, group: "Overview" },
  { href: "/admin/schools/new", label: "Register School", icon: Plus,            group: "Management" },
  { href: "/admin/admins/new",  label: "Create Admin",    icon: Users,           group: "Management" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role !== "super_admin") router.replace("/login");
        else setUser(d.user);
      });
  }, [router]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  /* group items */
  const groups: Record<string, typeof navItems> = {};
  for (const item of navItems) {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="fixed top-4 left-4 z-50 lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-md"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] flex-col overflow-hidden",
          "bg-gradient-to-b from-slate-950 via-violet-950 to-purple-950 text-white",
          "transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
        style={{ borderRight: "1px solid rgba(255,255,255,.06)" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl p-2.5 flex items-center justify-center" style={{ background: "rgba(139,92,246,.25)", border: "1px solid rgba(139,92,246,.4)" }}>
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-white leading-tight">{t("nav.superAdmin")}</h1>
              <p className="truncate text-xs text-violet-300 leading-tight mt-0.5">{t("nav.allSchoolsControl")}</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-violet-400/60">
                {group}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group",
                        isActive
                          ? "bg-white/[.12] text-white"
                          : "text-violet-200 hover:bg-white/[.07] hover:text-white"
                      )}
                    >
                      <span
                        className={cn("shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all", isActive ? "text-white" : "text-white/50 group-hover:text-white/80")}
                        style={isActive ? { background: "rgba(139,92,246,.3)" } : {}}
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="flex-1 truncate leading-tight">{item.label}</span>
                      {isActive && <ChevronRight className="shrink-0 h-3.5 w-3.5 text-white/40" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 p-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <LanguageSwitcher variant="sidebar" />
          {user && (
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,.07)" }}>
              <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white uppercase" style={{ background: "#8b5cf6" }}>
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{user.name}</p>
                <p className="truncate text-[11px] text-violet-300">{user.email}</p>
              </div>
              <Settings className="shrink-0 h-3.5 w-3.5 text-white/30" />
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-white/60 hover:text-white hover:bg-red-500/20 transition-all"
          >
            <LogOut className="h-4 w-4" /> {t("common.logout")}
          </button>
        </div>
      </aside>

      <main className="lg:pl-[260px]">
        <div className="p-4 lg:p-6 pt-16 lg:pt-6 max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
