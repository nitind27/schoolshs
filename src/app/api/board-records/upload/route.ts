import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { parseBoardExcel } from "@/lib/board-records/excel";

const SSC_SEAT_PREFIXES = new Set(["A", "B", "C", "S", "P"]);
const HSC_SEAT_PREFIXES = new Set([
  "B",
  "E",
  "G",
  "P",
  "A",
  "C",
  "T",
  "H",
  "D",
  "S",
]);

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth([
      "school_admin",
      "teacher",
      "clerk",
    ]);
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const classId = String(formData.get("classId") || "");

    if (!file || !classId) {
      return NextResponse.json(
        { error: "file and classId required" },
        { status: 400 },
      );
    }

    const cls = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: session.schoolId },
    });
    if (!cls)
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    if (
      session.role === "teacher" &&
      (!session.staffId || cls.classTeacherId !== session.staffId)
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (!["10", "12"].includes(cls.standard)) {
      return NextResponse.json(
        { error: "Board entry is only for Class 10 and Class 12" },
        { status: 400 },
      );
    }
    const standard = cls.standard as "10" | "12";

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseBoardExcel(buffer);
    if (!rows.length) {
      return NextResponse.json(
        { error: "No valid rows in Excel — use downloaded template" },
        { status: 400 },
      );
    }
    const needDigits = standard === "12" ? 6 : 7;
    const allowedPrefixes =
      standard === "12" ? HSC_SEAT_PREFIXES : SSC_SEAT_PREFIXES;
    for (const row of rows) {
      const seatNumber = String(row.seatNumber || "").trim();
      if (!seatNumber) continue;
      const seatPrefix = String(row.seatPrefix || "")
        .trim()
        .toUpperCase();
      if (!allowedPrefixes.has(seatPrefix) || seatPrefix.length !== 1) {
        return NextResponse.json(
          {
            error:
              "Every seat number must start with one valid alphabet prefix",
          },
          { status: 400 },
        );
      }
      if (!new RegExp(`^\\d{${needDigits}}$`).test(seatNumber)) {
        return NextResponse.json(
          {
            error: `Every seat number must contain exactly ${needDigits} digits after the alphabet`,
          },
          { status: 400 },
        );
      }
    }

    let updated = 0;
    for (const row of rows) {
      const data: Record<string, unknown> = {};
      const seatPrefix = String(row.seatPrefix || "")
        .trim()
        .toUpperCase();
      const seatNumber = String(row.seatNumber || "").trim();
      if (standard === "10") {
        if (seatPrefix) data.sscSeatPrefix = seatPrefix;
        if (seatNumber) data.sscSeatNumber = seatNumber;
        if (row.percentage !== "") data.percentage10th = row.percentage;
        if (row.examYear) data.year10th = row.examYear;
        data.board10th = row.board || "GSEB";
      } else {
        if (seatPrefix) data.hscSeatPrefix = seatPrefix;
        if (seatNumber) data.hscSeatNumber = seatNumber;
        if (row.percentage !== "") data.percentage12th = row.percentage;
        if (row.examYear) data.year12th = row.examYear;
        data.board12th = row.board || "GSEB";
      }
      if (row.grNumber) data.grNumber = row.grNumber;

      const result = await prisma.student.updateMany({
        where: {
          id: row.studentId,
          schoolId: session.schoolId,
          OR: [
            { classId },
            {
              classId: null,
              standard: cls.standard,
              section: cls.section,
            },
          ],
        },
        data,
      });
      if (result.count) updated++;
    }

    return NextResponse.json({ updated, total: rows.length });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
