"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, FileText, RotateCcw, Search, X } from "lucide-react";
import { InfoModal } from "@/components/ui/info-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/loader";
import { TablePagination } from "@/components/ui/table-pagination";
import { useT } from "@/i18n/locale-provider";
import { PAGE_SIZE } from "@/lib/pagination";
import { studentShortNameGu } from "@/lib/student-names";
import {
  EMPTY_FILTERS,
  type DashboardFilterMeta,
  type DashboardFilterValues,
} from "@/components/dashboard/dashboard-filters";
import { DashboardExportDialog } from "@/components/dashboard/dashboard-export-dialog";
import type { DashboardReportData } from "@/lib/dashboard-export";
import type { ExportStudentRow } from "@/lib/dashboard-student-export";
import type { DashboardExportOptions } from "@/lib/dashboard-export-options";

export type DrillDimension = "category" | "standard" | "status" | "gender" | "class";

export type DrillTarget = {
  dimension: DrillDimension;
  value: string;
  label: string;
};

type StudentRow = {
  id: string;
  rollNumber?: string | null;
  mobileNumber?: string | null;
  category?: string | null;
  gender?: string | null;
  status?: string | null;
  standard?: string | null;
  section?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  surname?: string | null;
  firstNameGu?: string | null;
  middleNameGu?: string | null;
  surnameGu?: string | null;
  schoolClass?: { name?: string | null; standard?: string | null; section?: string | null } | null;
};

function applyDrill(
  base: DashboardFilterValues,
  target: DrillTarget | null,
): DashboardFilterValues {
  const next = { ...base };
  if (!target) return next;
  if (target.dimension === "category") next.category = target.value;
  if (target.dimension === "standard") next.standard = target.value;
  if (target.dimension === "status") next.status = target.value;
  if (target.dimension === "gender") next.gender = target.value;
  if (target.dimension === "class") {
    const [std, sec] = target.value.split("|");
    next.standard = std || "";
    next.section = sec || "";
  }
  return next;
}

function classLabel(s: StudentRow): string {
  if (s.schoolClass?.name) return s.schoolClass.name;
  const std = s.schoolClass?.standard || s.standard;
  const sec = s.schoolClass?.section || s.section;
  if (std && sec) return `${std}-${sec}`;
  if (std) return String(std);
  return "—";
}

interface Props {
  open: boolean;
  onClose: () => void;
  target: DrillTarget | null;
  baseFilters: DashboardFilterValues;
  filterMeta: DashboardFilterMeta;
  report: DashboardReportData | null;
  onPrintReady?: (rows: ExportStudentRow[], options: DashboardExportOptions) => void;
}

