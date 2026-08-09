"use client";

import {
  PortalSidebar,
  PortalLayout,
} from "@/components/layout/portal-sidebar";
import {
  LayoutDashboard,
  Users,
  FileText,
  Award,
  BookMarked,
  ClipboardList,
  CalendarClock,
  Hash,
  Armchair,
  CalendarDays,
  PartyPopper,
  GraduationCap,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { hrefToFeature, isFeatureEnabled } from "@/lib/school-features";
import { useSchoolFeatures } from "@/components/school/use-school-features";
import "@/components/teacher/teacher-portal.css";

export function TeacherLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const { features } = useSchoolFeatures();

  const navItems = [
    {
      href: "/teacher",
      label: t("teacherNav.dashboard"),
      icon: LayoutDashboard,
      group: t("teacherNav.groupOverview"),
    },
    {
      href: "/teacher/attendance",
      label: t("teacherNav.attendance"),
      icon: ClipboardList,
      group: t("teacherNav.groupMyWork"),
    },
    {
      href: "/teacher/timetable",
      label: t("timetable.myTimetable"),
      icon: CalendarClock,
      group: t("teacherNav.groupMyWork"),
    },
    {
      href: "/teacher/students",
      label: t("teacherNav.students"),
      icon: Users,
      group: t("teacherNav.groupMyWork"),
    },
    {
      href: "/teacher/roll-numbers",
      label: t("teacherNav.rollNumbers"),
      icon: Hash,
      group: t("teacherNav.groupMyWork"),
    },
    {
      href: "/teacher/exam-seat-numbers",
      label: t("teacherNav.examSeats"),
      icon: Armchair,
      group: t("teacherNav.groupMyWork"),
    },
    {
      href: "/teacher/board-records?view=entry&std=10",
      label: t("teacherNav.boardSeats"),
      icon: GraduationCap,
      group: t("teacherNav.groupMyWork"),
    },
    {
      href: "/results",
      label: t("teacherNav.results"),
      icon: Award,
      group: t("teacherNav.groupAcademics"),
    },
    {
      href: "/teacher/board-records",
      label: t("teacherNav.boardRecords"),
      icon: FileText,
      group: t("teacherNav.groupAcademics"),
    },
    {
      href: "/teacher/holidays",
      label: t("nav.staffHolidays"),
      icon: CalendarDays,
      group: t("teacherNav.groupAcademics"),
    },
    {
      href: "/teacher/activities",
      label: t("teacherNav.activities"),
      icon: PartyPopper,
      group: t("teacherNav.groupAcademics"),
    },
  ];

  const filteredItems = features
    ? navItems.filter((item) => {
        const key = hrefToFeature(item.href);
        return !key || isFeatureEnabled(features, key);
      })
    : navItems;

  return (
    <PortalLayout profileHref="/profile" shellClassName="teacher-portal-shell">
      <PortalSidebar
        title={t("teacherNav.title")}
        subtitle={t("teacherNav.subtitle")}
        theme="teacher"
        navItems={filteredItems}
        homeHref="/teacher"
        roleIcon={BookMarked}
      />
      <main className="shell-main">
        <div className="max-w-[1600px] px-4 pb-4 pt-[4.75rem] lg:px-6 lg:pb-6">
          {children}
        </div>
      </main>
    </PortalLayout>
  );
}
