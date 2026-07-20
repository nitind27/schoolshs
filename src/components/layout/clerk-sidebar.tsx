"use client";

import { PortalSidebar, PortalLayout } from "@/components/layout/portal-sidebar";
import type { NavEntry } from "@/components/layout/sidebar-nav";
import {
  LayoutDashboard,
  Users,
  Send,
  Upload,
  ClipboardCheck,
  FileCheck,
  Calculator,
  FileText,
  UserCheck,
  BookOpen,
  CalendarDays,
  Download,
  CreditCard,
  Briefcase,
  School,
  UserPlus,
  Bot,
  Award,
  FileSearch,
  ClipboardList,
  IndianRupee,
  CalendarClock,
  FolderOpen,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import "@/components/clerk/clerk-portal.css";

/** Clerk nav — few top menus + collapsible submenus (easy to scan). */
export function ClerkLayout({ children }: { children: React.ReactNode }) {
  const t = useT();

  const navEntries: NavEntry[] = [
    {
      type: "link",
      href: "/clerk",
      label: t("clerkNav.dashboard"),
      icon: LayoutDashboard,
    },
    {
      type: "submenu",
      id: "academics",
      label: t("clerkNav.groupAcademics"),
      icon: School,
      children: [
        { href: "/classes", label: t("nav.classes"), icon: School },
        { href: "/students", label: t("nav.studentsAll"), icon: Users },
        { href: "/students/new", label: t("nav.addStudent"), icon: UserPlus },
        { href: "/admissions", label: t("navExt.admissions"), icon: ClipboardCheck },
        { href: "/attendance", label: t("navExt.studentAttendance"), icon: CalendarDays },
        { href: "/timetable", label: t("navExt.timetable"), icon: CalendarClock },
        { href: "/results", label: t("navExt.results"), icon: Award },
        { href: "/students/board-records", label: t("navExt.boardRecords"), icon: FileSearch },
      ],
    },
    {
      type: "submenu",
      id: "staff",
      label: t("clerkNav.groupStaff"),
      icon: Briefcase,
      children: [
        { href: "/staff", label: t("nav.staffAll"), icon: Users },
        { href: "/staff/new", label: t("nav.staffAdd"), icon: UserPlus },
        { href: "/staff/attendance", label: t("nav.staffAttendance"), icon: ClipboardList },
        { href: "/staff/payroll", label: t("nav.staffPayroll"), icon: IndianRupee },
        { href: "/staff/register", label: t("staffRegister.title"), icon: FileText },
        { href: "/staff/salary-statement", label: t("salaryStatement.title"), icon: Calculator },
        { href: "/staff/salary-slip", label: t("salarySlip.title"), icon: CreditCard },
        { href: "/staff/income-tax", label: t("incomeTax.title"), icon: Calculator },
        { href: "/staff/salary-ledger", label: t("salaryLedger.title"), icon: BookOpen },
      ],
    },
    {
      type: "submenu",
      id: "scholarship",
      label: t("clerkNav.groupScholarship"),
      icon: FileCheck,
      children: [
        { href: "/clerk/scholarship", label: t("clerkNav.scholarship"), icon: FileCheck },
        { href: "/import", label: t("nav.bulkImport"), icon: Upload },
        { href: "/bulk-submit", label: t("nav.bulkSubmit"), icon: Send },
        { href: "/auto-apply", label: t("nav.autoApply"), icon: Bot },
        { href: "/export", label: t("nav.exportData"), icon: Download },
      ],
    },
    {
      type: "submenu",
      id: "finance-docs",
      label: t("clerkNav.groupFinanceDocs"),
      icon: FolderOpen,
      children: [
        { href: "/accounting", label: t("navExt.accounting"), icon: Calculator },
        { href: "/certificates", label: t("navExt.certificates"), icon: FileText },
        { href: "/certificates/general-register", label: t("navExt.generalRegister"), icon: BookOpen },
        { href: "/id-cards", label: t("nav.idCards"), icon: CreditCard },
      ],
    },
  ];

  return (
    <PortalLayout profileHref="/profile" shellClassName="clerk-portal-shell">
      <PortalSidebar
        title={t("clerkNav.title")}
        subtitle={t("clerkNav.subtitle")}
        theme="clerk"
        navEntries={navEntries}
        homeHref="/clerk"
        roleIcon={UserCheck}
      />
      <main className="lg:pl-[260px]">
        <div className="mx-auto max-w-[1600px] px-4 pb-5 pt-[4.75rem] lg:px-6 lg:pb-7">{children}</div>
      </main>
    </PortalLayout>
  );
}
