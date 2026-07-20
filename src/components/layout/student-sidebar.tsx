"use client";

import { PortalSidebar, PortalLayout } from "@/components/layout/portal-sidebar";
import { LayoutDashboard, Award, FileText, GraduationCap, FileCheck, User } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const t = useT();

  const navItems = [
    { href: "/student", label: t("studentNav.dashboard"), icon: LayoutDashboard, group: t("studentNav.groupPortal") },
    { href: "/student/profile", label: t("studentNav.myProfile"), icon: User, group: t("studentNav.groupPortal") },
    { href: "/student/scholarship", label: t("studentNav.scholarshipStatus"), icon: FileCheck, group: t("studentNav.groupScholarship") },
    { href: "/student/documents", label: t("studentNav.documents"), icon: FileText, group: t("studentNav.groupScholarship") },
    { href: "/student/results", label: t("studentNav.myResults"), icon: Award, group: t("studentNav.groupAcademics") },
    { href: "/student/board", label: t("studentNav.boardRecords"), icon: GraduationCap, group: t("studentNav.groupAcademics") },
  ];

  return (
    <PortalLayout profileHref="/student/profile" shellClassName="student-portal-shell">
      <PortalSidebar
        title={t("studentNav.title")}
        subtitle={t("studentNav.subtitle")}
        theme="student"
        navItems={navItems}
        homeHref="/student"
        roleIcon={GraduationCap}
      />
      <main className="lg:pl-[260px]">
        <div className="student-portal-pages mx-auto max-w-[1100px] px-4 pb-6 pt-[4.75rem] lg:px-6">
          {children}
        </div>
      </main>
    </PortalLayout>
  );
}
