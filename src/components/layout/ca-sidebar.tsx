"use client";

import { PortalSidebar, PortalLayout } from "@/components/layout/portal-sidebar";
import {
  LayoutDashboard, Calculator, FileSearch, ShieldCheck,
  BookOpen, BarChart3, ClipboardList, Briefcase,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export function CaLayout({ children }: { children: React.ReactNode }) {
  const t = useT();

  const navItems = [
    { href: "/ca",                      label: t("caNav.dashboard"),        icon: LayoutDashboard, group: "Overview" },
    { href: "/accounting",              label: t("caNav.booksOfAccount"),   icon: BookOpen,        group: "Accounts" },
    { href: "/accounting/vouchers",     label: t("caNav.voucherRegister"),  icon: ClipboardList,   group: "Accounts" },
    { href: "/accounting/trial-balance",label: t("caNav.trialBalance"),     icon: BarChart3,       group: "Reports" },
    { href: "/accounting/reports",      label: t("caNav.financialReports"), icon: Calculator,      group: "Reports" },
    { href: "/ca/audit",                label: t("caNav.auditReview"),      icon: FileSearch,      group: "Audit" },
    { href: "/ca/verify",               label: t("caNav.verifyVouchers"),   icon: ShieldCheck,     group: "Audit" },
  ];

  return (
    <PortalLayout>
      <PortalSidebar
        title={t("caNav.title")}
        subtitle={t("caNav.subtitle")}
        theme="violet"
        navItems={navItems}
        homeHref="/ca"
        roleIcon={Briefcase}
      />
      <main className="lg:pl-[260px]">
        <div className="p-4 lg:p-6 pt-16 lg:pt-6 max-w-[1600px]">{children}</div>
      </main>
    </PortalLayout>
  );
}
