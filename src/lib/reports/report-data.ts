import { prisma } from "@/lib/db";
import { buildStudentWhere } from "@/lib/dashboard-analytics";
import { computeAdmissionCompleteness } from "@/lib/admissions";
import {
  buildAttendanceRows,
  buildStudentReports,
  parseDaysJson,
} from "@/lib/attendance";
import { buildStaffAttendanceRows } from "@/lib/staff-hr";
import { enabledDays } from "@/lib/timetable";
import { getOrCreateTimetableConfig } from "@/lib/timetable-server";
import { CSV_HEADERS } from "@/lib/constants";
import type { ReportPayload, ReportQuery } from "./types";

function filterSummary(q: ReportQuery): string {
  const parts: string[] = [];
  if (q.standard) parts.push(`Std ${q.standard}`);
  if (q.section) parts.push(`Div ${q.section}`);
  if (q.status) parts.push(q.status);
  if (q.category) parts.push(q.category);
  if (q.gender) parts.push(q.gender);
  if (q.admissionStatus) parts.push(q.admissionStatus);
  if (q.month && q.year) parts.push(`${q.month}/${q.year}`);
  if (q.academicYear) parts.push(q.academicYear);
  if (q.dateFrom || q.dateTo) {
    parts.push(`${q.dateFrom || "…"} → ${q.dateTo || "…"}`);
  }
  if (q.voucherType) parts.push(q.voucherType);
  return parts.length ? parts.join(" · ") : "All";
}

function parseDateOnly(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Inclusive calendar days between YYYY-MM-DD (UTC date parts). Max 62 days. */
function enumerateDateKeys(dateFrom?: string, dateTo?: string): string[] {
  const from = parseDateOnly(dateFrom);
  const to = parseDateOnly(dateTo);
  if (!from || !to || to < from) return [];
  const out: string[] = [];
  const cur = new Date(from);
  let guard = 0;
  while (cur <= to && guard < 62) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
    guard++;
  }
  return out;
}

function monthYearRangeFromDates(dateFrom?: string, dateTo?: string): { month: number; year: number }[] {
  const keys = enumerateDateKeys(dateFrom, dateTo);
  if (keys.length === 0) return [];
  const set = new Map<string, { month: number; year: number }>();
  for (const key of keys) {
    const [y, m] = key.split("-").map(Number);
    set.set(`${y}-${m}`, { year: y!, month: m! });
  }
  return [...set.values()];
}

function studentWhere(schoolId: string, q: ReportQuery) {
  const base = buildStudentWhere(schoolId, {
    standard: q.standard,
    section: q.section,
    status: q.status,
    category: q.category,
    gender: q.gender,
  });
  if (q.classId) return { ...base, classId: q.classId };
  return base;
}

export async function fetchReportPayload(
  schoolId: string,
  schoolName: string,
  q: ReportQuery,
): Promise<ReportPayload> {
  const generatedAt = new Date().toISOString();
  const summary = filterSummary(q);
  const base = {
    schoolName,
    generatedAt,
    filterSummary: summary,
    type: q.type,
  };

  switch (q.type) {
    case "students_master":
      return fetchStudentsMaster(schoolId, q, base);
    case "students_category":
      return fetchStudentsCategory(schoolId, q, base);
    case "class_roster":
      return fetchClassRoster(schoolId, q, base);
    case "admissions":
      return fetchAdmissions(schoolId, q, base);
    case "attendance_monthly":
      return fetchAttendance(schoolId, q, base);
    case "attendance_daily":
      return fetchAttendanceDaily(schoolId, q, base);
    case "timetable":
      return fetchTimetable(schoolId, q, base);
    case "board_records":
      return fetchBoardRecords(schoolId, q, base);
    case "staff_directory":
      return fetchStaffDirectory(schoolId, base);
    case "staff_attendance":
      return fetchStaffAttendance(schoolId, q, base);
    case "staff_payroll":
      return fetchStaffPayroll(schoolId, q, base);
    case "classes":
      return fetchClasses(schoolId, q, base);
    case "trial_balance":
      return fetchTrialBalance(schoolId, base);
    case "vouchers":
      return fetchVouchers(schoolId, q, base);
    case "day_book":
      return fetchDayBook(schoolId, q, base);
    case "general_register":
      return fetchGeneralRegister(schoolId, q, base);
    case "id_card_list":
      return fetchIdCardList(schoolId, q, base);
    case "results":
      return fetchResults(schoolId, q, base);
    case "students_scholarship":
      return fetchScholarshipExport(schoolId, q, base);
    default:
      throw new Error(`Unknown report type: ${q.type}`);
  }
}

