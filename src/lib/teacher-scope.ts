import "server-only";

import { prisma } from "@/lib/db";
import { AuthError, type SessionUser } from "@/lib/auth";
import {
  getOrCreateTimetableConfig,
  getReleasedClassIds,
} from "@/lib/timetable-server";
import { periodForDay, type DayScheduleConfig } from "@/lib/timetable";

export type TeacherClassScope = {
  id: string;
  name: string;
  standard: string;
  section: string;
  stream: string;
  academicYear: string;
  isHomeroom: boolean;
  isTeaching: boolean;
  canMarkAttendance: boolean;
  canEnterMarks: boolean;
  subjects: string[];
  subjectCodes: string[];
};

export type TeacherCurrentPeriod = {
  classId: string;
  className: string;
  subject: string;
  periodIndex: number;
  startTime: string | null;
  endTime: string | null;
  label: string;
  room: string | null;
} | null;

export type TeacherScope = {
  linked: boolean;
  staffId: string | null;
  academicYear: string;
  defaultClassId: string | null;
  currentPeriod: TeacherCurrentPeriod;
  classes: TeacherClassScope[];
  attendanceClassIds: string[];
  marksClassIds: string[];
  homeroomClassIds: string[];
};

type SchoolSession = SessionUser & { schoolId: string };

const NON_MARKS_SUBJECTS = new Set([
  "free period",
  "assembly",
  "library",
  "lunch",
  "break",
]);

/** English timetable names ↔ marks-sheet codes / Gujarati names */
const SUBJECT_GROUPS: string[][] = [
  ["gujarati", "guj", "ગુજરાતી"],
  ["english", "eng", "અંગ્રેજી"],
  ["hindi", "hin", "હિન્દી"],
  ["mathematics", "math", "maths", "ગણિત"],
  ["science", "sci", "વિજ્ઞાન"],
  ["social science", "ss", "sst", "સામાજિક વિજ્ઞાન"],
  ["sanskrit", "san", "સંસ્કૃત"],
  ["computer", "comp", "કોમ્પ્યુટર"],
  ["physical education", "pe", "pt", "શા. શિક્ષણ", "શા. & શિ.", "શા.અ"],
  ["art & craft", "art", "ચિત્રકામ"],
  ["music", "mus"],
  ["moral science", "moral"],
  ["general knowledge", "gk"],
  ["economics", "eco", "અર્થશાસ્ત્ર"],
  ["accountancy", "acc", "હિસાબ વિજ્ઞાન", "accounting"],
  ["business administration", "bom", "વ્યવ.પ્રશાસન", "વ્ય.પ્ર"],
  ["book keeping", "bk", "લેખાંકન"],
  ["statistics", "stat", "સંખ્યાશાસ્ત્ર"],
  ["history", "his", "ઇતિહાસ"],
  ["geography", "geo", "ભૂગોળ"],
  ["psychology", "psy", "મનોવિજ્ઞાન"],
  ["industry", "ind", "ઉદ્યોગ"],
];

