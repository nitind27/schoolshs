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
  FolderKanban,
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
import "@/components/layout/admin-shell.css";

type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  groupKey: string;
};

/** Flow-ordered nav — create actions live on list/home pages, not duplicated here */
const NAV_ITEMS: NavItem[] = [
  {
    href: "/admin",
    labelKey: "admin.navHome",
    icon: LayoutDashboard,
    groupKey: "admin.navGroupHome",
  },
  {
    href: "/admin/schools",
    labelKey: "admin.navSchools",
    icon: Building2,
    groupKey: "admin.navGroupSchools",
  },
  {
    href: "/admin/formats",
    labelKey: "admin.navFormats",
    icon: FolderKanban,
    groupKey: "admin.navGroupSchools",
  },
  {
    href: "/admin/admins",
    labelKey: "admin.navAdmins",
    icon: Users,
    groupKey: "admin.navGroupPeople",
  },
  {
    href: "/admin/payments",
    labelKey: "admin.navPayments",
    icon: CreditCard,
    groupKey: "admin.navGroupMoney",
  },
  {
    href: "/admin/contracts",
    labelKey: "admin.navContracts",
    icon: FileText,
    groupKey: "admin.navGroupMoney",
  },
  {
    href: "/admin/contact-support",
    labelKey: "admin.navSupport",
    icon: Headphones,
    groupKey: "admin.navGroupSystem",
  },
  {
    href: "/admin/login-activity",
    labelKey: "admin.navLoginActivity",
    icon: Activity,
    groupKey: "admin.navGroupSystem",
  },
  {
    href: "/admin/settings/email",
    labelKey: "admin.navEmail",
    icon: Mail,
    groupKey: "admin.navGroupSystem",
  },
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
  const year = new Date().getFullYear();

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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const groups = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const key of GROUP_ORDER) map.set(key, []);
    for (const item of NAV_ITEMS) {
      const list = map.get(item.groupKey) || [];
      list.push(item);
      map.set(item.groupKey, list);
    }
    return GROUP_ORDER.map((key) => ({
      key,
      items: map.get(key) || [],
    })).filter((g) => g.items.length > 0);
  }, []);

  return (
    <div className="admin-shell">
      <TopNavbar showProfile={false} sidebarWidth={width} variant="admin" />

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="admin-menu-btn lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="admin-backdrop lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        data-collapsed={collapsed && !mobileOpen ? "true" : "false"}
        className={cn(
          "shell-aside admin-aside fixed inset-y-0 left-0 z-50 flex h-screen flex-col overflow-hidden",
          "transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          width: mobileOpen ? SIDEBAR_ADMIN_EXPANDED_W : width,
        }}
      >
        <div className="admin-brand shell-brand">
          <Link
            href="/admin"
            className="admin-brand__link"
            title={t("nav.superAdmin")}
          >
            <div className="admin-brand__mark">
              <Shield className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="admin-brand__text shell-brand-text">
              <p className="admin-brand__kicker">{t("admin.shellKicker")}</p>
              <h1 className="admin-brand__title">{t("nav.superAdmin")}</h1>
              <p className="admin-brand__sub">{t("nav.allSchoolsControl")}</p>
            </div>
          </Link>
          <div className="admin-brand__actions">
            <SidebarCollapseHeaderBtn />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="admin-brand__close lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="admin-nav shell-nav">
          {groups.map(({ key, items }) => (
            <div key={key} className="admin-nav__group">
              <p className="admin-nav__label shell-group-label">{t(key)}</p>
              <div>
                {items.map((item) => {
                  const active = pathIsActive(pathname, item.href);
                  const label = t(item.labelKey);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed && !mobileOpen ? label : undefined}
                      data-active={active ? "true" : "false"}
                      className={cn(
                        "admin-nav__link shell-nav-link",
                        collapsed && !mobileOpen && "justify-center",
                      )}
                    >
                      <span className="admin-nav__ico">
                        <item.icon className="h-[17px] w-[17px]" />
                      </span>
                      <span className="admin-nav__text shell-nav-label">
                        {label}
                      </span>
                      {active && (
                        <ChevronRight className="admin-nav__chevron shell-nav-chevron h-3.5 w-3.5" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="admin-side-foot shell-footer">
          <div className="admin-side-foot__status">
            <span className="admin-side-foot__pulse" aria-hidden />
            <div className="admin-side-foot__status-copy">
              <strong>{t("admin.shellSystemOnline")}</strong>
              <span>{t("admin.shellControlCenter")}</span>
            </div>
          </div>
          <SidebarCollapseToggle />
        </div>
      </aside>

      <main className="shell-main admin-main">
        <div className="admin-main__body">{children}</div>

        <footer className="admin-page-footer">
          <div className="admin-page-footer__inner">
            <div className="admin-page-footer__brand">
              <span className="admin-page-footer__mark">
                <Shield className="h-3.5 w-3.5" />
              </span>
              <div className="admin-page-footer__copy">
                <strong>{t("admin.shellFooterBrand")}</strong>
                <span>{t("admin.shellFooterNote")}</span>
              </div>
            </div>
            <div className="admin-page-footer__meta">
              <span className="admin-page-footer__pill admin-page-footer__pill--live">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                  aria-hidden
                />
                {t("admin.shellLive")}
              </span>
              <span className="admin-page-footer__pill">
                {t("admin.shellFooterYear", { year: String(year) })}
              </span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
