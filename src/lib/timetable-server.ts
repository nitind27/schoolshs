import "server-only";

import { prisma } from "@/lib/db";
import {
  defaultSchoolSchedule,
  parseDaySchedules,
  serializeDaySchedules,
  type DayScheduleConfig,
} from "@/lib/timetable";

export async function getOrCreateTimetableConfig(
  schoolId: string,
  academicYear: string,
): Promise<DayScheduleConfig[]> {
  const row = await prisma.schoolTimetableConfig.findUnique({
    where: { schoolId_academicYear: { schoolId, academicYear } },
  });

  if (row) return parseDaySchedules(row.daysJson);

  const days = defaultSchoolSchedule();
  await prisma.schoolTimetableConfig.create({
    data: {
      schoolId,
      academicYear,
      daysJson: serializeDaySchedules(days),
    },
  });
  return days;
}

export async function saveTimetableConfig(
  schoolId: string,
  academicYear: string,
  days: DayScheduleConfig[],
): Promise<DayScheduleConfig[]> {
  const daysJson = serializeDaySchedules(days);
  await prisma.schoolTimetableConfig.upsert({
    where: { schoolId_academicYear: { schoolId, academicYear } },
    create: { schoolId, academicYear, daysJson },
    update: { daysJson },
  });
  return days;
}

export async function getClassRelease(
  schoolId: string,
  classId: string,
  academicYear: string,
) {
  return prisma.classTimetableRelease.findUnique({
    where: { schoolId_classId_academicYear: { schoolId, classId, academicYear } },
  });
}

export async function setClassRelease(
  schoolId: string,
  classId: string,
  academicYear: string,
  release: boolean,
  releasedBy?: string,
) {
  return prisma.classTimetableRelease.upsert({
    where: { schoolId_classId_academicYear: { schoolId, classId, academicYear } },
    create: {
      schoolId,
      classId,
      academicYear,
      isReleased: release,
      releasedAt: release ? new Date() : null,
      releasedBy: release ? releasedBy ?? null : null,
    },
    update: {
      isReleased: release,
      releasedAt: release ? new Date() : null,
      releasedBy: release ? releasedBy ?? null : null,
    },
  });
}

export async function getReleasedClassIds(
  schoolId: string,
  academicYear: string,
): Promise<Set<string>> {
  const rows = await prisma.classTimetableRelease.findMany({
    where: { schoolId, academicYear, isReleased: true },
    select: { classId: true },
  });
  return new Set(rows.map((r) => r.classId));
}
