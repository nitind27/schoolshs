"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Shield,
  Users,
  Menu,
  X,
  LayoutDashboard,
  ChevronRight,
  FileText,
  CreditCard,
  Building2,
  Mail,
  Headphones,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";
import { TopNavbar } from "@/components/layout/top-navbar";
import {
  SIDEBAR_ADMIN_EXPANDED_W,
  SidebarCollapseHeaderBtn,
  SidebarCollapseToggle,
  useSidebarCollapse,
} from "@/components/layout/sidebar-collapse";
import "@/components/layout/sidebar-shell.css";

type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  groupKey: string;
};

/** Flow-ordered nav — create actions live on list/home pages, not duplicated here */
const NAV_ITEMS: NavItem[] = [
  { href: "/admin", labelKey: "admin.navHome", icon: LayoutDashboard, groupKey: "admin.navGroupHome" },
  { href: "/admin/schools", labelKey: "admin.navSchools", icon: Building2, groupKey: "admin.navGroupSchools" },
  { href: "/admin/admins", labelKey: "admin.navAdmins", icon: Users, groupKey: "admin.navGroupPeople" },
  { href: "/admin/payments", labelKey: "admin.navPayments", icon: CreditCard, groupKey: "admin.navGroupMoney" },
  { href: "/admin/contracts", labelKey: "admin.navContracts", icon: FileText, groupKey: "admin.navGroupMoney" },
  { href: "/admin/contact-support", labelKey: "admin.navSupport", icon: Headphones, groupKey: "admin.navGroupSystem" },
  { href: "/admin/login-activity", labelKey: "admin.navLoginActivity", icon: Activity, groupKey: "admin.navGroupSystem" },
  { href: "/admin/settings/email", labelKey: "admin.navEmail", icon: Mail, groupKey: "admin.navGroupSystem" },
];

const GROUP_ORDER = [
  "admin.navGroupHome",
  "admin.navGroupSchools",
  "admin.navGroupPeople",
  "admin.navGroupMoney",
  "admin.navGroupSystem",
] as const;

function pathIsActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const { collapsed, widthFor } = useSidebarCollapse();
  const width = widthFor(SIDEBAR_ADMIN_EXPANDED_W);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role !== "super_admin") router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    document.documentElement.style.setProperty("--shell-sidebar-w", `${width}px`);
  }, [width]);

  const groups = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const key of GROUP_ORDER) map.set(key, []);
    for (const item of NAV_ITEMS) {
      const list = map.get(item.groupKey) || [];
      list.push(item);
      map.set(item.groupKey, list);
    }
    return GROUP_ORDER.map((key) => ({ key, items: map.get(key) || [] })).filter((g) => g.items.length > 0);
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f1f5f9_0%,#e0f2fe_40%,#f8fafc_100%)]">
      <TopNavbar showProfile={false} sidebarWidth={width} />

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="fixed top-2.5 left-3 z-50 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-md lg:hidden cursor-pointer"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        data-collapsed={collapsed && !mobileOpen ? "true" : "false"}
        className={cn(
          "shell-aside fixed inset-y-0 left-0 z-50 flex h-screen flex-col overflow-hidden",
          "bg-gradient-to-b from-slate-950 via-slate-900 to-sky-950 text-white",
          "transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
        style={{
          width: mobileOpen ? SIDEBAR_ADMIN_EXPANDED_W : width,
          borderRight: "1px solid rgba(255,255,255,.06)",
        }}
      >
        <div
          className="shell-brand flex shrink-0 items-center justify-between gap-2 px-3 py-3.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,.08)" }}
        >
          <Link href="/admin" className="flex min-w-0 items-center gap-3" title={t("nav.superAdmin")}>
            <div
              className="flex shrink-0 items-center justify-center rounded-xl p-2.5"
              style={{ background: "rgba(14,165,233,.22)", border: "1px solid rgba(125,211,252,.35)" }}
            >
              <Shield className="h-5 w-5 text-sky-100" />
            </div>
            <div className="shell-brand-text min-w-0">
              <h1 className="truncate text-sm font-bold leading-tight text-white">{t("nav.superAdmin")}</h1>
              <p className="mt-0.5 truncate text-xs leading-tight text-sky-300/80">{t("nav.allSchoolsControl")}</p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <SidebarCollapseHeaderBtn />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="shrink-0 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="shell-nav min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-2.5 py-3">
          {groups.map(({ key, items }) => (
            <div key={key}>
              <p className="shell-group-label mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-sky-400/55">
                {t(key)}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = pathIsActive(pathname, item.href);
                  const label = t(item.labelKey);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed && !mobileOpen ? label : undefined}
                      className={cn(
                        "shell-nav-link group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                        active ? "bg-white/[.12] text-white shadow-sm" : "text-sky-100/80 hover:bg-white/[.07] hover:text-white",
                        collapsed && !mobileOpen && "justify-center px-2",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
                          active ? "text-white" : "text-white/50 group-hover:text-white/80",
                        )}
                        style={active ? { background: "rgba(14,165,233,.35)" } : {}}
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="shell-nav-label flex-1 truncate leading-tight">{label}</span>
                      {active && <ChevronRight className="shell-nav-chevron h-3.5 w-3.5 shrink-0 text-white/40" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shell-footer shrink-0 px-2.5 py-2" style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <SidebarCollapseToggle />
        </div>
      </aside>

      <main className="shell-main min-h-screen">
        <div className="mx-auto max-w-[1200px] px-4 pb-8 pt-[4.75rem] lg:px-7 lg:pb-10">{children}</div>
      </main>
    </div>
  );
}
