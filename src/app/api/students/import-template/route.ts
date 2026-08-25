import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { resolveImportTemplateFields } from "@/lib/import/student-import";
import {
  buildStudentImportCsv,
  buildStudentImportWorkbook,
} from "@/lib/import/import-template";

export async function GET(request: NextRequest) {
  try {
    await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const formatParam = searchParams.get("format");
    const format = formatParam === "csv" ? "csv" : "xlsx";
    const includeSample = searchParams.get("sample") !== "0";
    const fields = resolveImportTemplateFields(
      (searchParams.get("fields") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );

    if (format === "csv") {
      const csv = buildStudentImportCsv(fields, includeSample);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="student_import_template.csv"',
        },
      });
    }

    const buf = await buildStudentImportWorkbook(fields, { includeSample });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="student_import_template.xlsx"',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[import-template]", error);
    return NextResponse.json({ error: "Failed to build template" }, { status: 500 });
  }
}
