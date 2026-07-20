/**
 * Seed realistic dummy timetables — periods divided fairly across teachers with no clashes.
 */
import type { PrismaClient } from "@/generated/prisma/client";
import {
  defaultSchoolSchedule,
  enabledDays,
  serializeDaySchedules,
  type DayScheduleConfig,
} from "@/lib/timetable";

const ACADEMIC_YEAR = "2025-26";

const SUBJECT_TEACHER_DEFS = [
  { employeeId: "TT-GUJ", firstName: "Nita", lastName: "Patel", subjects: ["Gujarati", "Moral Science"] },
  { employeeId: "TT-ENG", firstName: "Suresh", lastName: "Mehta", subjects: ["English", "General Knowledge"] },
  { employeeId: "TT-HIN", firstName: "Kavita", lastName: "Shah", subjects: ["Hindi", "Sanskrit"] },
  { employeeId: "TT-MATH", firstName: "Ramesh", lastName: "Desai", subjects: ["Mathematics"] },
  { employeeId: "TT-SCI", firstName: "Meena", lastName: "Joshi", subjects: ["Science"] },
  { employeeId: "TT-SS", firstName: "Bharat", lastName: "Chauhan", subjects: ["Social Science"] },
  { employeeId: "TT-COMP", firstName: "Anil", lastName: "Parmar", subjects: ["Computer", "Library"] },
  { employeeId: "TT-PE", firstName: "Vikram", lastName: "Rathod", subjects: ["Physical Education", "Art & Craft", "Music", "Assembly"] },
] as const;

/** Extra subjects existing school staff (EMP*) can also teach */
const EXISTING_STAFF_SUBJECTS: Record<string, string[]> = {
  EMP001: ["Social Science", "Moral Science", "General Knowledge"],
  EMP002: ["Gujarati", "Hindi", "English"],
};

/** Weekly subject mix for Mon–Fri (8) + Sat (4) = 44 slots */
const WEEKLY_SUBJECT_PLAN: string[] = [
  "Assembly", "Gujarati", "Mathematics", "Science", "English", "Social Science", "Hindi", "Physical Education",
  "Gujarati", "Mathematics", "English", "Science", "Hindi", "Computer", "Social Science", "Art & Craft",
  "Mathematics", "Gujarati", "Science", "English", "Sanskrit", "Social Science", "Library", "Moral Science",
  "English", "Mathematics", "Gujarati", "Science", "Hindi", "Computer", "General Knowledge", "Physical Education",
  "Science", "Mathematics", "English", "Gujarati", "Social Science", "Sanskrit", "Music", "Free Period",
  "Mathematics", "Gujarati", "English", "Science",
];

type TeacherPool = {
  id: string;
  employeeId: string | null;
  subjects: string[];
  load: number;
};

function roomFor(subject: string, className: string): string {
  if (subject === "Science") return "Science Lab";
  if (subject === "Computer") return "Computer Lab";
  if (subject === "Physical Education" || subject === "Assembly") return "Ground";
  if (subject === "Library") return "Library";
  if (subject === "Art & Craft" || subject === "Music") return "Activity Room";
  const short = className.replace(/^Class\s+/i, "").replace(/\s+/g, "");
  return `Room ${short || "1"}`;
}

function rotatePlan(base: string[], classOffset: number): string[] {
  if (!base.length) return base;
  const n = ((classOffset % base.length) + base.length) % base.length;
  return [...base.slice(n), ...base.slice(0, n)];
}

function slotKey(dayOfWeek: number, periodIndex: number): string {
  return `${dayOfWeek}-${periodIndex}`;
}

export type SeedTimetableResult = {
  schools: number;
  classes: number;
  entries: number;
  teachersEnsured: number;
  released: number;
};

async function ensureSubjectTeachers(
  prisma: PrismaClient,
  schoolId: string
): Promise<number> {
  let created = 0;
  for (const def of SUBJECT_TEACHER_DEFS) {
    const existing = await prisma.staff.findUnique({
      where: { schoolId_employeeId: { schoolId, employeeId: def.employeeId } },
    });
    if (existing) continue;
    await prisma.staff.create({
      data: {
        schoolId,
        employeeId: def.employeeId,
        firstName: def.firstName,
        lastName: def.lastName,
        designation: "Subject Teacher",
        department: "Teaching",
        mobileNumber: `97${String(Math.floor(10000000 + Math.random() * 89999999))}`,
        email: `${def.employeeId.toLowerCase()}@school.local`,
        gender: ["Nita", "Kavita", "Meena"].includes(def.firstName) ? "Female" : "Male",
        dateOfJoining: "01/06/2020",
        isActive: true,
      },
    });
    created++;
  }
  return created;
}

