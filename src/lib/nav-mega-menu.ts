import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  BookMarked,
  Calculator,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  Download,
  ChartColumn,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  IndianRupee,
  LayoutGrid,
  Printer,
  ScrollText,
  Table2,
  UserCheck,
  Wallet,
} from "lucide-react";

export type MegaMenuLink = {
  href: string;
  labelKey: string;
  descKey?: string;
  icon: LucideIcon;
};

export type MegaMenuColumn = {
  id: string;
  titleKey: string;
  accent: string;
  icon: LucideIcon;
  links: MegaMenuLink[];
};

/** Shared shortcuts for school admin + clerk top navbar mega menu */
export const REPORTS_CERTS_MEGA_MENU: MegaMenuColumn[] = [
  {
    id: "certificates",
    titleKey: "megaMenu.colCertificates",
    accent: "text-rose-600 bg-rose-50",
    icon: ScrollText,
    links: [
      {
        href: "/certificates",
        labelKey: "megaMenu.allCertificates",
        descKey: "megaMenu.allCertificatesDesc",
        icon: LayoutGrid,
      },
      {
        href: "/certificates/bonafide",
        labelKey: "megaMenu.bonafide",
        icon: FileText,
      },
      {
        href: "/certificates/lc",
        labelKey: "megaMenu.lc",
        icon: FileText,
      },
      {
        href: "/certificates/character",
        labelKey: "megaMenu.character",
        icon: Award,
      },
      {
        href: "/certificates/general-register",
        labelKey: "megaMenu.generalRegister",
        icon: BookOpen,
      },
      {
        href: "/certificates/class-register",
        labelKey: "megaMenu.classRegister",
        icon: BookMarked,
      },
      {
        href: "/certificates/monthly-attendance",
        labelKey: "megaMenu.monthlyAttendance",
        icon: CalendarCheck,
      },
      {
        href: "/certificates/daily-attendance-book",
        labelKey: "megaMenu.dailyAttendanceBook",
        icon: ClipboardList,
      },
      {
        href: "/certificates/monthly-reports",
        labelKey: "megaMenu.monthlyReports",
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    id: "board-print",
    titleKey: "megaMenu.colBoardPrint",
    accent: "text-violet-600 bg-violet-50",
    icon: GraduationCap,
    links: [
      {
        href: "/students/board-records",
        labelKey: "megaMenu.boardViewPrint",
        descKey: "megaMenu.boardViewPrintDesc",
        icon: Printer,
      },
      {
        href: "/students/board-records/result-list",
        labelKey: "megaMenu.boardResultList",
        descKey: "megaMenu.boardResultListDesc",
        icon: Table2,
      },
      {
        href: "/students/board-records/exam-result-sheet",
        labelKey: "megaMenu.boardExamSheet",
        descKey: "megaMenu.boardExamSheetDesc",
        icon: FileSpreadsheet,
      },
      {
        href: "/students/board-records/overall-analysis",
        labelKey: "megaMenu.boardOverall",
        descKey: "megaMenu.boardOverallDesc",
        icon: ChartColumn,
      },
    ],
  },
  {
    id: "staff-reports",
    titleKey: "megaMenu.colStaffReports",
    accent: "text-emerald-600 bg-emerald-50",
    icon: Wallet,
    links: [
      {
        href: "/staff/payroll",
        labelKey: "megaMenu.payroll",
        descKey: "megaMenu.payrollDesc",
        icon: IndianRupee,
      },
      {
        href: "/staff/salary-statement",
        labelKey: "megaMenu.salaryStatement",
        icon: Calculator,
      },
      {
        href: "/staff/salary-slip",
        labelKey: "megaMenu.salarySlip",
        icon: CreditCard,
      },
      {
        href: "/staff/salary-ledger",
        labelKey: "megaMenu.salaryLedger",
        icon: BookOpen,
      },
      {
        href: "/staff/income-tax",
        labelKey: "megaMenu.incomeTax",
        icon: Calculator,
      },
      {
        href: "/staff/register",
        labelKey: "megaMenu.staffRegister",
        icon: UserCheck,
      },
      {
        href: "/staff/attendance",
        labelKey: "megaMenu.staffAttendance",
        icon: ClipboardList,
      },
    ],
  },
  {
    id: "school-reports",
    titleKey: "megaMenu.colSchoolReports",
    accent: "text-blue-600 bg-blue-50",
    icon: FileSpreadsheet,
    links: [
      {
        href: "/export",
        labelKey: "megaMenu.reportsHub",
        descKey: "megaMenu.reportsHubDesc",
        icon: Download,
      },
      {
        href: "/attendance/reports",
        labelKey: "megaMenu.attendanceReports",
        icon: CalendarCheck,
      },
      {
        href: "/accounting/reports",
        labelKey: "megaMenu.accountingReports",
        icon: Calculator,
      },
      {
        href: "/id-cards",
        labelKey: "megaMenu.idCards",
        icon: CreditCard,
      },
      {
        href: "/results",
        labelKey: "megaMenu.results",
        icon: Award,
      },
    ],
  },
];