function normalizeSubjectKey(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0a80-\u0aff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function subjectGroupIndex(value: string): number {
  const key = normalizeSubjectKey(value);
  if (!key) return -1;
  return SUBJECT_GROUPS.findIndex((group) =>
    group.some((alias) => normalizeSubjectKey(alias) === key),
  );
}

export function timetableSubjectMatchesDef(
  timetableName: string,
  def: { name: string; code: string; shortName?: string },
): boolean {
  const t = normalizeSubjectKey(timetableName);
  if (!t) return false;
  const candidates = [def.code, def.name, def.shortName || ""].map(normalizeSubjectKey);
  if (candidates.includes(t)) return true;
  const tGroup = subjectGroupIndex(timetableName);
  if (tGroup < 0) return false;
  return [def.code, def.name, def.shortName || ""].some(
    (v) => subjectGroupIndex(v) === tGroup,
  );
}

export function isMarksSubjectName(subject: string): boolean {
  const key = normalizeSubjectKey(subject);
  return Boolean(key) && !NON_MARKS_SUBJECTS.has(key);
}

function hhmmToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function nowInIndia(): { dayOfWeek: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value || "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return { dayOfWeek: map[weekday] || 1, minutes: hour * 60 + minute };
}

async function resolveAcademicYear(schoolId: string, fallback?: string | null) {
  const settings = await prisma.schoolSettings.findFirst({
    where: { schoolId },
    select: { academicYear: true },
  });
  return settings?.academicYear || fallback || "2025-26";
}

function emptyScope(academicYear: string): TeacherScope {
  return {
    linked: false,
    staffId: null,
    academicYear,
    defaultClassId: null,
    currentPeriod: null,
    classes: [],
    attendanceClassIds: [],
    marksClassIds: [],
    homeroomClassIds: [],
  };
}

export async function getTeacherScope(
  session: SchoolSession,
  opts?: { academicYear?: string | null },
): Promise<TeacherScope> {
  const academicYear = opts?.academicYear
    ? String(opts.academicYear)
    : await resolveAcademicYear(session.schoolId);

  const staffId = session.staffId || null;
  if (!staffId) return emptyScope(academicYear);

  const [homeroomRows, releasedIds, daysConfig] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId: session.schoolId, classTeacherId: staffId },
      orderBy: [{ standard: "asc" }, { section: "asc" }],
      select: {
        id: true,
        name: true,
        standard: true,
        section: true,
        stream: true,
        academicYear: true,
      },
    }),
    getReleasedClassIds(session.schoolId, academicYear).catch(
      () => new Set<string>(),
    ),
    getOrCreateTimetableConfig(session.schoolId, academicYear).catch(
      () => [] as DayScheduleConfig[],
    ),
  ]);

  const releasedList = Array.from(releasedIds);
  const entries = releasedList.length
    ? await prisma.timetableEntry.findMany({
        where: {
          schoolId: session.schoolId,
          academicYear,
          teacherId: staffId,
          classId: { in: releasedList },
        },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              standard: true,
              section: true,
              stream: true,
              academicYear: true,
            },
          },
        },
        orderBy: [{ dayOfWeek: "asc" }, { periodIndex: "asc" }],
      })
    : [];

  const classMap = new Map<
    string,
    {
      id: string;
      name: string;
      standard: string;
      section: string;
      stream: string;
      academicYear: string;
      isHomeroom: boolean;
      subjectNames: Set<string>;
    }
  >();

  for (const cls of homeroomRows) {
    classMap.set(cls.id, {
      ...cls,
      isHomeroom: true,
      subjectNames: new Set<string>(),
    });
  }

  for (const entry of entries) {
    const existing = classMap.get(entry.classId);
    if (existing) {
      if (entry.subject) existing.subjectNames.add(entry.subject);
      continue;
    }
    const cls = entry.class;
    if (!cls) continue;
    classMap.set(entry.classId, {
      id: cls.id,
      name: cls.name,
      standard: cls.standard,
      section: cls.section,
      stream: cls.stream,
      academicYear: cls.academicYear,
      isHomeroom: false,
      subjectNames: new Set(entry.subject ? [entry.subject] : []),
    });
  }

  const classIds = Array.from(classMap.keys());
  const classSubjects = classIds.length
    ? await prisma.classSubject.findMany({
        where: { classId: { in: classIds }, isActive: true },
        select: { classId: true, name: true, code: true, shortName: true },
      })
    : [];

  const subjectsByClass = new Map<
    string,
    { name: string; code: string; shortName: string }[]
  >();
  for (const row of classSubjects) {
    const list = subjectsByClass.get(row.classId) || [];
    list.push(row);
    subjectsByClass.set(row.classId, list);
  }

  const classes: TeacherClassScope[] = Array.from(classMap.values())
    .sort((a, b) => {
      if (a.isHomeroom !== b.isHomeroom) return a.isHomeroom ? -1 : 1;
      const std = Number(a.standard) - Number(b.standard);
      if (std !== 0) return std;
      return a.section.localeCompare(b.section);
    })
    .map((cls) => {
      const subjects = Array.from(cls.subjectNames).filter(Boolean);
      const defs = subjectsByClass.get(cls.id) || [];
      const subjectCodes = [
        ...new Set(
          subjects
            .filter(isMarksSubjectName)
            .flatMap((name) =>
              defs
                .filter((def) => timetableSubjectMatchesDef(name, def))
                .map((def) => def.code),
            ),
        ),
      ];
      const isTeaching = subjects.length > 0;
      return {
        id: cls.id,
        name: cls.name,
        standard: cls.standard,
        section: cls.section,
        stream: cls.stream,
        academicYear: cls.academicYear,
        isHomeroom: cls.isHomeroom,
        isTeaching,
        canMarkAttendance: cls.isHomeroom || isTeaching,
        canEnterMarks: subjectCodes.length > 0,
        subjects,
        subjectCodes,
      };
    });

  const clock = nowInIndia();
  let currentPeriod: TeacherCurrentPeriod = null;
  const todayEntries = entries.filter((e) => e.dayOfWeek === clock.dayOfWeek);
  for (const entry of todayEntries) {
    const period = daysConfig.length
      ? periodForDay(daysConfig, entry.dayOfWeek, entry.periodIndex)
      : null;
    if (!period) continue;
    const start = hhmmToMinutes(period.start);
    const end = hhmmToMinutes(period.end);
    if (start == null || end == null) continue;
    if (clock.minutes < start || clock.minutes >= end) continue;
    currentPeriod = {
      classId: entry.classId,
      className: entry.class?.name || `${entry.class?.standard}-${entry.class?.section}`,
      subject: entry.subject,
      periodIndex: entry.periodIndex,
      startTime: period.start,
      endTime: period.end,
      label: `P${period.index}`,
      room: entry.room,
    };
    break;
  }

  const homeroomClassIds = classes.filter((c) => c.isHomeroom).map((c) => c.id);
  const attendanceClassIds = classes
    .filter((c) => c.canMarkAttendance)
    .map((c) => c.id);
  const marksClassIds = classes.filter((c) => c.canEnterMarks).map((c) => c.id);
  const defaultClassId =
    homeroomClassIds[0] ||
    currentPeriod?.classId ||
    attendanceClassIds[0] ||
    null;

  return {
    linked: true,
    staffId,
    academicYear,
    defaultClassId,
    currentPeriod,
    classes,
    attendanceClassIds,
    marksClassIds,
    homeroomClassIds,
  };
}