async function buildTeacherPool(prisma: PrismaClient, schoolId: string): Promise<TeacherPool[]> {
  const staff = await prisma.staff.findMany({
    where: { schoolId, isActive: true },
    select: { id: true, employeeId: true, designation: true },
    orderBy: { employeeId: "asc" },
  });

  const subjectByEmp = new Map<string, string[]>();
  for (const def of SUBJECT_TEACHER_DEFS) {
    subjectByEmp.set(def.employeeId, [...def.subjects]);
  }
  for (const [emp, subjects] of Object.entries(EXISTING_STAFF_SUBJECTS)) {
    const prev = subjectByEmp.get(emp) || [];
    subjectByEmp.set(emp, [...new Set([...prev, ...subjects])]);
  }

  const pool: TeacherPool[] = [];
  for (const s of staff) {
    const designation = (s.designation || "").toLowerCase();
    const isClerk = designation.includes("clerk") || designation.includes("accountant");
    if (isClerk) continue;

    let subjects = s.employeeId ? subjectByEmp.get(s.employeeId) : undefined;
    if (!subjects?.length) {
      // Generic teaching staff — can cover light subjects so everyone gets lectures
      subjects = ["Free Period", "Moral Science", "General Knowledge", "Library", "Art & Craft"];
    }
    pool.push({
      id: s.id,
      employeeId: s.employeeId,
      subjects,
      load: 0,
    });
  }
  return pool;
}

/**
 * Pick least-loaded free teacher who can teach the subject.
 * Falls back to any free teacher, then class teacher.
 */
function pickTeacher(
  subject: string,
  dayOfWeek: number,
  periodIndex: number,
  pool: TeacherPool[],
  busy: Map<string, Set<string>>,
  classTeacherId: string | null
): string | null {
  const key = slotKey(dayOfWeek, periodIndex);
  const isFree = (id: string) => !(busy.get(id)?.has(key));

  const specialists = pool
    .filter((t) => t.subjects.includes(subject) && isFree(t.id))
    .sort((a, b) => a.load - b.load || a.id.localeCompare(b.id));

  if (specialists[0]) return specialists[0].id;

  if (subject === "Free Period" && classTeacherId && isFree(classTeacherId)) {
    return classTeacherId;
  }

  const anyFree = pool
    .filter((t) => isFree(t.id))
    .sort((a, b) => a.load - b.load || a.id.localeCompare(b.id));
  if (anyFree[0]) return anyFree[0].id;

  // Last resort: class teacher even if busy (should be rare with enough staff)
  return classTeacherId;
}

function markBusy(
  busy: Map<string, Set<string>>,
  pool: TeacherPool[],
  teacherId: string | null,
  dayOfWeek: number,
  periodIndex: number
) {
  if (!teacherId) return;
  const key = slotKey(dayOfWeek, periodIndex);
  let set = busy.get(teacherId);
  if (!set) {
    set = new Set();
    busy.set(teacherId, set);
  }
  set.add(key);
  const t = pool.find((p) => p.id === teacherId);
  if (t) t.load++;
}

