/**
 * Wipe ALL operational / dummy data for school code 24261004403.
 * Keeps: School row, SchoolSettings, SchoolSubscription, school_admin users.
 *
 * Usage: npx tsx scripts/wipe-school-24261004403.ts
 */
import { prisma } from "../src/lib/db";

const SCHOOL_CODE = "24261004403";

async function countAll(schoolId: string) {
  return {
    students: await prisma.student.count({ where: { schoolId } }),
    staff: await prisma.staff.count({ where: { schoolId } }),
    classes: await prisma.schoolClass.count({ where: { schoolId } }),
    users: await prisma.user.count({ where: { schoolId } }),
    holidays: await prisma.holiday.count({ where: { schoolId } }),
    vouchers: await prisma.voucher.count({ where: { schoolId } }),
    accounts: await prisma.account.count({ where: { schoolId } }),
    financialYears: await prisma.financialYear.count({ where: { schoolId } }),
    exams: await prisma.exam.count({ where: { schoolId } }),
    attendanceMonths: await prisma.studentAttendanceMonth.count({ where: { schoolId } }),
    staffAttendance: await prisma.staffAttendanceMonth.count({ where: { schoolId } }),
    payrolls: await prisma.staffPayroll.count({ where: { schoolId } }),
    salaryRows: await prisma.salaryStatementRow.count({ where: { schoolId } }),
    salarySlips: await prisma.staffSalarySlipRow.count({ where: { schoolId } }),
    taxForms: await prisma.staffIncomeTaxForm.count({ where: { schoolId } }),
    gr: await prisma.generalRegisterEntry.count({ where: { schoolId } }),
    dailyAtt: await prisma.dailyAttendanceBook.count({ where: { schoolId } }),
    timetable: await prisma.timetableEntry.count({ where: { schoolId } }),
    timetableConfigs: await prisma.schoolTimetableConfig.count({ where: { schoolId } }),
    timetableReleases: await prisma.classTimetableRelease.count({ where: { schoolId } }),
    subjects: await prisma.schoolSubject.count({ where: { schoolId } }),
    stdSubjects: await prisma.standardSubject.count({ where: { schoolId } }),
    sms: await prisma.smsInboxMessage.count({ where: { schoolId } }),
    activities: await prisma.activity.count({ where: { schoolId } }),
    notifications: await prisma.notification.count({ where: { schoolId } }),
    bulk: await prisma.bulkSubmission.count({ where: { schoolId } }),
    jobs: await prisma.automationJob.count({ where: { schoolId } }),
    idCardLinks: await prisma.idCardShareLink.count({ where: { schoolId } }),
    chatRooms: await prisma.chatRoom.count({ where: { schoolId } }),
    help: await prisma.helpConversation.count({ where: { schoolId } }),
    examSeats: await prisma.examSeatAssignment.count({ where: { schoolId } }),
    payments: await prisma.schoolPayment.count({ where: { schoolId } }),
    caAudits: await prisma.caAuditSession.count({ where: { schoolId } }),
    caAssignments: await prisma.caSchoolAssignment.count({ where: { schoolId } }),
  };
}

