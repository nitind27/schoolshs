import "server-only";

import { prisma } from "@/lib/db";
import { calcAgeYears } from "@/lib/student-age";
import {
  getSchoolYmd,
  schoolDateKey,
  schoolDayStartUtc,
} from "@/lib/school-timezone";

export type BirthdayPerson = {
  id: string;
  kind: "student" | "staff";
  name: string;
  nameGu?: string | null;
  dateOfBirth: string;
  age: number | null;
  /** Class label for students, designation for staff */
  detail: string;
  href: string;
  photoPath?: string | null;
};

/**
 * Strict calendar DOB only (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD).
 * No Date() fallback — junk like "—" / "d" must never match "today".
 */
export function parseStrictDob(dob: string | null | undefined): Date | null {
  if (!dob?.trim()) return null;
  const raw = dob.trim();
  let day = 0;
  let month = 0;
  let year = 0;

  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dmy) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
  } else if (ymd) {
    year = Number(ymd[1]);
    month = Number(ymd[2]);
    day = Number(ymd[3]);
  } else {
    return null;
  }

  const nowYear = getSchoolYmd().year;
  if (year < 1945 || year > nowYear) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    return null;
  }
  return dt;
}

function ageFromDob(dt: Date, onDate: Date, kind: "student" | "staff"): number | null {
  const today = getSchoolYmd(onDate);
  let age = today.year - dt.getFullYear();
  if (today.month < dt.getMonth() + 1 || (today.month === dt.getMonth() + 1 && today.day < dt.getDate())) {
    age -= 1;
  }
  if (kind === "student") {
    if (age < 3 || age > 22) return null;
  } else if (age < 18 || age > 80) {
    return null;
  }
  return age;
}

/** Real person name — reject placeholders like "— —", "d —", "test". */
export function isRealPersonName(first?: string | null, last?: string | null): boolean {
  const en = [first, last].filter((p) => String(p || "").trim()).join(" ").trim();
  if (en.length < 2) return false;
  const letters = en.replace(/[^a-zA-Z\u0A80-\u0AFF]/g, "");
  if (letters.length < 2) return false;
  const compact = letters.toLowerCase();
  if (/^(na|nil|test|dummy|xxx+|sample|unknown|none|asdf|abc)$/.test(compact)) return false;
  if (/^[—\-_.\/]+$/.test(en)) return false;
  return true;
}

/** Compare DOB month/day to "today" in Asia/Kolkata (IST). */
export function isBirthdayToday(dob: string | null | undefined, onDate = new Date()): boolean {
  const dt = parseStrictDob(dob);
  if (!dt) return false;
  const today = getSchoolYmd(onDate);
  return dt.getDate() === today.day && dt.getMonth() + 1 === today.month;
}

export function birthdayDateKey(onDate = new Date()): string {
  return schoolDateKey(onDate);
}

function personName(
  first?: string | null,
  last?: string | null,
  firstGu?: string | null,
  lastGu?: string | null,
) {
  const en = [first, last]
    .filter((p) => String(p || "").trim() && !/^[—\-]+$/.test(String(p).trim()))
    .join(" ")
    .trim();
  const gu = [firstGu, lastGu].filter((p) => String(p || "").trim()).join(" ").trim();
  return { en, gu: gu || null };
}

