"use client";

import { PortalSidebar, PortalLayout } from "@/components/layout/portal-sidebar";
import {
  LayoutDashboard,
  Users,
  FileText,
  Award,
  BookMarked,
  ClipboardList,
  CalendarClock,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import "@/components/teacher/teacher-portal.css";

export function TeacherLayout({ children }: { children: React.ReactNode }) {
  const t = useT();

  const navItems = [
    { href: "/teacher", label: t("teacherNav.dashboard"), icon: LayoutDashboard, group: t("teacherNav.groupOverview") },
    { href: "/teacher/attendance", label: t("teacherNav.attendance"), icon: ClipboardList, group: t("teacherNav.groupMyWork") },
    { href: "/teacher/timetable", label: t("timetable.myTimetable"), icon: CalendarClock, group: t("teacherNav.groupMyWork") },
    { href: "/teacher/students", label: t("teacherNav.students"), icon: Users, group: t("teacherNav.groupMyWork") },
    { href: "/results", label: t("teacherNav.results"), icon: Award, group: t("teacherNav.groupAcademics") },
    { href: "/teacher/board-records", label: t("teacherNav.boardRecords"), icon: FileText, group: t("teacherNav.groupAcademics") },
  ];

  return (
    <PortalLayout profileHref="/profile" shellClassName="teacher-portal-shell">
      <PortalSidebar
        title={t("teacherNav.title")}
        subtitle={t("teacherNav.subtitle")}
        theme="teacher"
        navItems={navItems}
        homeHref="/teacher"
        roleIcon={BookMarked}
      />
      <main className="lg:pl-[260px]">
        <div className="max-w-[1600px] px-4 pb-4 pt-[4.75rem] lg:px-6 lg:pb-6">{children}</div>
      </main>
    </PortalLayout>
  );
}
