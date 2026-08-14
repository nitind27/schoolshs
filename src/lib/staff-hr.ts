/** Staff attendance & payroll calculation helpers */

export type StaffAttendanceMark = "P" | "A" | "H" | "L" | "";

export const STAFF_ATTENDANCE_MARKS: StaffAttendanceMark[] = ["P", "A", "H", "L", ""];

export interface StaffSalaryProfile {
  monthlySalary?: number | null;
  da?: number | null;
  hra?: number | null;
  ma?: number | null;
  fpa?: number | null;
  hndA?: number | null;
  suA?: number | null;
  caA?: number | null;
  wa?: number | null;
  prA?: number | null;
  bonus?: number | null;
  daArrears?: number | null;
  salaryArrears?: number | null;
  fullPay?: number | null;
  conveyance?: number | null;
  pfDeduction?: number | null;
  professionalTax?: number | null;
  incomeTax?: number | null;
}

export interface StaffAttendanceRow {
  staffId: string;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  attendance: (string | null)[];
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  halfDays: number;
  note: string;
  monthlySalary: number;
  /** True when a StaffAttendanceMonth row exists for this month */
  marked: boolean;
}

export interface StaffPayrollRow {
  staffId: string;
  employeeId: string;
  name: string;
  designation: string;
  presentDays: number;
  absentDays: number;
  workingDays: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  paymentStatus: string;
  paidAt: string | null;
  bankAccount: string;
  ifscCode: string;
}

export function emptyStaffDays(): (string | null)[] {
  return Array(31).fill(null);
}

export function parseStaffDaysJson(json: string | null | undefined): (string | null)[] {
  if (!json) return emptyStaffDays();
  try {
    const arr = JSON.parse(json) as unknown[];
    const days = emptyStaffDays();
    for (let i = 0; i < 31; i++) {
      const v = arr[i];
      days[i] = v === "P" || v === "A" || v === "H" || v === "L" ? v : null;
    }
    return days;
  } catch {
    return emptyStaffDays();
  }
}

export function serializeStaffDays(days: (string | null)[]): string {
  return JSON.stringify(
    days.map((d) => (d === "P" || d === "A" || d === "H" || d === "L" ? d : null))
  );
}

export function countStaffPresent(days: (string | null)[]): number {
  return days.reduce((sum, d) => {
    if (d === "P" || d === "L") return sum + 1;
    if (d === "H") return sum + 0.5;
    return sum;
  }, 0);
}

export function countStaffAbsent(days: (string | null)[]): number {
  return days.filter((d) => d === "A").length;
}

export function countStaffLeave(days: (string | null)[]): number {
  return days.filter((d) => d === "L").length;
}

export function countStaffHalf(days: (string | null)[]): number {
  return days.filter((d) => d === "H").length;
}

/**
 * Days that cut salary within this month: Absent = 1, Half day = 0.5.
 * Present, Leave, and unmarked days are paid in full.
 */
export function countStaffUnpaidDays(days: (string | null)[], workingDays: number): number {
  const n = Math.min(Math.max(0, workingDays), days.length);
  let unpaid = 0;
  for (let i = 0; i < n; i++) {
    if (days[i] === "A") unpaid += 1;
    else if (days[i] === "H") unpaid += 0.5;
  }
  return unpaid;
}

export function countStaffMarked(days: (string | null)[]): number {
  return days.filter((d) => d === "P" || d === "A" || d === "H" || d === "L").length;
}

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function grossMonthlySalary(profile: StaffSalaryProfile): number {
  const fromComponents =
    (profile.monthlySalary || 0) +
    (profile.da || 0) +
    (profile.hra || 0) +
    (profile.ma || 0) +
    (profile.fpa || 0) +
    (profile.hndA || 0) +
    (profile.suA || 0) +
    (profile.caA || 0) +
    (profile.wa || 0) +
    (profile.prA || 0) +
    (profile.bonus || 0) +
    (profile.daArrears || 0) +
    (profile.salaryArrears || 0);
  const pay = profile.fullPay && profile.fullPay > 0 ? profile.fullPay : fromComponents;
  return pay + (profile.conveyance || 0);
}

/**
 * Payroll: full Gross minus deductions.
 * Pay is cut only for Absent (full day) and Half-day (0.5). Unmarked days stay paid.
 * Net Salary is always Gross − Deductions.
 */
export function calculatePayroll(
  profile: StaffSalaryProfile,
  presentDays: number,
  absentDays: number,
  month: number,
  year: number,
  unpaidDays?: number,
) {
  const totalDays = daysInMonth(month, year);
  const gross = grossMonthlySalary(profile);
  const perDay = totalDays > 0 ? gross / totalDays : 0;
  const unpaid = unpaidDays ?? absentDays;
  const attendanceCut = Math.round(perDay * unpaid * 100) / 100;
  const pf = profile.pfDeduction || 0;
  const professionalTax = profile.professionalTax || 0;
  const incomeTax = profile.incomeTax || 0;
  const taxDeductions = pf + professionalTax + incomeTax;
  const deductions = Math.round((taxDeductions + attendanceCut) * 100) / 100;
  const net = Math.max(0, Math.round((gross - deductions) * 100) / 100);

  return {
    workingDays: totalDays,
    presentDays: Math.round(presentDays * 10) / 10,
    absentDays,
    grossSalary: gross,
    deductions,
    netSalary: net,
  };
}

export function buildStaffAttendanceRows(
  staffList: Array<{
    id: string;
    employeeId: string | null;
    firstName: string;
    lastName: string;
    designation: string;
    department: string | null;
    monthlySalary: number | null;
  }>,
  saved: Map<string, { daysJson: string; note: string | null }>
): StaffAttendanceRow[] {
  return staffList.map((s) => {
    const rec = saved.get(s.id);
    const attendance = parseStaffDaysJson(rec?.daysJson);
    const present = countStaffPresent(attendance);
    return {
      staffId: s.id,
      employeeId: s.employeeId || "",
      name: `${s.firstName} ${s.lastName}`,
      designation: s.designation,
      department: s.department || "",
      attendance,
      presentDays: present,
      absentDays: countStaffAbsent(attendance),
      leaveDays: countStaffLeave(attendance),
      halfDays: countStaffHalf(attendance),
      note: rec?.note || "",
      monthlySalary: s.monthlySalary || 0,
      marked: Boolean(rec),
    };
  });
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MARK_CYCLE: StaffAttendanceMark[] = ["P", "A", "H", "L", ""];

export function cycleStaffMark(current: string | null): StaffAttendanceMark {
  const idx = MARK_CYCLE.indexOf((current || "") as StaffAttendanceMark);
  return MARK_CYCLE[(idx + 1) % MARK_CYCLE.length];
}
