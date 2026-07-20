import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { parseStreamFromClassName } from "@/lib/board-records/class-utils";
import { getBoardResultListConfig } from "@/lib/board-records/result-list-config";
import {
  buildBoardResultListRow,
  padBoardResultListRows,
} from "@/lib/board-records/result-list-data";
import { fetchGsebResult } from "@/lib/gseb/fetch-gseb";
import { seatFieldsForStandard, studentUpdateFromGseb } from "@/lib/gseb/persist-gseb-result";

const BOARD_STANDARDS = ["10", "12"];
const BATCH_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function assertClassAccess(schoolId: string, classId: string, role: string, staffId?: string | null) {
  const cls = await prisma.schoolClass.findFirst({
    where: { id: classId, schoolId },
  });
  if (!cls) return null;
  if (role === "teacher" && staffId && cls.classTeacherId !== staffId) {
    throw new AuthError("You can only edit your own class", 403);
  }
  if (!BOARD_STANDARDS.includes(cls.standard)) {
    throw new AuthError("Board result list is only for Class 10 and Class 12", 400);
  }
  return cls;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const body = await request.json();
    const classId = String(body.classId || "");
    if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

    const cls = await assertClassAccess(session.schoolId, classId, session.role, session.staffId);
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const standard = cls.standard as "10" | "12";
    const stream = parseStreamFromClassName(cls.name, cls.standard, cls.stream);
    const config = getBoardResultListConfig(standard, stream);
    const digitLen = standard === "12" ? 6 : 7;

    const students = await prisma.student.findMany({
      where: {
        schoolId: session.schoolId,
        OR: [
          { classId },
          { classId: null, standard: cls.standard, section: cls.section },
        ],
      },
      select: {
        id: true,
        firstName: true,
        surname: true,
        middleName: true,
        fatherName: true,
        grNumber: true,
        dateOfBirth: true,
        caste: true,
        category: true,
        rollNumber: true,
        standard: true,
        percentage10th: true,
        percentage12th: true,
        sscSeatPrefix: true,
        sscSeatNumber: true,
        hscSeatPrefix: true,
        hscSeatNumber: true,
        gsebResultJson: true,
      },
      orderBy: [{ rollNumber: "asc" }, { surname: "asc" }, { firstName: "asc" }],
    });

    const summary = {
      total: students.length,
      eligible: 0,
      ok: 0,
      fail: 0,
      errors: [] as { studentId: string; name: string; error: string }[],
    };

    const eligible = students.filter((s) => {
      const { number } = seatFieldsForStandard(s, standard);
      return number.replace(/\D/g, "").length === digitLen;
    });
    summary.eligible = eligible.length;

    for (let i = 0; i < eligible.length; i++) {
      const s = eligible[i];
      const { prefix, number } = seatFieldsForStandard(s, standard);
      const name = `${s.firstName} ${s.surname}`.trim();

      try {
        const result = await fetchGsebResult(standard, prefix, number);
        if (result.percentage == null) {
          throw new Error(`No marks for seat ${prefix}${number}`);
        }
        await prisma.student.update({
          where: { id: s.id },
          data: studentUpdateFromGseb(standard, result, config),
        });
        summary.ok++;
      } catch (e) {
        summary.fail++;
        summary.errors.push({
          studentId: s.id,
          name,
          error: e instanceof Error ? e.message : "Fetch failed",
        });
      }

      if (i < eligible.length - 1) await sleep(BATCH_DELAY_MS);
    }

    const refreshed = await prisma.student.findMany({
      where: {
        schoolId: session.schoolId,
        OR: [
          { classId },
          { classId: null, standard: cls.standard, section: cls.section },
        ],
      },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        surname: true,
        fatherName: true,
        grNumber: true,
        dateOfBirth: true,
        caste: true,
        category: true,
        rollNumber: true,
        standard: true,
        percentage10th: true,
        percentage12th: true,
        sscSeatPrefix: true,
        sscSeatNumber: true,
        hscSeatPrefix: true,
        hscSeatNumber: true,
        gsebResultJson: true,
      },
      orderBy: [{ rollNumber: "asc" }, { surname: "asc" }, { firstName: "asc" }],
    });

    const rows = padBoardResultListRows(
      refreshed.map((st, idx) => buildBoardResultListRow(st, idx + 1, config)),
      config,
    );

    return NextResponse.json({
      class: {
        id: cls.id,
        name: cls.name,
        standard: cls.standard,
        section: cls.section,
        stream,
        academicYear: cls.academicYear,
      },
      config,
      rows,
      summary,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "GSEB bulk fetch failed" }, { status: 502 });
  }
}
