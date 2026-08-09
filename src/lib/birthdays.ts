import "server-only";

import { prisma } from "@/lib/db";
import { calcAgeYears, parseDobToDate } from "@/lib/student-age";
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
 * Compare DOB month/day to "today" in Asia/Kolkata (IST).
 * Avoids UTC server midnight lag (e.g. 12:51 AM IST still UTC previous day).
 */
export function isBirthdayToday(dob: string | null | undefined, onDate = new Date()): boolean {
  const dt = parseDobToDate(dob);
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
  const en = [first, last].filter(Boolean).join(" ").trim();
  const gu = [firstGu, lastGu].filter(Boolean).join(" ").trim();
  return { en: en || "—", gu: gu || null };
}

/** Fetch students + staff whose birthday is today for a school. */
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
  const [studentRows, staffRows] = await Promise.all([
    prisma.student.findMany({
      where: {
        schoolId,
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
    if (!isBirthdayToday(s.dateOfBirth, onDate)) continue;
    const { en, gu } = personName(s.firstName, s.surname, s.firstNameGu, s.surnameGu);
    const classLabel =
      s.schoolClass?.name ||
      [s.standard, s.section].filter(Boolean).join("-") ||
      "—";
    students.push({
      id: s.id,
      kind: "student",
      name: en,
      nameGu: gu,
      dateOfBirth: s.dateOfBirth,
      age: calcAgeYears(s.dateOfBirth, onDate),
      detail: classLabel,
      href: `/students/${s.id}`,
      photoPath: s.photoPath,
    });
  }

  const staff: BirthdayPerson[] = [];
  for (const s of staffRows) {
    if (!isBirthdayToday(s.dateOfBirth, onDate)) continue;
    const { en, gu } = personName(s.firstName, s.lastName, s.firstNameGu, s.lastNameGu);
    staff.push({
      id: s.id,
      kind: "staff",
      name: en,
      nameGu: gu,
      dateOfBirth: s.dateOfBirth || "",
      age: calcAgeYears(s.dateOfBirth, onDate),
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

/**
 * Create at most one birthday notification per user per calendar day (IST)
 * when there is at least one birthday today.
 */
export async function ensureBirthdayNotification(opts: {
  userId: string;
  schoolId: string;
  title: string;
  body: string;
  href?: string;
}): Promise<boolean> {
  const dateKey = birthdayDateKey();
  const dayStart = schoolDayStartUtc();

  const existing = await prisma.notification.findFirst({
    where: {
      userId: opts.userId,
      type: "birthday",
      createdAt: { gte: dayStart },
    },
    select: { id: true, metaJson: true },
  });

  if (existing) {
    await prisma.notification.update({
      where: { id: existing.id },
      data: {
        title: opts.title,
        body: opts.body,
        href: opts.href ?? "/dashboard",
        metaJson: JSON.stringify({ kind: "birthday", dateKey }),
        updatedAt: new Date(),
      },
    });
    return false;
  }

  await prisma.notification.create({
    data: {
      userId: opts.userId,
      schoolId: opts.schoolId,
      type: "birthday",
      title: opts.title,
      body: opts.body,
      href: opts.href ?? "/dashboard?birthday=1",
      metaJson: JSON.stringify({ kind: "birthday", dateKey }),
    },
  });
  return true;
}