/** Fetch students + staff whose birthday is today for this school only. */
export async function getTodayBirthdays(
  schoolId: string,
  onDate = new Date(),
): Promise<{
  dateKey: string;
  students: BirthdayPerson[];
  staff: BirthdayPerson[];
  all: BirthdayPerson[];
  total: number;
}> {
  if (!schoolId) {
    return { dateKey: birthdayDateKey(onDate), students: [], staff: [], all: [], total: 0 };
  }

  const [studentRows, staffRows] = await Promise.all([
    prisma.student.findMany({
      where: {
        schoolId,
        status: { not: "archived" },
        dateOfBirth: { not: "" },
      },
      select: {
        id: true,
        firstName: true,
        surname: true,
        firstNameGu: true,
        surnameGu: true,
        dateOfBirth: true,
        photoPath: true,
        standard: true,
        section: true,
        schoolClass: { select: { name: true } },
      },
    }),
    prisma.staff.findMany({
      where: {
        schoolId,
        isActive: true,
        NOT: [{ dateOfBirth: null }, { dateOfBirth: "" }],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        firstNameGu: true,
        lastNameGu: true,
        dateOfBirth: true,
        photoPath: true,
        designation: true,
        employeeId: true,
      },
    }),
  ]);

  const students: BirthdayPerson[] = [];
  for (const s of studentRows) {
    if (!isRealPersonName(s.firstName, s.surname)) continue;
    const born = parseStrictDob(s.dateOfBirth);
    if (!born) continue;
    if (!isBirthdayToday(s.dateOfBirth, onDate)) continue;
    const age = ageFromDob(born, onDate, "student");
    if (age == null) continue;
    const { en, gu } = personName(s.firstName, s.surname, s.firstNameGu, s.surnameGu);
    if (!en) continue;
    const classLabel =
      s.schoolClass?.name ||
      [s.standard, s.section].filter(Boolean).join("-") ||
      "";
    students.push({
      id: s.id,
      kind: "student",
      name: en,
      nameGu: gu,
      dateOfBirth: s.dateOfBirth,
      age: calcAgeYears(s.dateOfBirth, onDate) ?? age,
      detail: classLabel,
      href: `/students/${s.id}`,
      photoPath: s.photoPath,
    });
  }

  const staff: BirthdayPerson[] = [];
  for (const s of staffRows) {
    if (!isRealPersonName(s.firstName, s.lastName)) continue;
    const born = parseStrictDob(s.dateOfBirth);
    if (!born) continue;
    if (!isBirthdayToday(s.dateOfBirth, onDate)) continue;
    const age = ageFromDob(born, onDate, "staff");
    if (age == null) continue;
    const { en, gu } = personName(s.firstName, s.lastName, s.firstNameGu, s.lastNameGu);
    if (!en) continue;
    staff.push({
      id: s.id,
      kind: "staff",
      name: en,
      nameGu: gu,
      dateOfBirth: s.dateOfBirth || "",
      age: calcAgeYears(s.dateOfBirth, onDate) ?? age,
      detail: [s.designation, s.employeeId].filter(Boolean).join(" · ") || "Staff",
      href: `/staff/${s.id}/edit`,
      photoPath: s.photoPath,
    });
  }

  students.sort((a, b) => a.name.localeCompare(b.name));
  staff.sort((a, b) => a.name.localeCompare(b.name));
  const all = [...staff, ...students];

  return {
    dateKey: birthdayDateKey(onDate),
    students,
    staff,
    all,
    total: all.length,
  };
}

export function birthdayNotificationCopy(bdays: {
  total: number;
  all: BirthdayPerson[];
  staff: BirthdayPerson[];
  students: BirthdayPerson[];
}): { title: string; body: string } {
  const names = bdays.all.slice(0, 3).map((p) => p.name);
  const more = bdays.total > 3 ? ` +${bdays.total - 3}` : "";
  const title =
    bdays.total === 1 ? `Birthday today · ${names[0]}` : `${bdays.total} birthdays today`;

  const parts: string[] = [];
  if (bdays.students.length) {
    const studentBits = bdays.students
      .slice(0, 3)
      .map((p) => (p.detail ? `${p.name} (${p.detail})` : p.name));
    parts.push(
      studentBits.join(", ") + (bdays.students.length > 3 ? ` +${bdays.students.length - 3}` : ""),
    );
  }
  if (bdays.staff.length) {
    parts.push(
      `${bdays.staff.length} staff: ${bdays.staff
        .slice(0, 2)
        .map((p) => p.name)
        .join(", ")}`,
    );
  }
  const body = parts.join(" · ") || `${names.join(", ")}${more}`;
  return { title, body };
}

/**
 * Create at most one birthday notification per user per calendar day (IST)
 * when there is at least one valid birthday today in this school.
 */
export async function ensureBirthdayNotification(opts: {
  userId: string;
  schoolId: string;
  title: string;
  body: string;
  href?: string;
}): Promise<boolean> {
  if (!opts.schoolId) return false;
  const dateKey = birthdayDateKey();
  const dayStart = schoolDayStartUtc();

  const existing = await prisma.notification.findFirst({
    where: {
      userId: opts.userId,
      schoolId: opts.schoolId,
      type: "birthday",
      createdAt: { gte: dayStart },
    },
    select: { id: true },
  });

  const payload = {
    title: opts.title,
    body: opts.body,
    href: opts.href ?? "/dashboard?birthday=1",
    metaJson: JSON.stringify({ kind: "birthday", dateKey, schoolId: opts.schoolId }),
  };

  if (existing) {
    await prisma.notification.update({
      where: { id: existing.id },
      data: { ...payload, updatedAt: new Date() },
    });
    return false;
  }

  await prisma.notification.create({
    data: {
      userId: opts.userId,
      schoolId: opts.schoolId,
      type: "birthday",
      ...payload,
    },
  });
  return true;
}

/** Mark stale / other-school birthday alerts read so the bell stays clean. */
export async function cleanupBirthdayNotifications(userId: string, schoolId: string) {
  const dayStart = schoolDayStartUtc();
  await prisma.notification.updateMany({
    where: {
      userId,
      type: "birthday",
      readAt: null,
      OR: [{ schoolId: { not: schoolId } }, { schoolId: null }, { createdAt: { lt: dayStart } }],
    },
    data: { readAt: new Date() },
  });
}