async function ensureConfig(
  prisma: PrismaClient,
  schoolId: string,
  academicYear: string
): Promise<DayScheduleConfig[]> {
  const existing = await prisma.schoolTimetableConfig.findUnique({
    where: { schoolId_academicYear: { schoolId, academicYear } },
  });
  if (existing) {
    try {
      const parsed = JSON.parse(existing.daysJson) as DayScheduleConfig[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      /* fall through */
    }
  }
  const days = defaultSchoolSchedule();
  await prisma.schoolTimetableConfig.upsert({
    where: { schoolId_academicYear: { schoolId, academicYear } },
    create: { schoolId, academicYear, daysJson: serializeDaySchedules(days) },
    update: { daysJson: serializeDaySchedules(days) },
  });
  return days;
}

async function seedSchoolTimetable(
  prisma: PrismaClient,
  schoolId: string,
  academicYear: string
): Promise<Omit<SeedTimetableResult, "schools">> {
  const schedule = await ensureConfig(prisma, schoolId, academicYear);
  const days = enabledDays(schedule);
  const teachersEnsured = await ensureSubjectTeachers(prisma, schoolId);
  const pool = await buildTeacherPool(prisma, schoolId);

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId, academicYear },
    orderBy: [{ standard: "asc" }, { section: "asc" }],
    select: { id: true, name: true, standard: true, section: true, classTeacherId: true },
  });

  if (!classes.length) {
    return { classes: 0, entries: 0, teachersEnsured, released: 0 };
  }

  await prisma.timetableEntry.deleteMany({ where: { schoolId, academicYear } });

  /** teacherId -> occupied day-period keys */
  const busy = new Map<string, Set<string>>();

  const rows: {
    schoolId: string;
    classId: string;
    academicYear: string;
    dayOfWeek: number;
    periodIndex: number;
    subject: string;
    teacherId: string | null;
    room: string;
  }[] = [];

  // Process by day/period across all classes so teachers are load-balanced without clashes
  const classPlans = classes.map((cls, idx) => ({
    cls,
    plan: rotatePlan(WEEKLY_SUBJECT_PLAN, idx * 5 + parseInt(cls.standard || "0", 10)),
  }));

  for (const day of days) {
    for (const period of day.periods) {
      // Slot index in weekly plan for this day/period
      let slotIdx = 0;
      outer: for (const d of days) {
        for (const p of d.periods) {
          if (d.dayOfWeek === day.dayOfWeek && p.index === period.index) break outer;
          slotIdx++;
        }
      }

      for (const { cls, plan } of classPlans) {
        const subject = plan[slotIdx % plan.length]!;
        const teacherId = pickTeacher(
          subject,
          day.dayOfWeek,
          period.index,
          pool,
          busy,
          cls.classTeacherId
        );
        markBusy(busy, pool, teacherId, day.dayOfWeek, period.index);

        rows.push({
          schoolId,
          classId: cls.id,
          academicYear,
          dayOfWeek: day.dayOfWeek,
          periodIndex: period.index,
          subject,
          teacherId,
          room: roomFor(subject, cls.name),
        });
      }
    }
  }

  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    await prisma.timetableEntry.createMany({ data: rows.slice(i, i + BATCH) });
  }

  let released = 0;
  for (const cls of classes) {
    await prisma.classTimetableRelease.upsert({
      where: {
        schoolId_classId_academicYear: {
          schoolId,
          classId: cls.id,
          academicYear,
        },
      },
      create: {
        schoolId,
        classId: cls.id,
        academicYear,
        isReleased: true,
        releasedAt: new Date(),
        releasedBy: "seed-timetable",
      },
      update: {
        isReleased: true,
        releasedAt: new Date(),
        releasedBy: "seed-timetable",
      },
    });
    released++;
  }

  return {
    classes: classes.length,
    entries: rows.length,
    teachersEnsured,
    released,
  };
}

export async function seedDummyTimetables(
  prisma: PrismaClient,
  opts?: { schoolCode?: string; academicYear?: string }
): Promise<SeedTimetableResult> {
  const academicYear = opts?.academicYear || ACADEMIC_YEAR;
  const schools = await prisma.school.findMany({
    where: opts?.schoolCode ? { code: opts.schoolCode } : undefined,
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  const result: SeedTimetableResult = {
    schools: 0,
    classes: 0,
    entries: 0,
    teachersEnsured: 0,
    released: 0,
  };

  for (const school of schools) {
    const part = await seedSchoolTimetable(prisma, school.id, academicYear);
    result.schools++;
    result.classes += part.classes;
    result.entries += part.entries;
    result.teachersEnsured += part.teachersEnsured;
    result.released += part.released;

    // Keep demo teacher login linked to EMP002 (Priya) when present
    if (school.code === "SONGADH001") {
      const priya = await prisma.staff.findFirst({
        where: { schoolId: school.id, employeeId: "EMP002" },
      });
      if (priya) {
        await prisma.user.updateMany({
          where: { email: "teacher@songadh.local", schoolId: school.id },
          data: {
            staffId: priya.id,
            name: `${priya.firstName} ${priya.lastName} (Teacher)`,
            role: "teacher",
          },
        });
      }
    }

    const loadRows = await prisma.timetableEntry.groupBy({
      by: ["teacherId"],
      where: { schoolId: school.id, academicYear, teacherId: { not: null } },
      _count: { _all: true },
    });
    const staffIds = loadRows.map((r) => r.teacherId!).filter(Boolean);
    const staff = staffIds.length
      ? await prisma.staff.findMany({
          where: { id: { in: staffIds } },
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        })
      : [];
    const byId = new Map(staff.map((s) => [s.id, s]));
    const summary = loadRows
      .map((r) => {
        const s = byId.get(r.teacherId!);
        const name = s ? `${s.firstName} ${s.lastName}` : r.teacherId;
        return `${name}:${r._count._all}`;
      })
      .sort()
      .join(", ");

    console.log(
      `  ✓ ${school.code} (${school.name}): ${part.classes} classes, ${part.entries} entries, ${part.teachersEnsured} teachers added, ${part.released} released`
    );
    if (summary) console.log(`    loads → ${summary}`);
  }

  return result;
}
