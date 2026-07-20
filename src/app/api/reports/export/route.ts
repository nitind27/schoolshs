import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";
import { requireSchoolExportAuth } from "@/lib/dashboard-stats-server";
import { getReportById } from "@/lib/reports/catalog";
import { fetchReportPayload } from "@/lib/reports/report-data";
import { buildReportCsv, buildReportExcelBuffer, reportFilename } from "@/lib/reports/report-excel";
import type { ReportQuery } from "@/lib/reports/types";

export const dynamic = "force-dynamic";

function parseQuery(searchParams: URLSearchParams): ReportQuery {
  const type = searchParams.get("type") || "";
  const standard =
    searchParams.get("standard") ||
    searchParams.get("standard10or12") ||
    undefined;
  return {
    type,
    standard: standard || undefined,
    section: searchParams.get("section") || undefined,
    classId: searchParams.get("classId") || undefined,
    status: searchParams.get("status") || undefined,
    category: searchParams.get("category") || undefined,
    gender: searchParams.get("gender") || undefined,
    admissionStatus: searchParams.get("admissionStatus") || undefined,
    month: searchParams.get("month") || undefined,
    year: searchParams.get("year") || undefined,
    academicYear: searchParams.get("academicYear") || undefined,
    examId: searchParams.get("examId") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    voucherType: searchParams.get("voucherType") || undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolExportAuth();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "xlsx";
    const q = parseQuery(searchParams);

    if (!q.type) {
      return NextResponse.json({ error: "type required" }, { status: 400 });
    }

    const def = getReportById(q.type);
    if (!def) {
      return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
    }

    if (q.type === "dashboard") {
      const params = new URLSearchParams(searchParams);
      params.set("format", format === "json" ? "json" : "xlsx");
      const url = new URL(`/api/stats/export?${params.toString()}`, request.url);
      return NextResponse.redirect(url);
    }

    const schoolName = session.schoolName || "School";
    const payload = await fetchReportPayload(session.schoolId, schoolName, q);

    if (format === "json") {
      return NextResponse.json(payload);
    }

    if (format === "csv") {
      const csv = buildReportCsv(payload);
      const filename = reportFilename(payload, "csv");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const buffer = await buildReportExcelBuffer(payload);
    const filename = reportFilename(payload, "xlsx");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("GET /api/reports/export error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Export failed" },
      { status: 500 },
    );
  }
}