async function fetchStudentsMaster(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const students = await prisma.student.findMany({
    where: studentWhere(schoolId, q),
    include: { schoolClass: { select: { name: true } } },
    orderBy: [{ standard: "asc" }, { section: "asc" }, { rollNumber: "asc" }],
  });

  const headers = [
    "Roll", "GR No", "Name", "Father", "Class", "Category", "Gender", "Mobile",
    "Aadhaar", "Status", "Admission", "Scholarship Scheme",
  ];
  const rows = students.map((s) => [
    s.rollNumber || "",
    s.grNumber || "",
    `${s.firstName} ${s.surname}`,
    s.fatherName,
    s.schoolClass?.name || `${s.standard || ""}-${s.section || ""}`,
    s.category,
    s.gender,
    s.mobileNumber,
    s.aadhaarNumber,
    s.status,
    s.admissionStatus,
    s.scholarshipScheme,
  ]);

  return { ...base, title: "Student Master Report", sheets: [{ name: "Students", headers, rows }] };
}

async function fetchClassRoster(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const students = await prisma.student.findMany({
    where: studentWhere(schoolId, q),
    orderBy: [{ rollNumber: "asc" }, { surname: "asc" }],
  });

  const headers = ["Sr", "Roll", "GR", "Name", "Father", "Category", "Mobile", "Gender"];
  const rows = students.map((s, i) => [
    i + 1,
    s.rollNumber || "",
    s.grNumber || "",
    `${s.firstName} ${s.surname}`,
    s.fatherName,
    s.category,
    s.mobileNumber,
    s.gender,
  ]);

  return { ...base, title: "Class Roster", sheets: [{ name: "Roster", headers, rows }] };
}

async function fetchAdmissions(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const where: Record<string, unknown> = { schoolId };
  if (q.admissionStatus) where.admissionStatus = q.admissionStatus;
  if (q.classId) where.classId = q.classId;
  if (q.standard) where.standard = q.standard;
  if (q.category) where.category = q.category;

  const from = parseDateOnly(q.dateFrom);
  const to = parseDateOnly(q.dateTo);
  if (from || to) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (from) createdAt.gte = from;
    if (to) {
      const end = new Date(to);
      end.setUTCHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    where.createdAt = createdAt;
  }

  const students = await prisma.student.findMany({ where, orderBy: { createdAt: "desc" } });

  const headers = [
    "Name", "Father", "Class", "GR", "Category", "Mobile", "Status",
    "Data %", "Verified By", "Verified At", "Created", "Notes",
  ];
  const rows = students.map((s) => {
    const c = computeAdmissionCompleteness(s);
    return [
      `${s.firstName} ${s.surname}`,
      s.fatherName,
      `${s.standard || ""}-${s.section || ""}`,
      s.grNumber || "",
      s.category,
      s.mobileNumber,
      s.admissionStatus,
      c.percent,
      s.verifiedBy || "",
      s.verifiedAt ? s.verifiedAt.toISOString().slice(0, 10) : "",
      s.createdAt.toISOString().slice(0, 10),
      s.notes || "",
    ];
  });

  return { ...base, title: "Admission Register", sheets: [{ name: "Admissions", headers, rows }] };
}

