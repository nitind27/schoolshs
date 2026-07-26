import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { parseStreamFromClassName } from "@/lib/board-records/class-utils";
import { getBoardResultListConfig } from "@/lib/board-records/result-list-config";
import { fetchGsebResult } from "@/lib/gseb/fetch-gseb";
import {
  clearGsebStoredResult,
  resolveGsebStandard,
  seatFieldsForStandard,
  studentUpdateFromGseb,
} from "@/lib/gseb/persist-gseb-result";

async function clearStale(studentId: string, standard: "10" | "12") {
  await prisma.student.update({
    where: { id: studentId },
    data: clearGsebStoredResult(standard),
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const body = await request.json();
    const studentId = body.studentId as string | undefined;
    const standardOverride = body.standard as string | undefined;

    if (!studentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: session.schoolId },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const standard = resolveGsebStandard(student, standardOverride);
    const stream = parseStreamFromClassName(
      student.section ? `Class ${student.standard}-${student.section}` : "",
      standard,
      null,
    );
    const config = getBoardResultListConfig(standard, stream);

    const { prefix, number } = seatFieldsForStandard(student, standard);
    const digitLen = standard === "12" ? 6 : 7;
    const seatLabel = `${prefix}${number}`;

    if (!number || number.replace(/\D/g, "").length !== digitLen) {
      return NextResponse.json({
        error: `GSEB Seat Number missing — add ${digitLen}-digit seat in student profile`,
      }, { status: 400 });
    }

    let result;
    try {
      result = await fetchGsebResult(standard, prefix, number);
    } catch (err) {
      await clearStale(student.id, standard);
      const msg = err instanceof Error ? err.message : "GSEB fetch failed";
      const invalid = /invalid|no result|not found|rejected|empty result/i.test(msg);
      return NextResponse.json(
        { error: msg, invalidSeat: invalid, cleared: true },
        { status: invalid ? 404 : 502 },
      );
    }

    const subjectHits = Object.values(result.subjects).filter((v) => v != null).length;
    const looksValid =
      (result.percentage != null &&
        Number.isFinite(result.percentage) &&
        !!result.studentName &&
        result.studentName.replace(/\s+/g, "").length >= 3) ||
      (subjectHits >= 3 && result.percentage != null) ||
      !!(result.studentName && result.result && result.percentage != null);

    if (!looksValid) {
      await clearStale(student.id, standard);
      return NextResponse.json(
        {
          error: `Invalid GSEB seat or no result for ${seatLabel} — verify on result.gseb.org`,
          invalidSeat: true,
          cleared: true,
        },
        { status: 404 },
      );
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: studentUpdateFromGseb(standard, result, config),
    });

    return NextResponse.json({ result, student: updated, standard });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "GSEB fetch failed" }, { status: 502 });
  }
}
