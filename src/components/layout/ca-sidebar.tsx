"use client";

import { PortalSidebar, PortalLayout } from "@/components/layout/portal-sidebar";
import {
  LayoutDashboard,
  Calculator,
  FileSearch,
  ShieldCheck,
  BookOpen,
  BarChart3,
  ClipboardList,
  Briefcase,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { CaSchoolSwitcher } from "@/components/ca/school-switcher";

export function CaLayout({ children }: { children: React.ReactNode }) {
  const t = useT();

  const navItems = [
    { href: "/ca", label: t("caNav.dashboard"), icon: LayoutDashboard, group: "Overview" },
    { href: "/accounting", label: t("caNav.booksOfAccount"), icon: BookOpen, group: "Accounts" },
    { href: "/accounting/vouchers", label: t("caNav.voucherRegister"), icon: ClipboardList, group: "Accounts" },
    { href: "/accounting/trial-balance", label: t("caNav.trialBalance"), icon: BarChart3, group: "Reports" },
    { href: "/accounting/reports", label: t("caNav.financialReports"), icon: Calculator, group: "Reports" },
    { href: "/ca/audit", label: t("caNav.auditReview"), icon: FileSearch, group: "Audit" },
    { href: "/ca/verify", label: t("caNav.verifyVouchers"), icon: ShieldCheck, group: "Audit" },
  ];

  return (
    <PortalLayout
      profileHref="/profile"
      shellClassName="bg-[linear-gradient(180deg,#fffbeb_0%,#fef9c3_35%,#f8fafc_100%)]"
    >
      <PortalSidebar
        title={t("caNav.title")}
        subtitle={t("caNav.subtitle")}
        theme="ca"
        navItems={navItems}
        homeHref="/ca"
        roleIcon={Briefcase}
        footerExtra={<CaSchoolSwitcher />}
      />
      <main className="lg:pl-[260px] min-h-screen">
        <div className="mx-auto max-w-[1600px] px-4 pb-8 pt-[4.75rem] lg:px-7 lg:pb-10">{children}</div>
      </main>
    </PortalLayout>
  );
}