async function fetchAttendance(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const month = parseInt(q.month || String(new Date().getMonth() + 1), 10);
  const year = parseInt(q.year || String(new Date().getFullYear()), 10);

  const where: Record<string, unknown> = { schoolId, status: { not: "archived" } };
  if (q.classId) where.classId = q.classId;
  if (q.standard) where.standard = q.standard;
  if (q.section) where.section = q.section;

  const students = await prisma.student.findMany({
    where,
    orderBy: [{ rollNumber: "asc" }, { firstName: "asc" }],
  });

  const records = await prisma.studentAttendanceMonth.findMany({
    where: { schoolId, month, year, studentId: { in: students.map((s) => s.id) } },
  });
  const saved = new Map(records.map((r) => [r.studentId, r]));
  const reports = buildStudentReports(buildAttendanceRows(students, saved));

  const headers = ["Roll", "Name", "GR", "Present", "Absent", "Half", "Marked Days", "Attendance %"];
  const rows = reports.map((r) => [
    r.rollNumber || "",
    r.name,
    r.grNumber || "",
    r.present,
    r.absent,
    r.half,
    r.markedDays,
    `${r.percent}%`,
  ]);

  return {
    ...base,
    title: `Attendance Report — ${month}/${year}`,
    sheets: [{ name: "Attendance", headers, rows }],
  };
}

async function fetchTimetable(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const academicYear = q.academicYear || "2025-26";
  const dayConfig = await getOrCreateTimetableConfig(schoolId, academicYear);

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId, ...(q.classId ? { id: q.classId } : {}) },
    orderBy: [{ standard: "asc" }, { section: "asc" }],
  });

  const sheets = await Promise.all(
    classes.map(async (cls) => {
      const entries = await prisma.timetableEntry.findMany({
        where: { schoolId, classId: cls.id, academicYear },
        include: { teacher: { select: { firstName: true, lastName: true } } },
      });
      const map = new Map(entries.map((e) => [`${e.dayOfWeek}-${e.periodIndex}`, e]));
      const headers = ["Day", "Period", "Time", "Subject", "Teacher", "Room"];
      const rows: (string | number)[][] = [];

      for (const day of enabledDays(dayConfig)) {
        for (const period of day.periods) {
          const e = map.get(`${day.dayOfWeek}-${period.index}`);
          rows.push([
            day.short,
            period.index,
            `${period.start}-${period.end}`,
            e?.subject || "",
            e?.teacher ? `${e.teacher.firstName} ${e.teacher.lastName}` : "",
            e?.room || "",
          ]);
        }
      }

      return { name: (cls.name || `${cls.standard}-${cls.section}`).slice(0, 28), headers, rows };
    }),
  );

  return {
    ...base,
    title: `Timetable — ${academicYear}`,
    sheets: sheets.filter((s) => s.rows.length > 0),
  };
}

async function fetchBoardRecords(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const standard = q.standard === "12" ? "12" : "10";
  const where: Record<string, unknown> = { schoolId, standard };
  if (q.classId) where.classId = q.classId;

  const students = await prisma.student.findMany({
    where,
    orderBy: [{ section: "asc" }, { rollNumber: "asc" }],
  });

  const headers = ["Roll", "Name", "Class", "Seat Prefix", "Seat No", "Full Seat", `%${standard}th`, "Board"];
  const rows = students.map((s) => {
    const prefix = standard === "12" ? s.hscSeatPrefix : s.sscSeatPrefix;
    const num = standard === "12" ? s.hscSeatNumber : s.sscSeatNumber;
    const pct = standard === "12" ? s.percentage12th : s.percentage10th;
    return [
      s.rollNumber || "",
      `${s.firstName} ${s.surname}`,
      `${s.standard}-${s.section}`,
      prefix || "",
      num || "",
      prefix && num ? `${prefix}${num}` : "",
      pct != null ? pct : "",
      standard === "12" ? s.board12th || "" : s.board10th || "",
    ];
  });

  return { ...base, title: `Board Records — Class ${standard}`, sheets: [{ name: `Std ${standard}`, headers, rows }] };
}

async function fetchStaffDirectory(
  schoolId: string,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const staff = await prisma.staff.findMany({
    where: { schoolId },
    orderBy: [{ designation: "asc" }, { firstName: "asc" }],
  });

  const headers = ["Emp ID", "Name", "Designation", "Department", "Mobile", "Email", "Join Date", "Salary", "Active"];
  const rows = staff.map((s) => [
    s.employeeId || "",
    `${s.firstName} ${s.lastName}`,
    s.designation,
    s.department || "",
    s.mobileNumber,
    s.email || "",
    s.dateOfJoining || "",
    s.monthlySalary ?? "",
    s.isActive ? "Yes" : "No",
  ]);

  return { ...base, title: "Staff Directory", sheets: [{ name: "Staff", headers, rows }] };
}