export function DashboardDrillModal({
  open,
  onClose,
  target,
  baseFilters,
  filterMeta,
  report,
  onPrintReady,
}: Props) {
  const t = useT();
  const seeded = useMemo(() => applyDrill(baseFilters, target), [baseFilters, target]);
  const fetchSeq = useRef(0);

  const [filters, setFilters] = useState<DashboardFilterValues>(seeded);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [excelOpen, setExcelOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // Sync drill filters as soon as modal opens / target changes
  useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    setFilters(applyDrill(baseFilters, target));
    setSearch("");
    setPage(1);
    setStudents([]);
    setTotal(0);
    setError(null);
    setReady(true);
  }, [open, target, baseFilters]);

  const title = target
    ? t("dashboard.drillTitle", { label: target.label })
    : t("dashboard.drillTitleAll");

  useEffect(() => {
    if (!open || !ready) return;

    const seq = ++fetchSeq.current;
    const controller = new AbortController();
    const delay = search.trim() ? 280 : 0;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (search.trim()) params.set("search", search.trim());
        if (filters.standard) params.set("standard", filters.standard);
        if (filters.section) params.set("section", filters.section);
        if (filters.status) params.set("status", filters.status);
        if (filters.category) params.set("category", filters.category);
        if (filters.gender && filters.gender !== "all") params.set("gender", filters.gender);

        const res = await fetch(`/api/students?${params}`, { signal: controller.signal });
        const data = await res.json();
        if (seq !== fetchSeq.current) return;
        if (!res.ok) throw new Error(data?.error || "Failed to load");
        setStudents(data.students ?? []);
        setTotal(Number(data.total) || 0);
      } catch (e: unknown) {
        if (controller.signal.aborted || seq !== fetchSeq.current) return;
        setStudents([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (seq === fetchSeq.current) setLoading(false);
      }
    }, delay);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, ready, page, search, filters]);

  const setFilter = (key: keyof DashboardFilterValues, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(applyDrill(EMPTY_FILTERS, target));
    setSearch("");
    setPage(1);
  };

  return (
    <>
      <InfoModal isOpen={open} onClose={onClose} title={title} size="xl">
        <div className="ops-drill">
          <div className="ops-drill-toolbar">
            <div className="ops-drill-search">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t("dashboard.drillSearch")}
                aria-label={t("dashboard.drillSearch")}
              />
              {search ? (
                <button
                  type="button"
                  className="ops-drill-clear"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  aria-label={t("common.search")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div className="ops-drill-exports">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 border-emerald-200 bg-emerald-50 font-semibold text-emerald-800 hover:bg-emerald-100"
                onClick={() => setExcelOpen(true)}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {t("dashboard.exportExcel")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 border-red-200 bg-red-50 font-semibold text-red-800 hover:bg-red-100"
                onClick={() => setPdfOpen(true)}
              >
                <FileText className="h-3.5 w-3.5" />
                {t("dashboard.exportPdf")}
              </Button>
            </div>
          </div>

          <div className="ops-drill-filters">
            <select
              value={filters.standard}
              onChange={(e) => setFilter("standard", e.target.value)}
              aria-label={t("dashboard.filterStandard")}
            >
              <option value="">{t("dashboard.allStandards")}</option>
              {filterMeta.standards.map((s) => (
                <option key={s} value={s}>
                  {t("dashboard.stdLabel", { standard: s })}
                </option>
              ))}
            </select>
            <select
              value={filters.section}
              onChange={(e) => setFilter("section", e.target.value)}
              aria-label={t("dashboard.filterSection")}
            >
              <option value="">{t("dashboard.allSections")}</option>
              {filterMeta.sections.map((s) => (
                <option key={s} value={s}>
                  {t("dashboard.divLabel", { section: s })}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilter("status", e.target.value)}
              aria-label={t("dashboard.filterStatus")}
            >
              <option value="">{t("dashboard.allStatuses")}</option>
              {filterMeta.statuses.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
            <select
              value={filters.category}
              onChange={(e) => setFilter("category", e.target.value)}
              aria-label={t("dashboard.filterCategory")}
            >
              <option value="">{t("dashboard.allCategories")}</option>
              {filterMeta.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filters.gender}
              onChange={(e) => setFilter("gender", e.target.value)}
              aria-label={t("dashboard.filterGender")}
            >
              <option value="all">{t("dashboard.allGenders")}</option>
              {filterMeta.genders.map((g) => (
                <option key={g} value={g}>
                  {t(`gender.${g}`)}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ops-drill-reset gap-1.5 border-slate-300 bg-slate-50 font-semibold text-slate-700 hover:bg-slate-100"
              onClick={resetFilters}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("dashboard.resetFilters")}
            </Button>
          </div>

          <div className="ops-drill-meta">
            <span>{t("dashboard.drillCount", { count: total })}</span>
            {target ? (
              <span className="ops-drill-chip">{target.label}</span>
            ) : null}
          </div>

          <div className="ops-drill-table-wrap">
            {loading ? (
              <div className="ops-drill-loading">
                <Spinner size="sm" />
                <span>{t("dashboard.loading")}</span>
              </div>
            ) : error ? (
              <p className="ops-drill-error">{error}</p>
            ) : students.length === 0 ? (
              <p className="ops-drill-empty">{t("dashboard.drillEmpty")}</p>
            ) : (
              <table className="ops-drill-table">
                <thead>
                  <tr>
                    <th>{t("dashboard.drillColRoll")}</th>
                    <th>{t("dashboard.drillColName")}</th>
                    <th>{t("dashboard.drillColClass")}</th>
                    <th>{t("dashboard.drillColCategory")}</th>
                    <th>{t("dashboard.drillColGender")}</th>
                    <th>{t("dashboard.drillColMobile")}</th>
                    <th>{t("dashboard.drillColStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>{s.rollNumber || "—"}</td>
                      <td>
                        <Link href={`/students/${s.id}`} className="ops-drill-name">
                          {studentShortNameGu(s)}
                        </Link>
                      </td>
                      <td>{classLabel(s)}</td>
                      <td>{s.category || "—"}</td>
                      <td>
                        {s.gender
                          ? (() => {
                              const g = t(`gender.${s.gender}`);
                              return g === `gender.${s.gender}` ? s.gender : g;
                            })()
                          : "—"}
                      </td>
                      <td>{s.mobileNumber || "—"}</td>
                      <td>
                        <Badge status={s.status || "draft"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <TablePagination page={page} total={total} onPageChange={setPage} />
        </div>
      </InfoModal>

      <DashboardExportDialog
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        mode="excel"
        filters={filters}
        report={report}
      />
      <DashboardExportDialog
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        mode="pdf"
        filters={filters}
        report={report}
        onPrintReady={onPrintReady}
      />
    </>
  );
}
