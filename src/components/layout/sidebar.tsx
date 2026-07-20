"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, UserPlus, Upload, Send, Download,
  GraduationCap, Menu, X, BookOpen, Briefcase, CreditCard,
  Bot, Calculator, ClipboardCheck, Award, FileSearch,
  FileText, ClipboardList, IndianRupee,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  SidebarNavEntries,
  filterNavEntries,
  type NavEntry,
} from "@/components/layout/sidebar-nav";
import { useT } from "@/i18n/locale-provider";
import { isFeatureEnabled, type SchoolFeatureKey } from "@/lib/school-features";
import { TopNavbar } from "@/components/layout/top-navbar";

const useNavGroups = (t: (k: string) => string): { group: string; items: NavEntry[] }[] => [
  {
    group: "Overview",
    items: [
      { type: "link", href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard, featureKey: "dashboard" },
    ],
  },
  {
    group: "Academics",
    items: [
      { type: "link", href: "/classes", label: t("nav.classes"), icon: BookOpen, featureKey: "classes" },
      {
        type: "submenu",
        id: "students",
        label: t("nav.students"),
        icon: Users,
        featureKey: "students",
        children: [
          { href: "/students", label: t("nav.studentsAll"), icon: Users, featureKey: "students" },
          { href: "/students/new", label: t("nav.addStudent"), icon: UserPlus, featureKey: "students" },
        ],
      },
      {
        type: "submenu",
        id: "staff",
        label: t("nav.staff"),
        icon: Briefcase,
        featureKey: "staff",
        children: [
          { href: "/staff", label: t("nav.staffAll"), icon: Users, featureKey: "staff" },
          { href: "/staff/new", label: t("nav.staffAdd"), icon: UserPlus, featureKey: "staff" },
          { href: "/staff/attendance", label: t("nav.staffAttendance"), icon: ClipboardList, featureKey: "staff" },
          { href: "/staff/payroll", label: t("nav.staffPayroll"), icon: IndianRupee, featureKey: "staff" },
          { href: "/staff/register", label: t("staffRegister.title"), icon: FileText, featureKey: "staff" },
          { href: "/staff/salary-statement", label: t("salaryStatement.title"), icon: Calculator, featureKey: "staff" },
          { href: "/staff/salary-slip", label: t("salarySlip.title"), icon: CreditCard, featureKey: "staff" },
          { href: "/staff/income-tax", label: t("incomeTax.title"), icon: Calculator, featureKey: "staff" },
          { href: "/staff/salary-ledger", label: t("salaryLedger.title"), icon: BookOpen, featureKey: "staff" },
        ],
      },
      { type: "link", href: "/admissions", label: t("navExt.admissions"), icon: ClipboardCheck, featureKey: "admissions" },
      { type: "link", href: "/results", label: t("navExt.results"), icon: Award, featureKey: "results" },
      { type: "link", href: "/attendance", label: t("navExt.studentAttendance"), icon: ClipboardList, featureKey: "attendance" },
      { type: "link", href: "/timetable", label: t("navExt.timetable"), icon: CalendarClock, featureKey: "classes" },
    ],
  },
  {
    group: "Scholarship",
    items: [
      { type: "link", href: "/import", label: t("nav.bulkImport"), icon: Upload, featureKey: "scholarship_import" },
      { type: "link", href: "/bulk-submit", label: t("nav.bulkSubmit"), icon: Send, featureKey: "scholarship_bulk_submit" },
      { type: "link", href: "/auto-apply", label: t("nav.autoApply"), icon: Bot, featureKey: "scholarship_auto_apply" },
      { type: "link", href: "/export", label: t("nav.exportData"), icon: Download, featureKey: "scholarship_export" },
    ],
  },
  {
    group: "Admin",
    items: [
      { type: "link", href: "/accounting", label: t("navExt.accounting"), icon: Calculator, featureKey: "accounting" },
      { type: "link", href: "/students/board-records", label: t("navExt.boardRecords"), icon: FileSearch, featureKey: "board_records" },
      { type: "link", href: "/certificates", label: t("navExt.certificates"), icon: FileText, featureKey: "certificates" },
      { type: "link", href: "/certificates/general-register", label: t("navExt.generalRegister"), icon: BookOpen, featureKey: "certificates" },
      { type: "link", href: "/id-cards", label: t("nav.idCards"), icon: CreditCard, featureKey: "id_cards" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useT();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; schoolName?: string | null; role: string } | null>(null);
  const [enabledFeatures, setEnabledFeatures] = useState<SchoolFeatureKey[] | null>(null);
  const navGroups = useNavGroups(t);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/school/features").then((r) => (r.ok ? r.json() : null)),
    ]).then(([auth, features]) => {
      setUser(auth.user);
      if (features?.features) setEnabledFeatures(features.features);
    });
  }, []);

  const filteredGroups = navGroups
    .map((g) => ({
      ...g,
      items: filterNavEntries(g.items, enabledFeatures, isFeatureEnabled),
    }))
    .filter((g) => g.items.length > 0);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="fixed top-2.5 left-3 z-50 lg:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-md text-slate-700"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] flex-col overflow-hidden",
          "bg-gradient-to-b from-slate-900 via-blue-950 to-indigo-950 text-white",
          "transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
        style={{ borderRight: "1px solid rgba(255,255,255,.06)" }}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl p-2.5 flex items-center justify-center" style={{ background: "rgba(59,130,246,.25)", border: "1px solid rgba(59,130,246,.4)" }}>
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-white leading-tight">
                {user?.schoolName || t("common.scholarship")}
              </h1>
              <p className="truncate text-xs text-blue-300 leading-tight mt-0.5">{t("common.digitalGujaratPortal")}</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {filteredGroups.map(({ group, items }) => (
            <div key={group}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-blue-400/60">
                {group}
              </p>
              <div className="space-y-0.5">
                <SidebarNavEntries items={items} pathname={pathname} onNavigate={closeMobile} />
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <TopNavbar profileHref="/profile" showProfile sidebarWidth={260} />
      <Sidebar />
      <main className="lg:pl-[260px]">
        <div className="max-w-[1600px] px-4 pb-4 pt-[4.75rem] lg:px-6 lg:pb-6">{children}</div>
      </main>
    </div>
  );
}