async function fetchStaffPayroll(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const month = parseInt(q.month || String(new Date().getMonth() + 1), 10);
  const year = parseInt(q.year || String(new Date().getFullYear()), 10);

  const payroll = await prisma.staffPayroll.findMany({
    where: { schoolId, month, year },
    include: { staff: { select: { firstName: true, lastName: true, designation: true, employeeId: true } } },
  });

  const headers = ["Emp ID", "Name", "Designation", "Working Days", "Present", "Absent", "Gross", "Deductions", "Net", "Status"];
  const rows = payroll.map((r) => [
    r.staff.employeeId || "",
    `${r.staff.firstName} ${r.staff.lastName}`,
    r.staff.designation,
    r.workingDays,
    r.presentDays,
    r.absentDays,
    r.grossSalary,
    r.deductions,
    r.netSalary,
    r.paymentStatus,
  ]);

  return { ...base, title: `Payroll — ${month}/${year}`, sheets: [{ name: "Payroll", headers, rows }] };
}

async function fetchClasses(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const classes = await prisma.schoolClass.findMany({
    where: {
      schoolId,
      ...(q.standard ? { standard: q.standard } : {}),
      ...(q.academicYear ? { academicYear: q.academicYear } : {}),
    },
    include: {
      classTeacher: { select: { firstName: true, lastName: true } },
      _count: { select: { students: true } },
    },
    orderBy: [{ standard: "asc" }, { section: "asc" }],
  });

  const headers = ["Class", "Standard", "Section", "Stream", "Year", "Teacher", "Students"];
  const rows = classes.map((c) => [
    c.name,
    c.standard,
    c.section,
    c.stream || "",
    c.academicYear,
    c.classTeacher ? `${c.classTeacher.firstName} ${c.classTeacher.lastName}` : "",
    c._count.students,
  ]);

  return { ...base, title: "Class List", sheets: [{ name: "Classes", headers, rows }] };
}

async function fetchTrialBalance(
  schoolId: string,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const fy = await prisma.financialYear.findFirst({ where: { schoolId, isActive: true } });
  if (!fy) {
    return { ...base, title: "Trial Balance", sheets: [{ name: "TB", headers: ["Note"], rows: [["No active financial year"]] }] };
  }

  const accounts = await prisma.account.findMany({
    where: { schoolId, financialYearId: fy.id, isActive: true },
    orderBy: { code: "asc" },
  });
  const lines = await prisma.voucherLine.findMany({
    where: { voucher: { schoolId, financialYearId: fy.id, isPosted: true } },
  });

  const balances = new Map<string, { debit: number; credit: number }>();
  for (const acc of accounts) {
    balances.set(acc.id, {
      debit: acc.openingBalance > 0 && acc.balanceType === "debit" ? acc.openingBalance : 0,
      credit: acc.openingBalance > 0 && acc.balanceType === "credit" ? acc.openingBalance : 0,
    });
  }
  for (const line of lines) {
    const b = balances.get(line.accountId) || { debit: 0, credit: 0 };
    b.debit += line.debit;
    b.credit += line.credit;
    balances.set(line.accountId, b);
  }

  const headers = ["Code", "Account", "Type", "Debit", "Credit", "Closing Dr", "Closing Cr"];
  const rows = accounts.map((acc) => {
    const b = balances.get(acc.id) || { debit: 0, credit: 0 };
    const net = b.debit - b.credit;
    return [
      acc.code,
      acc.name,
      acc.accountType,
      Math.round(b.debit * 100) / 100,
      Math.round(b.credit * 100) / 100,
      net > 0 ? Math.round(net * 100) / 100 : 0,
      net < 0 ? Math.round(Math.abs(net) * 100) / 100 : 0,
    ];
  });

  return { ...base, title: `Trial Balance — ${fy.label}`, subtitle: fy.label, sheets: [{ name: "Trial Balance", headers, rows }] };
}

