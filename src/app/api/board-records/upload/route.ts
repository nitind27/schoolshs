import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { parseBoardExcel } from "@/lib/board-records/excel";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const classId = String(formData.get("classId") || "");
    const standard = String(formData.get("standard") || "10") as "10" | "12";

    if (!file || !classId) {
      return NextResponse.json({ error: "file and classId required" }, { status: 400 });
    }

    const cls = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: session.schoolId },
    });
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    if (session.role === "teacher" && session.staffId && cls.classTeacherId !== session.staffId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseBoardExcel(buffer);
    if (!rows.length) {
      return NextResponse.json({ error: "No valid rows in Excel — use downloaded template" }, { status: 400 });
    }

    let updated = 0;
    for (const row of rows) {
      const data: Record<string, unknown> = {};
      if (standard === "10") {
        if (row.seatPrefix) data.sscSeatPrefix = row.seatPrefix;
        if (row.seatNumber) data.sscSeatNumber = row.seatNumber;
        if (row.percentage !== "") data.percentage10th = row.percentage;
        if (row.examYear) data.year10th = row.examYear;
        data.board10th = row.board || "GSEB";
      } else {
        if (row.seatPrefix) data.hscSeatPrefix = row.seatPrefix;
        if (row.seatNumber) data.hscSeatNumber = row.seatNumber;
        if (row.percentage !== "") data.percentage12th = row.percentage;
        if (row.examYear) data.year12th = row.examYear;
        data.board12th = row.board || "GSEB";
      }
      if (row.grNumber) data.grNumber = row.grNumber;

      const result = await prisma.student.updateMany({
        where: { id: row.studentId, schoolId: session.schoolId },
        data,
      });
      if (result.count) updated++;
    }

    return NextResponse.json({ updated, total: rows.length });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
