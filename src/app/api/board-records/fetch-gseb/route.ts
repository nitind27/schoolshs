import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { parseStreamFromClassName } from "@/lib/board-records/class-utils";
import { getBoardResultListConfig } from "@/lib/board-records/result-list-config";
import { fetchGsebResult } from "@/lib/gseb/fetch-gseb";
import {
  resolveGsebStandard,
  seatFieldsForStandard,
  studentUpdateFromGseb,
} from "@/lib/gseb/persist-gseb-result";

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

    if (!number || number.replace(/\D/g, "").length !== digitLen) {
      return NextResponse.json({
        error: `GSEB Seat Number missing — add ${digitLen}-digit seat in student profile`,
      }, { status: 400 });
    }

    const result = await fetchGsebResult(standard, prefix, number);

    if (result.percentage == null) {
      return NextResponse.json({
        error: `GSEB returned no result for seat ${prefix}${number} — verify on official portal`,
      }, { status: 404 });
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
