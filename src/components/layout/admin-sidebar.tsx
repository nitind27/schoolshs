"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Shield,
  Users,
  Plus,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useT } from "@/i18n/locale-provider";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  const navItems = [
    { href: "/admin", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/admin/schools/new", label: t("nav.addSchool"), icon: Plus },
    { href: "/admin/admins/new", label: t("nav.createAdmin"), icon: Users },
  ];

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role !== "super_admin") {
          router.replace("/login");
        } else {
          setUser(d.user);
        }
      });
  }, [router]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-white border shadow-sm"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col overflow-hidden bg-gradient-to-b from-violet-900 to-purple-950 text-white transform transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-violet-800 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Shield className="h-7 w-7 shrink-0" />
            <div className="min-w-0">
              <h1 className="truncate font-bold">{t("nav.superAdmin")}</h1>
              <p className="truncate text-xs text-violet-300">{t("nav.allSchoolsControl")}</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="shrink-0 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active ? "bg-white/15 text-white" : "text-violet-200 hover:bg-white/10"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1 line-clamp-2 leading-snug">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-violet-800 p-4">
          <LanguageSwitcher variant="sidebar" />
          {user && (
            <div className="mb-1 px-1 text-xs text-violet-200">
              <p className="truncate font-medium text-white">{user.name}</p>
              <p className="truncate">{user.email}</p>
            </div>
          )}
          <Button variant="outline" size="sm" className="w-full text-violet-900" onClick={logout}>
            <LogOut className="h-4 w-4" /> {t("common.logout")}
          </Button>
        </div>
      </aside>

      <main className="lg:pl-64">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
