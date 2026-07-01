"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Upload,
  Send,
  Download,
  GraduationCap,
  Menu,
  X,
  BookOpen,
  Briefcase,
  CreditCard,
  LogOut,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useT } from "@/i18n/locale-provider";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; schoolName?: string | null; role: string } | null>(null);

  const navItems = [
    { href: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/students", label: t("nav.students"), icon: Users },
    { href: "/classes", label: t("nav.classes"), icon: BookOpen },
    { href: "/staff", label: t("nav.staff"), icon: Briefcase },
    { href: "/id-cards", label: t("nav.idCards"), icon: CreditCard },
    { href: "/students/new", label: t("nav.addStudent"), icon: UserPlus },
    { href: "/import", label: t("nav.bulkImport"), icon: Upload },
  { href: "/bulk-submit", label: t("nav.bulkSubmit"), icon: Send },
  { href: "/auto-apply", label: t("nav.autoApply"), icon: Bot },
  { href: "/export", label: t("nav.exportData"), icon: Download },
  ];

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.role === "super_admin") router.replace("/admin");
        else setUser(d.user);
      });
  }, [router]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-white border border-slate-200 shadow-sm"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col overflow-hidden bg-gradient-to-b from-blue-900 to-blue-950 text-white transform transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-blue-800 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-lg bg-white/10 p-2">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight">
                {user?.schoolName || t("common.scholarship")}
              </h1>
              <p className="truncate text-xs text-blue-300">{t("common.digitalGujaratPortal")}</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="shrink-0 p-1 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-blue-200 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1 line-clamp-2 leading-snug">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-blue-800 p-4">
          <LanguageSwitcher variant="sidebar" />
          {user && (
            <div className="rounded-lg bg-white/10 p-3 text-xs text-blue-200">
              <p className="truncate font-medium text-white">{user.name}</p>
              <p className="truncate">{user.schoolName}</p>
            </div>
          )}
          <Button variant="outline" size="sm" className="w-full text-blue-900" onClick={logout}>
            <LogOut className="h-4 w-4" /> {t("common.logout")}
          </Button>
        </div>
      </aside>
    </>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
