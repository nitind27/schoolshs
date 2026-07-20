/** Central catalog of exportable school reports */

export type ReportCategory =
  | "students"
  | "admissions"
  | "attendance"
  | "academic"
  | "staff"
  | "accounts"
  | "registers";

export type ReportFormat = "xlsx" | "pdf" | "csv";

export type ReportFilterField =
  | "standard"
  | "section"
  | "classId"
  | "status"
  | "category"
  | "gender"
  | "admissionStatus"
  | "month"
  | "year"
  | "standard10or12"
  | "examId"
  | "academicYear"
  | "dateFrom"
  | "dateTo"
  | "voucherType";

export type ReportDefinition = {
  id: string;
  category: ReportCategory;
  icon: string;
  formats: ReportFormat[];
  filters: ReportFilterField[];
  /** Uses dedicated legacy API instead of /api/reports/export */
  legacyApi?: string;
};

export const REPORT_CATEGORIES: { id: ReportCategory; labelKey: string }[] = [
  { id: "students", labelKey: "reportsHub.catStudents" },
  { id: "admissions", labelKey: "reportsHub.catAdmissions" },
  { id: "attendance", labelKey: "reportsHub.catAttendance" },
  { id: "academic", labelKey: "reportsHub.catAcademic" },
  { id: "staff", labelKey: "reportsHub.catStaff" },
  { id: "accounts", labelKey: "reportsHub.catAccounts" },
  { id: "registers", labelKey: "reportsHub.catRegisters" },
];

export const REPORT_CATALOG: ReportDefinition[] = [
  {
    id: "dashboard",
    category: "students",
    icon: "BarChart3",
    formats: ["xlsx", "pdf"],
    filters: ["standard", "section", "status", "category", "gender"],
    legacyApi: "/api/stats/export",
  },
  {
    id: "students_master",
    category: "students",
    icon: "Users",
    formats: ["xlsx", "pdf"],
    filters: ["standard", "section", "classId", "status", "category", "gender"],
  },
  {
    id: "students_scholarship",
    category: "students",
    icon: "FileSpreadsheet",
    formats: ["csv", "xlsx", "pdf"],
    filters: ["status"],
    legacyApi: "/api/students/export",
  },
  {
    id: "students_category",
    category: "students",
    icon: "PieChart",
    formats: ["xlsx", "pdf"],
    filters: ["standard", "section", "status"],
  },
  {
    id: "class_roster",
    category: "students",
    icon: "LayoutGrid",
    formats: ["xlsx", "pdf"],
    filters: ["classId", "standard", "section"],
  },
  {
    id: "classes",
    category: "students",
    icon: "School",
    formats: ["xlsx", "pdf"],
    filters: ["standard", "academicYear"],
  },
  {
    id: "admissions",
    category: "admissions",
    icon: "ClipboardCheck",
    formats: ["xlsx", "pdf"],
    filters: ["admissionStatus", "classId", "standard", "category", "dateFrom", "dateTo"],
  },
  {
    id: "attendance_monthly",
    category: "attendance",
    icon: "CalendarCheck",
    formats: ["xlsx", "pdf"],
    filters: ["classId", "standard", "section", "month", "year"],
  },
  {
    id: "attendance_daily",
    category: "attendance",
    icon: "CalendarRange",
    formats: ["xlsx", "pdf", "csv"],
    filters: ["classId", "standard", "section", "dateFrom", "dateTo"],
  },
  {
    id: "timetable",
    category: "academic",
    icon: "Clock",
    formats: ["xlsx", "pdf"],
    filters: ["classId", "academicYear"],
  },
  {
    id: "board_records",
    category: "academic",
    icon: "GraduationCap",
    formats: ["xlsx", "pdf"],
    filters: ["standard10or12", "classId"],
  },
  {
    id: "results",
    category: "academic",
    icon: "Trophy",
    formats: ["xlsx", "pdf"],
    filters: ["standard", "section", "examId"],
  },
  {
    id: "staff_directory",
    category: "staff",
    icon: "Briefcase",
    formats: ["xlsx", "pdf"],
    filters: [],
  },
  {
    id: "staff_attendance",
    category: "staff",
    icon: "UserCheck",
    formats: ["xlsx", "pdf"],
    filters: ["month", "year"],
  },
  {
    id: "staff_payroll",
    category: "staff",
    icon: "Wallet",
    formats: ["xlsx", "pdf"],
    filters: ["month", "year"],
  },
  {
    id: "trial_balance",
    category: "accounts",
    icon: "Scale",
    formats: ["xlsx", "pdf"],
    filters: [],
  },
  {
    id: "vouchers",
    category: "accounts",
    icon: "Receipt",
    formats: ["xlsx", "pdf", "csv"],
    filters: ["voucherType", "dateFrom", "dateTo", "month", "year"],
  },
  {
    id: "day_book",
    category: "accounts",
    icon: "BookMarked",
    formats: ["xlsx", "pdf"],
    filters: ["dateFrom", "dateTo"],
  },
  {
    id: "general_register",
    category: "registers",
    icon: "BookOpen",
    formats: ["xlsx", "pdf"],
    filters: ["classId", "standard", "section"],
  },
  {
    id: "id_card_list",
    category: "registers",
    icon: "CreditCard",
    formats: ["xlsx", "pdf"],
    filters: ["classId", "standard", "section", "status"],
  },
];

export function getReportById(id: string): ReportDefinition | undefined {
  return REPORT_CATALOG.find((r) => r.id === id);
}

export function reportsByCategory(category: ReportCategory): ReportDefinition[] {
  return REPORT_CATALOG.filter((r) => r.category === category);
}