export async function assertTeacherAttendanceAccess(
  session: SchoolSession,
  classId: string | null | undefined,
) {
  if (session.role !== "teacher") return;
  if (!session.staffId) {
    throw new AuthError("Staff profile not linked to your account", 403);
  }
  if (!classId) {
    throw new AuthError("Select your class to mark attendance", 400);
  }
  const scope = await getTeacherScope(session);
  if (!scope.attendanceClassIds.includes(classId)) {
    throw new AuthError(
      "You can only mark attendance for your class or a class you teach on the timetable",
      403,
    );
  }
}

export async function assertTeacherHomeroomAccess(
  session: SchoolSession,
  classId: string | null | undefined,
) {
  if (session.role !== "teacher") return;
  if (!session.staffId) {
    throw new AuthError("Staff profile not linked to your account", 403);
  }
  if (!classId) {
    throw new AuthError("Select your class", 400);
  }
  const scope = await getTeacherScope(session);
  if (!scope.homeroomClassIds.includes(classId)) {
    throw new AuthError("You can only manage this for your assigned class", 403);
  }
}

export async function assertTeacherMarksAccess(
  session: SchoolSession,
  classId: string | null | undefined,
) {
  if (session.role !== "teacher") return;
  if (!session.staffId) {
    throw new AuthError("Staff profile not linked to your account", 403);
  }
  if (!classId) {
    throw new AuthError("Select a class to enter marks", 400);
  }
  const scope = await getTeacherScope(session);
  const cls = scope.classes.find((c) => c.id === classId);
  if (!cls || (!cls.canEnterMarks && !cls.isHomeroom && !cls.isTeaching)) {
    throw new AuthError(
      "You can only enter marks for classes assigned on the timetable",
      403,
    );
  }
}

export async function teacherClassIds(
  session: SchoolSession,
): Promise<string[]> {
  if (session.role !== "teacher" || !session.staffId) return [];
  const scope = await getTeacherScope(session);
  return scope.attendanceClassIds;
}

export async function teacherSubjectCodesForClass(
  session: SchoolSession,
  classId: string,
): Promise<string[] | null> {
  if (session.role !== "teacher") return null;
  const scope = await getTeacherScope(session);
  const cls = scope.classes.find((c) => c.id === classId);
  return cls?.subjectCodes ?? [];
}

export function filterByTeacherSubjects<T extends { code?: string | null; subjectCode?: string | null }>(
  items: T[],
  allowedCodes: string[] | null,
): T[] {
  if (!allowedCodes) return items;
  if (!allowedCodes.length) return [];
  const set = new Set(allowedCodes.map((c) => c.toUpperCase()));
  return items.filter((item) => {
    const code = String(item.code || item.subjectCode || "").toUpperCase();
    return set.has(code);
  });
}
