import { rm } from "fs/promises";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getStudentUploadRoot } from "@/lib/student-documents.server";

type Tx = Prisma.TransactionClient;

function parseIdList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function removeStudentFromJsonIdLists(tx: Tx, schoolId: string, studentId: string) {
  const jobs = await tx.automationJob.findMany({
    where: { schoolId },
    select: { id: true, studentIds: true, studentProgress: true },
  });

  for (const job of jobs) {
    const ids = parseIdList(job.studentIds);
    if (!ids.includes(studentId)) continue;

    const nextIds = ids.filter((id) => id !== studentId);
    if (nextIds.length === 0) {
      await tx.automationJob.delete({ where: { id: job.id } });
      continue;
    }

    let nextProgress = job.studentProgress;
    if (job.studentProgress) {
      try {
        const progress = JSON.parse(job.studentProgress) as Record<string, unknown>;
        if (progress && typeof progress === "object") {
          delete progress[studentId];
          nextProgress = JSON.stringify(progress);
        }
      } catch {
        // keep as-is
      }
    }

    await tx.automationJob.update({
      where: { id: job.id },
      data: {
        studentIds: JSON.stringify(nextIds),
        studentProgress: nextProgress,
        totalCount: nextIds.length,
      },
    });
  }

  const bulkRows = await tx.bulkSubmission.findMany({
    where: { schoolId },
    select: { id: true, studentIds: true, results: true },
  });

  for (const row of bulkRows) {
    const ids = parseIdList(row.studentIds);
    if (!ids.includes(studentId)) continue;

    const nextIds = ids.filter((id) => id !== studentId);
    if (nextIds.length === 0) {
      await tx.bulkSubmission.delete({ where: { id: row.id } });
      continue;
    }

    let nextResults = row.results;
    if (row.results) {
      try {
        const parsed = JSON.parse(row.results) as unknown;
        if (Array.isArray(parsed)) {
          nextResults = JSON.stringify(parsed.filter((r) => {
            if (!r || typeof r !== "object") return true;
            const id = (r as { studentId?: string; id?: string }).studentId
              ?? (r as { id?: string }).id;
            return id !== studentId;
          }));
        }
      } catch {
        // keep as-is
      }
    }

    await tx.bulkSubmission.update({
      where: { id: row.id },
      data: {
        studentIds: JSON.stringify(nextIds),
        results: nextResults,
        totalCount: nextIds.length,
      },
    });
  }
}

async function deleteStudentNotifications(tx: Tx, schoolId: string, studentId: string) {
  const href = `/students/${studentId}`;
  const hrefPrefix = `${href}/`;
  const metaNeedle1 = `%"studentId":"${studentId}"%`;
  const metaNeedle2 = `%"studentId": "${studentId}"%`;

  // Avoid Prisma `contains` (LIKE) — mixed utf8mb4 collations on production MySQL.
  await tx.$executeRaw`
    DELETE FROM notification
    WHERE schoolId = ${schoolId}
      AND (
        href COLLATE utf8mb4_unicode_ci = ${href}
        OR href COLLATE utf8mb4_unicode_ci LIKE ${`${hrefPrefix}%`}
        OR metaJson COLLATE utf8mb4_unicode_ci LIKE ${metaNeedle1}
        OR metaJson COLLATE utf8mb4_unicode_ci LIKE ${metaNeedle2}
      )
  `;
}

async function deleteStudentPortalUser(tx: Tx, studentId: string) {
  const account = await tx.user.findUnique({
    where: { studentId },
    select: { id: true },
  });
  if (!account) return;

  await tx.userSession.updateMany({
    where: { userId: account.id, revokedAt: null },
    data: {
      revokedAt: new Date(),
      revokeReason: "student_deleted",
    },
  });

  // Unlink optional references that may not cascade on all DB setups
  await tx.auditAction.updateMany({
    where: { userId: account.id },
    data: { userId: null },
  });
  await tx.voucher.updateMany({
    where: { createdById: account.id },
    data: { createdById: null },
  });
  await tx.financialYear.updateMany({
    where: { submittedById: account.id },
    data: { submittedById: null },
  });
  await tx.helpConversation.updateMany({
    where: { assignedToId: account.id },
    data: { assignedToId: null },
  });

  await tx.user.delete({ where: { id: account.id } });
}

/** Delete all DB rows tied to one student (call inside a transaction). */
export async function deleteStudentRecords(
  tx: Tx,
  opts: { studentId: string; schoolId: string },
): Promise<void> {
  const { studentId, schoolId } = opts;

  await tx.generalRegisterEntry.deleteMany({ where: { studentId } });
  await removeStudentFromJsonIdLists(tx, schoolId, studentId);
  await deleteStudentNotifications(tx, schoolId, studentId);
  await deleteStudentPortalUser(tx, studentId);

  // Cascades: exam results, seat assignments, report cards, attendance months, activity participants
  await tx.student.delete({ where: { id: studentId } });
}

export async function deleteStudentUploadFiles(studentId: string): Promise<void> {
  const root = getStudentUploadRoot(studentId);
  try {
    await rm(root, { recursive: true, force: true });
  } catch {
    // uploads folder may not exist
  }
}

/** Full student removal — DB transaction + uploaded files. */
export async function deleteStudentCompletely(opts: {
  studentId: string;
  schoolId: string;
}): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await deleteStudentRecords(tx, opts);
    },
    { timeout: 60_000 },
  );
  await deleteStudentUploadFiles(opts.studentId);
}
