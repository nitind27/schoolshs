"use client";

import { PortalSidebar, PortalLayout } from "@/components/layout/portal-sidebar";
import { LayoutDashboard, User, Award, FileText, GraduationCap, FileCheck } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const t = useT();

  const navItems = [
    { href: "/student",             label: t("studentNav.dashboard"),       icon: LayoutDashboard, group: "My Portal" },
    { href: "/student/profile",     label: t("studentNav.myProfile"),       icon: User,            group: "My Portal" },
    { href: "/student/scholarship", label: t("studentNav.scholarshipStatus"),icon: FileCheck,       group: "Scholarship" },
    { href: "/student/documents",   label: t("studentNav.documents"),       icon: FileText,        group: "Scholarship" },
    { href: "/student/results",     label: t("studentNav.myResults"),       icon: Award,           group: "Academics" },
    { href: "/student/board",       label: t("studentNav.boardRecords"),    icon: GraduationCap,   group: "Academics" },
  ];

  return (
    <PortalLayout>
      <PortalSidebar
        title={t("studentNav.title")}
        subtitle={t("studentNav.subtitle")}
        theme="sky"
        navItems={navItems}
        homeHref="/student"
        roleIcon={GraduationCap}
      />
      <main className="lg:pl-[260px]">
        <div className="p-4 lg:p-6 pt-16 lg:pt-6 max-w-[1200px] mx-auto">{children}</div>
      </main>
    </PortalLayout>
  );
}
