import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CSV_HEADERS } from "@/lib/constants";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  andStudentWhere,
  enrolledStudentStatusFilter,
  pendingWorkOrFilters,
} from "@/lib/student-list-filters";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const ids = searchParams.get("ids");
    const standard = searchParams.get("standard");
    const classId = searchParams.get("classId");
    const noClass = searchParams.get("noClass") === "1";
    const pendingDivision = searchParams.get("pendingDivision") === "1";
    const pendingQueue = searchParams.get("pending") === "1";

    const where: Record<string, unknown> = { schoolId: session.schoolId };
    if (status) where.status = status;
    else if (!ids) where.status = enrolledStudentStatusFilter();
    if (ids) where.id = { in: ids.split(",") };
    if (!ids) {
      if (noClass) {
        where.classId = null;
        where.OR = [{ standard: null }, { standard: "" }];
      } else if (pendingDivision) {
        where.classId = null;
        if (standard) where.standard = standard;
        else {
          where.AND = [{ standard: { not: null } }, { NOT: { standard: "" } }];
        }
      } else if (classId) {
        where.classId = classId;
      } else if (standard) {
        where.standard = standard;
      }
    }
    if (pendingQueue && !ids) {
      andStudentWhere(where, { OR: pendingWorkOrFilters() });
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: [{ standard: "asc" }, { surname: "asc" }],
    });

    const headers = CSV_HEADERS.join(",");
    const rows = students.map((s) =>
      CSV_HEADERS.map((h) => {
        const val = s[h as keyof typeof s];
        if (val === null || val === undefined) return "";
        if (typeof val === "boolean") return val ? "Yes" : "No";
        const str = String(val);
        return str.includes(",") ? `"${str}"` : str;
      }).join(",")
    );

    const csv = [headers, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="students_export_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
