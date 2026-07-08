"use client";

import { PortalSidebar, PortalLayout } from "@/components/layout/portal-sidebar";
import { LayoutDashboard, Users, BookOpen, ClipboardCheck, FileText, Award, BookMarked } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export function TeacherLayout({ children }: { children: React.ReactNode }) {
  const t = useT();

  const navItems = [
    { href: "/teacher",               label: t("teacherNav.dashboard"),    icon: LayoutDashboard, group: "Overview" },
    { href: "/teacher/my-class",      label: t("teacherNav.myClass"),      icon: BookOpen,        group: "My Work" },
    { href: "/teacher/students",      label: t("teacherNav.students"),     icon: Users,           group: "My Work" },
    { href: "/results",               label: t("teacherNav.results"),      icon: Award,           group: "Academics" },
    { href: "/results/entry",         label: t("teacherNav.marksEntry"),   icon: ClipboardCheck,  group: "Academics" },
    { href: "/teacher/board-records", label: t("teacherNav.boardRecords"), icon: FileText,        group: "Academics" },
  ];

  return (
    <PortalLayout>
      <PortalSidebar
        title={t("teacherNav.title")}
        subtitle={t("teacherNav.subtitle")}
        theme="emerald"
        navItems={navItems}
        homeHref="/teacher"
        roleIcon={BookMarked}
      />
      <main className="lg:pl-[260px]">
        <div className="p-4 lg:p-6 pt-16 lg:pt-6 max-w-[1600px]">{children}</div>
      </main>
    </PortalLayout>
  );
}
