/** Staff attendance & payroll calculation helpers */

export type StaffAttendanceMark = "P" | "A" | "H" | "L" | "";

export const STAFF_ATTENDANCE_MARKS: StaffAttendanceMark[] = ["P", "A", "H", "L", ""];

export interface StaffSalaryProfile {
  monthlySalary?: number | null;
  hra?: number | null;
  conveyance?: number | null;
  pfDeduction?: number | null;
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

export function countStaffMarked(days: (string | null)[]): number {
  return days.filter((d) => d === "P" || d === "A" || d === "H" || d === "L").length;
}

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function grossMonthlySalary(profile: StaffSalaryProfile): number {
  return (
    (profile.monthlySalary || 0) +
    (profile.hra || 0) +
    (profile.conveyance || 0)
  );
}

/** Pro-rata salary based on attendance */
export function calculatePayroll(
  profile: StaffSalaryProfile,
  presentDays: number,
  absentDays: number,
  month: number,
  year: number
) {
  const totalDays = daysInMonth(month, year);
  const gross = grossMonthlySalary(profile);
  const perDay = totalDays > 0 ? gross / totalDays : 0;
  const earned = Math.round(perDay * presentDays * 100) / 100;
  const absentPenalty = Math.round(perDay * absentDays * 100) / 100;
  const pf = profile.pfDeduction || 0;
  const deductions = Math.round((pf + absentPenalty) * 100) / 100;
  const net = Math.max(0, Math.round((earned - pf) * 100) / 100);

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