async function fetchVouchers(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const fy = await prisma.financialYear.findFirst({ where: { schoolId, isActive: true } });
  if (!fy) {
    return { ...base, title: "Vouchers", sheets: [{ name: "Vouchers", headers: ["Note"], rows: [["No FY"]] }] };
  }

  const where: Record<string, unknown> = { schoolId, financialYearId: fy.id };
  if (q.voucherType) where.voucherType = q.voucherType;

  let from = parseDateOnly(q.dateFrom);
  let to = parseDateOnly(q.dateTo);
  if (!from && !to && q.month && q.year) {
    const m = parseInt(q.month, 10);
    const y = parseInt(q.year, 10);
    from = new Date(Date.UTC(y, m - 1, 1));
    to = new Date(Date.UTC(y, m, 0));
  }
  if (from || to) {
    const voucherDate: { gte?: Date; lte?: Date } = {};
    if (from) voucherDate.gte = from;
    if (to) {
      const end = new Date(to);
      end.setUTCHours(23, 59, 59, 999);
      voucherDate.lte = end;
    }
    where.voucherDate = voucherDate;
  }

  const vouchers = await prisma.voucher.findMany({
    where,
    orderBy: { voucherDate: "desc" },
    take: 2000,
  });

  const headers = ["No", "Date", "Type", "Narration", "Amount", "Posted"];
  const rows = vouchers.map((v) => [
    v.voucherNo,
    v.voucherDate instanceof Date ? v.voucherDate.toISOString().slice(0, 10) : String(v.voucherDate),
    v.voucherType,
    v.narration || "",
    v.totalAmount,
    v.isPosted ? "Yes" : "No",
  ]);

  return { ...base, title: "Voucher Register", sheets: [{ name: "Vouchers", headers, rows }] };
}

async function fetchGeneralRegister(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const where: Record<string, unknown> = { schoolId };
  if (q.standard) where.standard = q.standard;
  if (q.section) where.section = q.section;

  if (q.classId) {
    const students = await prisma.student.findMany({
      where: { schoolId, classId: q.classId },
      select: { grNumber: true },
    });
    const grs = students.map((s) => s.grNumber).filter(Boolean) as string[];
    if (grs.length) where.grNumber = { in: grs };
  }

  const entries = await prisma.generalRegisterEntry.findMany({
    where,
    orderBy: [{ grNumber: "asc" }],
    take: 2000,
  });

  const headers = ["GR No", "Surname", "First Name", "Father", "Mother", "DOB", "Admission", "Std", "Sec", "Religion/Caste"];
  const rows = entries.map((e) => [
    e.grNumber,
    e.surname,
    e.firstName,
    e.fatherName,
    e.motherName,
    e.dateOfBirth,
    e.admissionDate,
    e.standard,
    e.section,
    e.religionCaste,
  ]);

  return { ...base, title: "General Register (GR)", sheets: [{ name: "GR", headers, rows }] };
}

async function fetchStudentsCategory(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const students = await prisma.student.findMany({
    where: studentWhere(schoolId, q),
    select: { category: true, gender: true, standard: true, section: true, status: true },
  });

  const map = new Map<string, { total: number; male: number; female: number; other: number }>();
  for (const s of students) {
    const key = s.category || "Unknown";
    if (!map.has(key)) map.set(key, { total: 0, male: 0, female: 0, other: 0 });
    const row = map.get(key)!;
    row.total += 1;
    const g = (s.gender || "").toLowerCase();
    if (g === "male" || g === "m") row.male += 1;
    else if (g === "female" || g === "f") row.female += 1;
    else row.other += 1;
  }

  const headers = ["Category", "Total", "Male", "Female", "Other"];
  const rows = [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cat, v]) => [cat, v.total, v.male, v.female, v.other]);

  return {
    ...base,
    title: "Students by Category",
    sheets: [{ name: "Category", headers, rows }],
  };
}

