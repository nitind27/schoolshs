"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Search,
  Loader2,
  BarChart3,
  Users,
  ClipboardCheck,
  CalendarCheck,
  CalendarRange,
  GraduationCap,
  Clock,
  Trophy,
  Briefcase,
  Wallet,
  School,
  Scale,
  Receipt,
  BookOpen,
  BookMarked,
  LayoutGrid,
  PieChart,
  UserCheck,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { InfoModal } from "@/components/ui/info-modal";
import { ReportPrintView } from "@/components/reports/report-print-view";
import { useT } from "@/i18n/locale-provider";
import {
  REPORT_CATALOG,
  REPORT_CATEGORIES,
  type ReportCategory,
  type ReportDefinition,
  type ReportFormat,
} from "@/lib/reports/catalog";
import { CATEGORIES, STUDENT_STATUSES } from "@/lib/constants";
import type { ReportPayload } from "@/lib/reports/types";
import { cn } from "@/lib/utils";
import { DEFAULT_EXPORT_OPTIONS } from "@/lib/dashboard-export-options";
import { downloadDashboardExcel } from "@/lib/dashboard-export";
import type { DashboardFilterValues } from "@/components/dashboard/dashboard-filters";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  Users,
  FileSpreadsheet,
  LayoutGrid,
  ClipboardCheck,
  CalendarCheck,
  CalendarRange,
  Clock,
  GraduationCap,
  Trophy,
  Briefcase,
  Wallet,
  School,
  Scale,
  Receipt,
  BookOpen,
  BookMarked,
  PieChart,
  UserCheck,
  CreditCard,
};

type ClassOption = { id: string; name: string; standard: string; section: string };
type ExamOption = { id: string; name: string; standard: string };

function monthStartISO(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString().slice(0, 10);
}
function monthEndISO(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0)).toISOString().slice(0, 10);
}

