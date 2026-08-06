import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";

/** Roles that may read the school holiday calendar (web + Flutter). */
const HOLIDAY_READ_ROLES = [
  "school_admin",
  "clerk",
  "teacher",
  "student",
] as const;

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const session = await requireSchoolAuth([...HOLIDAY_READ_ROLES]);
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

    return mobileJson(
      {
        year: Number(year),
        month: month ? Number(month) : null,
        holidays,
      },
      undefined,
      origin,
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return mobileJson({ error: e.message }, { status: e.status }, origin);
    }
    console.error(e);
    return mobileJson({ error: "Failed" }, { status: 500 }, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = (await request.json()) as {
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
      if (!id) {
        return mobileJson({ error: "id required" }, { status: 400 }, origin);
      }
      const existing = await prisma.holiday.findFirst({
        where: { id, schoolId: session.schoolId },
      });
      if (!existing) {
        return mobileJson({ error: "Not found" }, { status: 404 }, origin);
      }
      await prisma.holiday.delete({ where: { id } });
      return mobileJson({ success: true }, undefined, origin);
    }

    const date = String(body.date || "").trim();
    const name = String(body.name || "").trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return mobileJson(
        { error: "Valid date (YYYY-MM-DD) is required" },
        { status: 400 },
        origin,
      );
    }
    if (!name) {
      return mobileJson(
        { error: "Holiday name is required" },
        { status: 400 },
        origin,
      );
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
      if (!id) {
        return mobileJson({ error: "id required" }, { status: 400 }, origin);
      }
      const existing = await prisma.holiday.findFirst({
        where: { id, schoolId: session.schoolId },
      });
      if (!existing) {
        return mobileJson({ error: "Not found" }, { status: 404 }, origin);
      }
      const dup = await prisma.holiday.findFirst({
        where: { schoolId: session.schoolId, date, id: { not: id } },
      });
      if (dup) {
        return mobileJson(
          { error: "A holiday on this date already exists" },
          { status: 409 },
          origin,
        );
      }
      const updated = await prisma.holiday.update({
        where: { id },
        data: payload,
      });
      return mobileJson({ holiday: updated }, undefined, origin);
    }

    const dup = await prisma.holiday.findFirst({
      where: { schoolId: session.schoolId, date },
    });
    if (dup) {
      return mobileJson(
        { error: "A holiday on this date already exists" },
        { status: 409 },
        origin,
      );
    }

    const holiday = await prisma.holiday.create({
      data: { schoolId: session.schoolId, ...payload },
    });
    return mobileJson({ holiday }, undefined, origin);
  } catch (e) {
    if (e instanceof AuthError) {
      return mobileJson({ error: e.message }, { status: e.status }, origin);
    }
    console.error(e);
    return mobileJson({ error: "Failed" }, { status: 500 }, origin);
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