async function fetchAttendanceDaily(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const today = new Date();
  const defaultFrom = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
  const defaultTo = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 0));
  const dateFrom = q.dateFrom || defaultFrom.toISOString().slice(0, 10);
  const dateTo = q.dateTo || defaultTo.toISOString().slice(0, 10);
  const dateKeys = enumerateDateKeys(dateFrom, dateTo);

  if (dateKeys.length === 0) {
    return {
      ...base,
      title: "Daily Attendance",
      sheets: [{ name: "Attendance", headers: ["Note"], rows: [["Select a valid date range (max 62 days)"]] }],
    };
  }

  const where: Record<string, unknown> = { schoolId, status: { not: "archived" } };
  if (q.classId) where.classId = q.classId;
  if (q.standard) where.standard = q.standard;
  if (q.section) where.section = q.section;

  const students = await prisma.student.findMany({
    where,
    orderBy: [{ rollNumber: "asc" }, { firstName: "asc" }],
  });

  const pairs = monthYearRangeFromDates(dateFrom, dateTo);
  const records = await prisma.studentAttendanceMonth.findMany({
    where: {
      schoolId,
      studentId: { in: students.map((s) => s.id) },
      OR: pairs.map((p) => ({ month: p.month, year: p.year })),
    },
  });

  const byStudentMonth = new Map<string, (string | null)[]>();
  for (const r of records) {
    byStudentMonth.set(`${r.studentId}-${r.year}-${r.month}`, parseDaysJson(r.daysJson));
  }

  const dayHeaders = dateKeys.map((d) => d.slice(8)); // DD
  const headers = ["Roll", "Name", "GR", ...dayHeaders, "P", "A", "H"];
  const rows = students.map((s) => {
    let p = 0;
    let a = 0;
    let h = 0;
    const marks = dateKeys.map((key) => {
      const [y, m, d] = key.split("-").map(Number);
      const days = byStudentMonth.get(`${s.id}-${y}-${m}`) || [];
      const mark = days[(d || 1) - 1] || "";
      if (mark === "P") p += 1;
      else if (mark === "A") a += 1;
      else if (mark === "H") h += 1;
      return mark || "";
    });
    return [
      s.rollNumber || "",
      `${s.firstName} ${s.surname}`,
      s.grNumber || "",
      ...marks,
      p,
      a,
      h,
    ];
  });

  return {
    ...base,
    title: `Daily Attendance — ${dateFrom} to ${dateTo}`,
    sheets: [{ name: "Daily", headers, rows }],
  };
}

async function fetchStaffAttendance(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const month = parseInt(q.month || String(new Date().getMonth() + 1), 10);
  const year = parseInt(q.year || String(new Date().getFullYear()), 10);

  const staff = await prisma.staff.findMany({
    where: { schoolId, isActive: true },
    orderBy: [{ designation: "asc" }, { firstName: "asc" }],
  });
  const records = await prisma.staffAttendanceMonth.findMany({
    where: { schoolId, month, year, staffId: { in: staff.map((s) => s.id) } },
  });
  const saved = new Map(records.map((r) => [r.staffId, r]));
  const rowsData = buildStaffAttendanceRows(staff, saved);

  const headers = ["Emp ID", "Name", "Designation", "Present", "Absent", "Half", "Leave", "Note"];
  const rows = rowsData.map((r) => [
    r.employeeId,
    r.name,
    r.designation,
    r.presentDays,
    r.absentDays,
    r.halfDays,
    r.leaveDays,
    r.note,
  ]);

  return {
    ...base,
    title: `Staff Attendance — ${month}/${year}`,
    sheets: [{ name: "Staff Attendance", headers, rows }],
  };
}

async function fetchDayBook(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const fy = await prisma.financialYear.findFirst({ where: { schoolId, isActive: true } });
  if (!fy) {
    return { ...base, title: "Day Book", sheets: [{ name: "Day Book", headers: ["Note"], rows: [["No FY"]] }] };
  }

  const today = new Date().toISOString().slice(0, 10);
  const dateFrom = q.dateFrom || today;
  const dateTo = q.dateTo || today;
  const from = parseDateOnly(dateFrom);
  const to = parseDateOnly(dateTo);

  const voucherDate: { gte?: Date; lte?: Date } = {};
  if (from) voucherDate.gte = from;
  if (to) {
    const end = new Date(to);
    end.setUTCHours(23, 59, 59, 999);
    voucherDate.lte = end;
  }

  const vouchers = await prisma.voucher.findMany({
    where: {
      schoolId,
      financialYearId: fy.id,
      isPosted: true,
      voucherType: { in: ["receipt", "payment"] },
      ...(from || to ? { voucherDate } : {}),
    },
    orderBy: [{ voucherDate: "asc" }, { voucherNo: "asc" }],
    take: 2000,
  });

  const headers = ["Date", "Voucher No", "Type", "Narration", "Receipt", "Payment"];
  const rows = vouchers.map((v) => {
    const amt = Number(v.totalAmount) || 0;
    const isReceipt = v.voucherType === "receipt";
    return [
      v.voucherDate instanceof Date ? v.voucherDate.toISOString().slice(0, 10) : String(v.voucherDate),
      v.voucherNo,
      v.voucherType,
      v.narration || "",
      isReceipt ? amt : "",
      !isReceipt ? amt : "",
    ];
  });

  return {
    ...base,
    title: `Day Book — ${dateFrom} to ${dateTo}`,
    sheets: [{ name: "Day Book", headers, rows }],
  };
}

