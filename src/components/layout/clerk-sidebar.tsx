"use client";

import { PortalSidebar, PortalLayout } from "@/components/layout/portal-sidebar";
import {
  LayoutDashboard, Users, Send, Upload, ClipboardCheck,
  FileCheck, Calculator, FileText, UserCheck,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export function ClerkLayout({ children }: { children: React.ReactNode }) {
  const t = useT();

  const navItems = [
    { href: "/clerk",             label: t("clerkNav.dashboard"),        icon: LayoutDashboard, group: "Overview" },
    { href: "/clerk/scholarship", label: t("clerkNav.scholarship"),      icon: FileCheck,       group: "Scholarship" },
    { href: "/students",          label: t("clerkNav.allStudents"),      icon: Users,           group: "Scholarship" },
    { href: "/admissions",        label: t("clerkNav.admissionVerify"),  icon: ClipboardCheck,  group: "Scholarship" },
    { href: "/import",            label: t("clerkNav.bulkImport"),       icon: Upload,          group: "Operations" },
    { href: "/bulk-submit",       label: t("clerkNav.bulkSubmit"),       icon: Send,            group: "Operations" },
    { href: "/accounting",        label: t("clerkNav.accounting"),       icon: Calculator,      group: "Finance" },
    { href: "/certificates",      label: t("clerkNav.certificates"),     icon: FileText,        group: "Documents" },
  ];

  return (
    <PortalLayout>
      <PortalSidebar
        title={t("clerkNav.title")}
        subtitle={t("clerkNav.subtitle")}
        theme="amber"
        navItems={navItems}
        homeHref="/clerk"
        roleIcon={UserCheck}
      />
      <main className="lg:pl-[260px]">
        <div className="p-4 lg:p-6 pt-16 lg:pt-6 max-w-[1600px]">{children}</div>
      </main>
    </PortalLayout>
  );
}
