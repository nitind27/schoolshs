import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";

/**
 * Alias for Flutter / clients that map web path `/staff/holidays`
 * → API `/api/staff/holidays`. Read-only for teacher, student, clerk, admin.
 */
export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const session = await requireSchoolAuth([
      "teacher",
      "school_admin",
      "clerk",
      "student",
    ]);
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") || String(new Date().getFullYear());
    const month = searchParams.get("month") || "";
    const type = searchParams.get("type") || "";

    const where: Prisma.HolidayWhereInput = {
      schoolId: session.schoolId,
      date: month
        ? { startsWith: `${year}-${String(month).padStart(2, "0")}-` }
        : { startsWith: `${year}-` },
    };
    if (type) where.type = type;

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
    console.error("[staff/holidays]", e);
    return mobileJson({ error: "Failed" }, { status: 500 }, origin);
  }
}
