import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";
import type { DashboardFilterValues } from "@/components/dashboard/dashboard-filters";
import {
  buildAdvancedDashboardExcelBuffer,
  dashboardExcelFilename,
} from "@/lib/dashboard-excel";
import {
  hasAnyExportOption,
  resolveExportOptions,
} from "@/lib/dashboard-export-options";
import {
  fetchDashboardExportPayload,
  parseDashboardFilters,
  requireSchoolExportAuth,
} from "@/lib/dashboard-stats-server";

export const dynamic = "force-dynamic";

function filtersToValues(filters: ReturnType<typeof parseDashboardFilters>): DashboardFilterValues {
  return {
    standard: filters.standard || "",
    section: filters.section || "",
    status: filters.status || "",
    category: filters.category || "",
    gender: filters.gender || "all",
  };
}

function buildFilterSummary(filters: DashboardFilterValues): string {
  const parts: string[] = [];
  if (filters.standard) parts.push(`Std ${filters.standard}`);
  if (filters.section) parts.push(`Div ${filters.section}`);
  if (filters.status) parts.push(filters.status);
  if (filters.category) parts.push(filters.category);
  if (filters.gender && filters.gender !== "all") parts.push(filters.gender);
  return parts.length ? parts.join(" · ") : "All Students";
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolExportAuth();
    const { searchParams } = new URL(request.url);
    const filters = parseDashboardFilters(searchParams);
    const filterValues = filtersToValues(filters);
    const filterSummary = buildFilterSummary(filterValues);
    const format = searchParams.get("format") || "xlsx";

    const { report, students, studentRows } = await fetchDashboardExportPayload(
      session.schoolId,
      session.schoolName || "School",
      filters,
      filterSummary
    );

    if (format === "json") {
      return NextResponse.json({ report, studentRows, total: students.length });
    }

    const exportOptions = resolveExportOptions(searchParams.get("sheets"));
    if (!hasAnyExportOption(exportOptions)) {
      return NextResponse.json({ error: "Select at least one export section" }, { status: 400 });
    }

    const buffer = await buildAdvancedDashboardExcelBuffer(
      report,
      students,
      filterValues,
      exportOptions
    );
    const filename = dashboardExcelFilename(report, filterValues);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("GET /api/stats/export error:", e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