async function fetchIdCardList(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const students = await prisma.student.findMany({
    where: studentWhere(schoolId, q),
    orderBy: [{ standard: "asc" }, { section: "asc" }, { rollNumber: "asc" }],
  });

  const headers = ["Roll", "GR", "Name", "Class", "Photo", "Mobile", "Blood Group", "Status"];
  const rows = students.map((s) => [
    s.rollNumber || "",
    s.grNumber || "",
    `${s.firstName} ${s.surname}`,
    `${s.standard || ""}-${s.section || ""}`,
    s.photoPath ? "Yes" : "No",
    s.mobileNumber || "",
    s.bloodGroup || "",
    s.status,
  ]);

  return {
    ...base,
    title: "ID Card Checklist",
    sheets: [{ name: "ID Cards", headers, rows }],
  };
}

async function fetchResults(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const exam = q.examId
    ? await prisma.exam.findFirst({
        where: { id: q.examId, schoolId },
        include: { subjects: { orderBy: { sortOrder: "asc" } }, results: { include: { student: true, subject: true } } },
      })
    : await prisma.exam.findFirst({
        where: { schoolId, ...(q.standard ? { standard: q.standard } : {}) },
        include: { subjects: { orderBy: { sortOrder: "asc" } }, results: { include: { student: true, subject: true } } },
        orderBy: { createdAt: "desc" },
      });

  if (!exam) {
    return { ...base, title: "Results", sheets: [{ name: "Results", headers: ["Note"], rows: [["No exam found"]] }] };
  }

  const byStudent = new Map<string, Record<string, number | string>>();
  for (const r of exam.results) {
    if (!byStudent.has(r.studentId)) {
      byStudent.set(r.studentId, { name: `${r.student.firstName} ${r.student.surname}`, roll: r.student.rollNumber || "" });
    }
    const key = r.subject.code || r.subject.name;
    byStudent.get(r.studentId)![key] = r.marksObtained;
  }

  const subHeaders = exam.subjects.map((s) => s.code || s.name);
  const headers = ["Roll", "Name", ...subHeaders, "Total"];
  const rows = [...byStudent.values()].map((row) => {
    const marks = subHeaders.map((h) => row[h] ?? "");
    const total = subHeaders.reduce((s, h) => s + (Number(row[h]) || 0), 0);
    return [String(row.roll ?? ""), String(row.name ?? ""), ...marks, total];
  });

  return { ...base, title: `Results — ${exam.name}`, sheets: [{ name: "Marks", headers, rows }] };
}

async function fetchScholarshipExport(
  schoolId: string,
  q: ReportQuery,
  base: Omit<ReportPayload, "title" | "sheets">,
): Promise<ReportPayload> {
  const where: Record<string, unknown> = { schoolId };
  if (q.status) where.status = q.status;

  const students = await prisma.student.findMany({ where, orderBy: { surname: "asc" } });
  const headers = [...CSV_HEADERS];
  const rows = students.map((s) =>
    headers.map((h) => {
      const val = (s as Record<string, unknown>)[h];
      if (val == null) return "";
      if (typeof val === "boolean") return val ? "Yes" : "No";
      return String(val);
    }),
  );

  return { ...base, title: "Scholarship / DG Export", sheets: [{ name: "DG Export", headers, rows }] };
}
