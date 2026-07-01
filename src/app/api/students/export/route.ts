import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CSV_HEADERS } from "@/lib/constants";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const ids = searchParams.get("ids");

    const where: Record<string, unknown> = { schoolId: session.schoolId };
    if (status) where.status = status;
    if (ids) where.id = { in: ids.split(",") };

    const students = await prisma.student.findMany({
      where,
      orderBy: { surname: "asc" },
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
