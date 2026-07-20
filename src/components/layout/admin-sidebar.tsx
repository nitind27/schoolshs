"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Shield,
  Users,
  Plus,
  Menu,
  X,
  LayoutDashboard,
  ChevronRight,
  School,
  FileText,
  CreditCard,
  Building2,
  Mail,
  Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";
import { TopNavbar } from "@/components/layout/top-navbar";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { href: "/admin/schools", label: "All Schools", icon: Building2, group: "Management" },
  { href: "/admin/schools/new", label: "Register School", icon: Plus, group: "Management" },
  { href: "/admin/admins", label: "School Admins", icon: Users, group: "Management" },
  { href: "/admin/admins/new", label: "Create Admin", icon: School, group: "Management" },
  { href: "/admin/contracts", label: "Contracts", icon: FileText, group: "Billing" },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, group: "Billing" },
  { href: "/admin/contact-support", label: "Contact Support", icon: Headphones, group: "System" },
  { href: "/admin/settings/email", label: "Email / SMTP", icon: Mail, group: "System" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role !== "super_admin") router.replace("/login");
      });
  }, [router]);

  const groups: Record<string, typeof navItems> = {};
  for (const item of navItems) {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  }

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f1f5f9_0%,#e0f2fe_40%,#f8fafc_100%)]">
      <TopNavbar showProfile={false} sidebarWidth={270} />

      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="fixed top-2.5 left-3 z-50 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-md lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[270px] flex-col overflow-hidden",
          "bg-gradient-to-b from-slate-950 via-slate-900 to-sky-950 text-white",
          "transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
        style={{ borderRight: "1px solid rgba(255,255,255,.06)" }}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-2 px-4 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,.08)" }}
        >
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <div
              className="flex shrink-0 items-center justify-center rounded-xl p-2.5"
              style={{ background: "rgba(14,165,233,.22)", border: "1px solid rgba(125,211,252,.35)" }}
            >
              <Shield className="h-5 w-5 text-sky-100" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold leading-tight text-white">{t("nav.superAdmin")}</h1>
              <p className="mt-0.5 truncate text-xs leading-tight text-sky-300/80">{t("nav.allSchoolsControl")}</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="shrink-0 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-sky-400/55">
                {group}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                        active ? "bg-white/[.12] text-white shadow-sm" : "text-sky-100/80 hover:bg-white/[.07] hover:text-white"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
                          active ? "text-white" : "text-white/50 group-hover:text-white/80"
                        )}
                        style={active ? { background: "rgba(14,165,233,.35)" } : {}}
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="flex-1 truncate leading-tight">{item.label}</span>
                      {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/40" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className="min-h-screen lg:pl-[270px]">
        <div className="mx-auto max-w-[1600px] px-4 pb-8 pt-[4.75rem] lg:px-7 lg:pb-10">{children}</div>
      </main>
    </div>
  );
}