export function ReportsHub() {
  const t = useT();
  const [category, setCategory] = useState<ReportCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ReportDefinition | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [busy, setBusy] = useState<ReportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printData, setPrintData] = useState<ReportPayload | null>(null);

  const [filters, setFilters] = useState({
    standard: "",
    section: "",
    classId: "",
    status: "",
    category: "",
    gender: "all",
    admissionStatus: "",
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    academicYear: "2025-26",
    examId: "",
    standard10or12: "10",
    dateFrom: monthStartISO(),
    dateTo: monthEndISO(),
    voucherType: "",
  });

  useEffect(() => {
    fetch(`/api/classes?academicYear=${encodeURIComponent(filters.academicYear || "2025-26")}`)
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .catch(() => setClasses([]));
  }, [filters.academicYear]);

  useEffect(() => {
    fetch("/api/results")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list = (d?.exams || d?.data || []) as ExamOption[];
        if (Array.isArray(list)) setExams(list.map((e) => ({ id: e.id, name: e.name, standard: e.standard })));
      })
      .catch(() => setExams([]));
  }, []);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return REPORT_CATALOG.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (!q) return true;
      const title = t(`reportsHub.reports.${r.id}`).toLowerCase();
      const desc = t(`reportsHub.desc.${r.id}`).toLowerCase();
      return title.includes(q) || desc.includes(q) || r.id.includes(q);
    });
  }, [category, search, t]);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set("type", selected!.id);
    const f = selected!.filters;
    if (f.includes("standard") && filters.standard) p.set("standard", filters.standard);
    if (f.includes("section") && filters.section) p.set("section", filters.section);
    if (f.includes("classId") && filters.classId) p.set("classId", filters.classId);
    if (f.includes("status") && filters.status) p.set("status", filters.status);
    if (f.includes("category") && filters.category) p.set("category", filters.category);
    if (f.includes("gender") && filters.gender && filters.gender !== "all") p.set("gender", filters.gender);
    if (f.includes("admissionStatus") && filters.admissionStatus) {
      p.set("admissionStatus", filters.admissionStatus);
    }
    if (f.includes("month") && filters.month) p.set("month", filters.month);
    if (f.includes("year") && filters.year) p.set("year", filters.year);
    if (f.includes("academicYear") && filters.academicYear) p.set("academicYear", filters.academicYear);
    if (f.includes("examId") && filters.examId) p.set("examId", filters.examId);
    if (f.includes("dateFrom") && filters.dateFrom) p.set("dateFrom", filters.dateFrom);
    if (f.includes("dateTo") && filters.dateTo) p.set("dateTo", filters.dateTo);
    if (f.includes("voucherType") && filters.voucherType) p.set("voucherType", filters.voucherType);
    if (f.includes("standard10or12")) p.set("standard", filters.standard10or12);
    return p;
  }, [selected, filters]);

  const downloadExcel = async () => {
    if (!selected) return;
    setBusy("xlsx");
    setError(null);
    try {
      if (selected.id === "dashboard") {
        const dashFilters: DashboardFilterValues = {
          standard: filters.standard,
          section: filters.section,
          status: filters.status,
          category: filters.category,
          gender: filters.gender,
        };
        await downloadDashboardExcel(dashFilters, DEFAULT_EXPORT_OPTIONS);
        closeModal();
        return;
      }

      const p = buildParams();
      p.set("format", "xlsx");
      const res = await fetch(`/api/reports/export?${p}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Export failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `${selected.id}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      closeModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const downloadCsv = async () => {
    if (!selected) return;
    setBusy("csv");
    setError(null);
    try {
      const p = buildParams();
      p.set("format", "csv");
      window.open(`/api/reports/export?${p}`, "_blank");
      closeModal();
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    if (!selected) return;
    setBusy("pdf");
    setError(null);
    try {
      if (selected.id === "dashboard") {
        const dashFilters: DashboardFilterValues = {
          standard: filters.standard,
          section: filters.section,
          status: filters.status,
          category: filters.category,
          gender: filters.gender,
        };
        const q = new URLSearchParams();
        if (dashFilters.standard) q.set("standard", dashFilters.standard);
        if (dashFilters.section) q.set("section", dashFilters.section);
        if (dashFilters.status) q.set("status", dashFilters.status);
        if (dashFilters.category) q.set("category", dashFilters.category);
        if (dashFilters.gender && dashFilters.gender !== "all") q.set("gender", dashFilters.gender);
        q.set("format", "json");
        const res = await fetch(`/api/stats/export?${q}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setPrintData({
          type: "dashboard",
          title: t("reportsHub.reports.dashboard"),
          schoolName: data.report.schoolName,
          generatedAt: data.report.generatedAt,
          filterSummary: data.report.filterSummary,
          sheets: [
            {
              name: "Summary",
              headers: ["Metric", "Value"],
              rows: [
                ["Total Students", data.report.total],
                ["Classes", data.report.totalClasses],
                ["Staff", data.report.totalStaff],
                ["Completion %", data.report.completionRate],
              ],
            },
            {
              name: "Students",
              headers: ["Name", "Class", "Category", "Status", "Mobile"],
              rows: (data.studentRows || []).slice(0, 500).map((s: { name: string; classLabel: string; category: string; status: string; mobile: string }) => [
                s.name,
                s.classLabel,
                s.category,
                s.status,
                s.mobile,
              ]),
            },
          ],
        });
        closeModal();
        setTimeout(() => window.print(), 300);
        return;
      }

      const p = buildParams();
      p.set("format", "json");
      const res = await fetch(`/api/reports/export?${p}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPrintData(data as ReportPayload);
      closeModal();
      setTimeout(() => window.print(), 300);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF export failed");
    } finally {
      setBusy(null);
    }
  };

  const openReport = (report: ReportDefinition) => {
    setSelected(report);
    setError(null);
    // sensible date defaults when opening date-range reports
    if (report.filters.includes("dateFrom") || report.filters.includes("dateTo")) {
      setFilters((prev) => ({
        ...prev,
        dateFrom: prev.dateFrom || monthStartISO(),
        dateTo: prev.dateTo || monthEndISO(),
      }));
    }
  };

  const closeModal = () => {
    setSelected(null);
    setError(null);
    setBusy(null);
  };

  const selectedIcon = selected ? (ICONS[selected.icon] || FileSpreadsheet) : null;
  const SelectedIcon = selectedIcon;
  const showFilter = (f: string) => selected?.filters.includes(f as never);
  const hasDateRange = showFilter("dateFrom") || showFilter("dateTo");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white p-6 md:p-8 shadow-xl">
        <h1 className="text-2xl md:text-3xl font-black">{t("reportsHub.title")}</h1>
        <p className="text-blue-100 text-sm mt-1 max-w-2xl">{t("reportsHub.subtitle")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              category === "all" ? "bg-white text-blue-900" : "bg-white/15 hover:bg-white/25",
            )}
          >
            {t("reportsHub.all")}
          </button>
          {REPORT_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold transition-colors",
                category === c.id ? "bg-white text-blue-900" : "bg-white/15 hover:bg-white/25",
              )}
            >
              {t(c.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 items-center bg-white rounded-xl border border-slate-200 px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-slate-400 shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("reportsHub.searchReports")}
          className="flex-1 text-sm outline-none"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredReports.map((report) => {
          const Icon = ICONS[report.icon] || FileSpreadsheet;
          return (
            <button
              key={report.id}
              type="button"
              onClick={() => openReport(report)}
              className="text-left rounded-xl border p-4 transition-all hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 bg-white"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm">{t(`reportsHub.reports.${report.id}`)}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t(`reportsHub.desc.${report.id}`)}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {report.filters.includes("dateFrom") && (
                      <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                        {t("reportsHub.badgeDateRange")}
                      </span>
                    )}
                    {report.filters.includes("month") && (
                      <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                        {t("reportsHub.badgeMonth")}
                      </span>
                    )}
                    {report.formats.map((f) => (
                      <span key={f} className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <InfoModal
        isOpen={!!selected}
        onClose={closeModal}
        title={selected ? t(`reportsHub.reports.${selected.id}`) : ""}
        wide
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              {SelectedIcon && (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <SelectedIcon className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{t(`reportsHub.reports.${selected.id}`)}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{t(`reportsHub.desc.${selected.id}`)}</p>
              </div>
            </div>

            {selected.filters.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("reportsHub.exportPanelHint")}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {showFilter("standard") && !showFilter("standard10or12") && (
                    <Select label={t("reportsHub.filterStandard")} value={filters.standard} onChange={(e) => setFilters({ ...filters, standard: e.target.value })} options={["6", "7", "8", "9", "10", "11", "12"]} emptyLabel={t("common.all")} />
                  )}
                  {showFilter("standard10or12") && (
                    <Select label={t("reportsHub.filterStandard")} value={filters.standard10or12} onChange={(e) => setFilters({ ...filters, standard10or12: e.target.value })} options={[{ value: "10", label: "Class 10" }, { value: "12", label: "Class 12" }]} />
                  )}
                  {showFilter("section") && (
                    <Select label={t("reportsHub.filterSection")} value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })} options={["A", "B", "C", "D", "E"]} emptyLabel={t("common.all")} />
                  )}
                  {showFilter("classId") && (
                    <Select
                      label={t("reportsHub.filterClass")}
                      value={filters.classId}
                      onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
                      options={classes.map((c) => ({ value: c.id, label: c.name || `${c.standard}-${c.section}` }))}
                      emptyLabel={t("common.all")}
                    />
                  )}
                  {showFilter("status") && (
                    <Select label={t("reportsHub.filterStatus")} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} options={STUDENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))} emptyLabel={t("common.all")} />
                  )}
                  {showFilter("admissionStatus") && (
                    <Select label={t("reportsHub.filterAdmission")} value={filters.admissionStatus} onChange={(e) => setFilters({ ...filters, admissionStatus: e.target.value })} options={["pending", "verified", "rejected"]} emptyLabel={t("common.all")} />
                  )}
                  {showFilter("category") && (
                    <Select label={t("reportsHub.filterCategory")} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} options={[...CATEGORIES]} emptyLabel={t("common.all")} />
                  )}
                  {showFilter("gender") && (
                    <Select
                      label={t("reportsHub.filterGender")}
                      value={filters.gender}
                      onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                      options={[
                        { value: "all", label: t("common.all") },
                        { value: "Male", label: "Male" },
                        { value: "Female", label: "Female" },
                      ]}
                    />
                  )}
                  {showFilter("examId") && (
                    <Select
                      label={t("reportsHub.filterExam")}
                      value={filters.examId}
                      onChange={(e) => setFilters({ ...filters, examId: e.target.value })}
                      options={exams.map((e) => ({ value: e.id, label: `${e.name}${e.standard ? ` (Std ${e.standard})` : ""}` }))}
                      emptyLabel={t("reportsHub.filterExamLatest")}
                    />
                  )}
                  {showFilter("voucherType") && (
                    <Select
                      label={t("reportsHub.filterVoucherType")}
                      value={filters.voucherType}
                      onChange={(e) => setFilters({ ...filters, voucherType: e.target.value })}
                      options={[
                        { value: "receipt", label: "Receipt" },
                        { value: "payment", label: "Payment" },
                        { value: "journal", label: "Journal" },
                        { value: "contra", label: "Contra" },
                      ]}
                      emptyLabel={t("common.all")}
                    />
                  )}
                  {showFilter("month") && (
                    <Select label={t("reportsHub.filterMonth")} value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} />
                  )}
                  {showFilter("year") && (
                    <Select label={t("reportsHub.filterYear")} value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} options={["2024", "2025", "2026", "2027"]} />
                  )}
                  {showFilter("academicYear") && (
                    <Select label={t("reportsHub.filterAcademicYear")} value={filters.academicYear} onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })} options={["2024-25", "2025-26", "2026-27"]} />
                  )}
                  {hasDateRange && (
                    <>
                      <Input
                        type="date"
                        label={t("reportsHub.filterDateFrom")}
                        value={filters.dateFrom}
                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      />
                      <Input
                        type="date"
                        label={t("reportsHub.filterDateTo")}
                        value={filters.dateTo}
                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      />
                      <p className="sm:col-span-2 text-[11px] text-slate-500">
                        {t("reportsHub.dateRangeHint")}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="outline" onClick={closeModal} disabled={!!busy}>
                {t("common.cancel")}
              </Button>
              {selected.formats.includes("xlsx") && (
                <Button onClick={() => void downloadExcel()} disabled={!!busy} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  {busy === "xlsx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  {t("reportsHub.downloadExcel")}
                </Button>
              )}
              {selected.formats.includes("csv") && (
                <Button variant="outline" onClick={() => void downloadCsv()} disabled={!!busy} className="gap-2">
                  {busy === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {t("reportsHub.downloadCsv")}
                </Button>
              )}
              {selected.formats.includes("pdf") && (
                <Button variant="outline" onClick={() => void exportPdf()} disabled={!!busy} className="gap-2">
                  {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {t("reportsHub.savePdf")}
                </Button>
              )}
            </div>
          </div>
        )}
      </InfoModal>

      <ReportPrintView data={printData} />
    </div>
  );
}
