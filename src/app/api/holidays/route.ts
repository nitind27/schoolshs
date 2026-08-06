import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk", "teacher"]);
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") || String(new Date().getFullYear());
    const month = searchParams.get("month") || "";
    const type = searchParams.get("type") || "";

    const where: Prisma.HolidayWhereInput = {
      schoolId: session.schoolId,
      date: month
        ? { startsWith: `${year}-${String(month).padStart(2, "0")}-` }
        : { startsWith: year + "-" },
    };
    if (type) {
      where.type = type;
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ holidays });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = await request.json() as {
      action?: string;
      id?: string;
      date?: string;
      name?: string;
      nameGu?: string;
      type?: string;
      academicYear?: string;
      description?: string;
    };
    const action = body.action || "create";

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const existing = await prisma.holiday.findFirst({ where: { id, schoolId: session.schoolId } });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await prisma.holiday.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    const date = String(body.date || "").trim();
    const name = String(body.name || "").trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Valid date (YYYY-MM-DD) is required" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Holiday name is required" }, { status: 400 });
    }

    const payload = {
      date,
      name,
      nameGu: String(body.nameGu || "").trim() || null,
      type: String(body.type || "public"),
      academicYear: String(body.academicYear || deriveAcademicYear(date)),
      description: String(body.description || "").trim() || null,
    };

    if (action === "update") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const existing = await prisma.holiday.findFirst({ where: { id, schoolId: session.schoolId } });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      // Check duplicate date (other than self)
      const dup = await prisma.holiday.findFirst({
        where: { schoolId: session.schoolId, date, id: { not: id } },
      });
      if (dup) return NextResponse.json({ error: "A holiday on this date already exists" }, { status: 409 });
      const updated = await prisma.holiday.update({ where: { id }, data: payload });
      return NextResponse.json({ holiday: updated });
    }

    // create
    const dup = await prisma.holiday.findFirst({
      where: { schoolId: session.schoolId, date },
    });
    if (dup) return NextResponse.json({ error: "A holiday on this date already exists" }, { status: 409 });

    const holiday = await prisma.holiday.create({
      data: { schoolId: session.schoolId, ...payload },
    });
    return NextResponse.json({ holiday });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** Derive academic year string e.g. "2025-26" from ISO date */
function deriveAcademicYear(isoDate: string): string {
  const d = new Date(isoDate);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  // Indian academic year: April–March
  if (m >= 4) return `${y}-${String(y + 1).slice(2)}`;
  return `${y - 1}-${String(y).slice(2)}`;
}