async function main() {
  const school = await prisma.school.findFirst({
    where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
    select: { id: true, name: true, code: true, udiseCode: true },
  });
  if (!school) {
    throw new Error(`School ${SCHOOL_CODE} not found`);
  }

  const schoolId = school.id;
  console.log(`School: ${school.name} (${school.code}) id=${schoolId}`);
  console.log("Before:", await countAll(schoolId));

  const students = await prisma.student.findMany({
    where: { schoolId },
    select: { id: true },
  });
  const studentIds = students.map((s) => s.id);

  const staff = await prisma.staff.findMany({
    where: { schoolId },
    select: { id: true },
  });
  const staffIds = staff.map((s) => s.id);

  const exams = await prisma.exam.findMany({
    where: { schoolId },
    select: { id: true },
  });
  const examIds = exams.map((e) => e.id);

  const activities = await prisma.activity.findMany({
    where: { schoolId },
    select: { id: true },
  });
  const activityIds = activities.map((a) => a.id);

  const chatRooms = await prisma.chatRoom.findMany({
    where: { schoolId },
    select: { id: true },
  });
  const chatRoomIds = chatRooms.map((r) => r.id);

  const vouchers = await prisma.voucher.findMany({
    where: { schoolId },
    select: { id: true },
  });
  const voucherIds = vouchers.map((v) => v.id);

  const dailyBooks = await prisma.dailyAttendanceBook.findMany({
    where: { schoolId },
    select: { id: true },
  });
  const dailyBookIds = dailyBooks.map((b) => b.id);

  const caSessions = await prisma.caAuditSession.findMany({
    where: { schoolId },
    select: { id: true },
  });
  const caSessionIds = caSessions.map((s) => s.id);

  // Non-admin users for this school (student / teacher portal accounts)
  const nonAdminUsers = await prisma.user.findMany({
    where: {
      schoolId,
      role: { notIn: ["school_admin", "super_admin"] },
    },
    select: { id: true, email: true, role: true },
  });
  const nonAdminUserIds = nonAdminUsers.map((u) => u.id);

  console.log(`\nWiping… students=${studentIds.length} staff=${staffIds.length} nonAdminUsers=${nonAdminUsers.length}`);

  await prisma.$transaction(async (tx) => {
    // Exam results / seats / subjects
    if (examIds.length) {
      await tx.examResult.deleteMany({ where: { examId: { in: examIds } } });
      await tx.examSeatAssignment.deleteMany({ where: { schoolId } });
      await tx.examSubject.deleteMany({ where: { examId: { in: examIds } } });
      await tx.exam.deleteMany({ where: { schoolId } });
    }

    if (studentIds.length) {
      await tx.reportCard.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.studentAttendanceMonth.deleteMany({ where: { schoolId } });
      await tx.generalRegisterEntry.deleteMany({ where: { schoolId } });
      if (activityIds.length) {
        await tx.activityParticipant.deleteMany({
          where: { activityId: { in: activityIds } },
        });
      }
    }

    if (activityIds.length) {
      await tx.activity.deleteMany({ where: { schoolId } });
    }

    if (dailyBookIds.length) {
      await tx.dailyAttendanceBookRow.deleteMany({
        where: { bookId: { in: dailyBookIds } },
      });
      await tx.dailyAttendanceBook.deleteMany({ where: { schoolId } });
    }

    // Staff HR
    await tx.staffAttendanceMonth.deleteMany({ where: { schoolId } });
    await tx.staffPayroll.deleteMany({ where: { schoolId } });
    await tx.staffSalarySlipRow.deleteMany({ where: { schoolId } });
    await tx.staffIncomeTaxForm.deleteMany({ where: { schoolId } });
    await tx.salaryStatementRow.deleteMany({ where: { schoolId } });

    // Timetable / subjects
    await tx.timetableEntry.deleteMany({ where: { schoolId } });
    await tx.classTimetableRelease.deleteMany({ where: { schoolId } });
    await tx.schoolTimetableConfig.deleteMany({ where: { schoolId } });
    await tx.standardSubject.deleteMany({ where: { schoolId } });
    await tx.schoolSubject.deleteMany({ where: { schoolId } });

    // Accounting
    if (voucherIds.length) {
      await tx.voucherLine.deleteMany({ where: { voucherId: { in: voucherIds } } });
      await tx.voucher.deleteMany({ where: { schoolId } });
    }
    await tx.account.deleteMany({ where: { schoolId } });
    if (caSessionIds.length) {
      await tx.auditAction.deleteMany({ where: { sessionId: { in: caSessionIds } } });
      await tx.caAuditSession.deleteMany({ where: { schoolId } });
    }
    await tx.financialYear.deleteMany({ where: { schoolId } });

    // Chat
    if (chatRoomIds.length) {
      await tx.chatAttachment.deleteMany({
        where: { message: { roomId: { in: chatRoomIds } } },
      });
      await tx.chatMessage.deleteMany({ where: { roomId: { in: chatRoomIds } } });
      await tx.chatParticipant.deleteMany({ where: { roomId: { in: chatRoomIds } } });
      await tx.chatRoom.deleteMany({ where: { schoolId } });
    }

    // Misc school-scoped
    await tx.holiday.deleteMany({ where: { schoolId } });
    await tx.smsInboxMessage.deleteMany({ where: { schoolId } });
    await tx.notification.deleteMany({ where: { schoolId } });
    await tx.bulkSubmission.deleteMany({ where: { schoolId } });
    await tx.automationJob.deleteMany({ where: { schoolId } });
    await tx.idCardShareLink.deleteMany({ where: { schoolId } });
    await tx.schoolPayment.deleteMany({ where: { schoolId } });
    await tx.helpConversation.deleteMany({ where: { schoolId } });
    await tx.caSchoolAssignment.deleteMany({ where: { schoolId } });

    // Unlink users from staff/students before deleting those rows
    if (studentIds.length) {
      await tx.user.updateMany({
        where: { studentId: { in: studentIds } },
        data: { studentId: null },
      });
    }
    if (staffIds.length) {
      await tx.user.updateMany({
        where: { staffId: { in: staffIds } },
        data: { staffId: null },
      });
    }

    // Delete non-admin school users (sessions/login cascade)
    if (nonAdminUserIds.length) {
      await tx.userSession.deleteMany({ where: { userId: { in: nonAdminUserIds } } });
      await tx.loginEvent.deleteMany({ where: { userId: { in: nonAdminUserIds } } });
      await tx.notification.deleteMany({ where: { userId: { in: nonAdminUserIds } } });
      await tx.user.deleteMany({ where: { id: { in: nonAdminUserIds } } });
    }

    // Core entities
    if (studentIds.length) {
      await tx.student.deleteMany({ where: { schoolId } });
    }
    if (staffIds.length) {
      await tx.staff.deleteMany({ where: { schoolId } });
    }

    // ClassSubject cascades from SchoolClass
    await tx.schoolClass.deleteMany({ where: { schoolId } });
  }, { timeout: 120_000 });

  const after = await countAll(schoolId);
  const remainingAdmins = await prisma.user.findMany({
    where: { schoolId },
    select: { email: true, role: true, name: true },
  });

  console.log("\nAfter:", after);
  console.log("Kept school_admin users:", remainingAdmins);
  console.log("\nDone. School record + settings/subscription preserved.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
