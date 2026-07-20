"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { teacherTheme as tp } from "@/components/teacher/teacher-theme";
import { useT } from "@/i18n/locale-provider";
import {
  Users,
  Search,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  FilterX,
  UserRound,
  Phone,
} from "lucide-react";
import { studentShortNameGu } from "@/lib/student-names";
import { TablePagination } from "@/components/ui/table-pagination";
import { paginateSlice } from "@/lib/pagination";
import { normalizeGender, GENDER_FILTER_OPTIONS } from "@/lib/gender-utils";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type StudentApi = {
  id: string;
  firstName: string;
  middleName: string | null;
  surname: string;
  firstNameGu?: string | null;
  surnameGu?: string | null;
  rollNumber: string | null;
  grNumber: string | null;
  gender: string | null;
  category: string | null;
  caste: string | null;
  mobileNumber: string | null;
  dateOfBirth: string | null;
  status: string;
  fatherName: string | null;
  motherName: string | null;
};

type ApiClass = {
  id: string;
  name: string;
  standard: string;
  section: string;
  stream: string;
  academicYear: string;
  students: StudentApi[];
};

type StudentRow = StudentApi & {
  classId: string;
  className: string;
  standard: string;
  section: string;
};

type Filters = {
  search: string;
  classId: string;
  gender: string;
  status: string;
  category: string;
};

const EMPTY_FILTERS: Filters = {
  search: "",
  classId: "",
  gender: "",
  status: "",
  category: "",
};

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s === "approved" || s === "ready" || s === "submitted") {
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  }
  if (s === "pending") return "bg-amber-50 text-amber-800 border-amber-200";
  if (s === "rejected" || s === "archived") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function TeacherStudentsPage() {
  const t = useT();
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [stats, setStats] = useState({ totalStudents: 0, totalClasses: 0, boys: 0, girls: 0, other: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [error, setError] = useState("");
  const now = new Date();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/teacher");
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Failed");
        setClasses([]);
        return;
      }
      setClasses(d.classes || []);
      setStats(
        d.stats || { totalStudents: 0, totalClasses: 0, boys: 0, girls: 0, other: 0 }
      );
    } catch {
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const allStudents: StudentRow[] = useMemo(() => {
    const rows: StudentRow[] = [];
    for (const cls of classes) {
      for (const s of cls.students || []) {
        rows.push({
          ...s,
          classId: cls.id,
          className: cls.name,
          standard: cls.standard,
          section: cls.section,
        });
      }
    }
    return rows;
  }, [classes]);

  const statusOptions = useMemo(() => {
    const set = new Set(allStudents.map((s) => s.status).filter(Boolean));
    return [...set].sort();
  }, [allStudents]);

  const categoryOptions = useMemo(() => {
    const set = new Set(allStudents.map((s) => s.category).filter(Boolean) as string[]);
    return [...set].sort();
  }, [allStudents]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return allStudents.filter((s) => {
      if (filters.classId && s.classId !== filters.classId) return false;
      if (filters.gender && normalizeGender(s.gender) !== filters.gender) return false;
      if (filters.status && s.status !== filters.status) return false;
      if (filters.category && (s.category || "") !== filters.category) return false;
      if (!q) return true;
      const hay = [
        s.firstName,
        s.middleName,
        s.surname,
        s.rollNumber,
        s.grNumber,
        s.mobileNumber,
        s.className,
        s.fatherName,
        s.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [allStudents, filters]);

  const filteredStats = useMemo(() => {
    let boys = 0;
    let girls = 0;
    for (const s of filtered) {
      const g = normalizeGender(s.gender);
      if (g === "Male") boys++;
      else if (g === "Female") girls++;
    }
    return {
      total: filtered.length,
      boys,
      girls,
      other: Math.max(0, filtered.length - boys - girls),
    };
  }, [filtered]);

  const paged = useMemo(() => paginateSlice(filtered, page, PAGE_SIZE), [filtered, page]);
  const filtersActive = Boolean(
    filters.search.trim() ||
      filters.classId ||
      filters.gender ||
      filters.status ||
      filters.category
  );

  const setFilter = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  const download = async (format: "pdf" | "xlsx") => {
    setExporting(format);
    try {
      const params = new URLSearchParams({ type: "roster", format });
      if (filters.classId) params.set("classId", filters.classId);
      const res = await fetch(`/api/teacher/export?${params}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `student-roster.${format === "pdf" ? "pdf" : "xlsx"}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  return (
    <PageShell
      variant="teacher"
      title={t("teacherNav.students")}
      subtitle={t("teacherPortal.studentsPageSubtitle")}
      breadcrumbs={[
        { label: t("teacherNav.dashboard"), href: "/teacher" },
        { label: t("teacherNav.students") },
      ]}
      icon={<Users className="h-5 w-5" />}
      actions={
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            disabled={!!exporting || filtered.length === 0}
            onClick={() => download("pdf")}
          >
            <FileText className="h-4 w-4" />
            {exporting === "pdf" ? "…" : "PDF"}
          </Button>
          <Button
            size="sm"
            className={tp.btn}
            disabled={!!exporting || filtered.length === 0}
            onClick={() => download("xlsx")}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exporting === "xlsx" ? "…" : "Excel"}
          </Button>
        </div>
      }
    >
      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t("teacherPortal.statStudents")}
          </p>
          <p className="text-lg font-bold text-slate-900">{filteredStats.total}</p>
          {filtersActive && (
            <p className="text-[10px] text-slate-400">
              {t("teacherPortal.ofTotal", { total: stats.totalStudents })}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t("teacherPortal.statBoys")}
          </p>
          <p className="text-lg font-bold text-slate-900">{filteredStats.boys}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t("teacherPortal.statGirls")}
          </p>
          <p className="text-lg font-bold text-slate-900">{filteredStats.girls}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t("teacherPortal.myClasses")}
          </p>
          <p className="text-lg font-bold text-slate-900">{stats.totalClasses}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              placeholder={t("teacherPortal.studentSearchFull")}
              className={cn(
                "h-9 w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-sm",
                "placeholder:text-slate-400 focus:outline-none focus:ring-2",
                tp.focusRing
              )}
              aria-label={t("common.search")}
            />
          </div>

          <select
            value={filters.classId}
            onChange={(e) => setFilter({ classId: e.target.value })}
            className="h-9 min-w-[140px] rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            aria-label={t("teacherPortal.myClasses")}
          >
            <option value="">{t("common.all")} — {t("nav.classes")}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.students.length})
              </option>
            ))}
          </select>

          <select
            value={filters.gender}
            onChange={(e) => setFilter({ gender: e.target.value })}
            className="h-9 min-w-[120px] rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            aria-label={t("fields.gender")}
          >
            <option value="">{t("common.all")} — {t("fields.gender")}</option>
            {GENDER_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={filters.category}
            onChange={(e) => setFilter({ category: e.target.value })}
            className="h-9 min-w-[120px] rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            aria-label={t("fields.category")}
          >
            <option value="">{t("common.all")} — {t("fields.category")}</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilter({ status: e.target.value })}
            className="h-9 min-w-[120px] rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            aria-label={t("common.status")}
          >
            <option value="">{t("common.all")} — {t("common.status")}</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {filtersActive && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-2.5"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              <FilterX className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("attendance.clearFilters")}</span>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className={`h-8 w-8 animate-spin rounded-full border-2 border-t-transparent border-teal-600`} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="font-medium text-slate-600">
            {classes.length ? t("common.noData") : t("teacherPortal.noClassAssigned")}
          </p>
          {filtersActive && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              {t("attendance.clearFilters")}
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">{t("fields.roll")}</th>
                  <th className="px-3 py-2.5">{t("fields.grNumber")}</th>
                  <th className="px-3 py-2.5">{t("common.name")}</th>
                  <th className="px-3 py-2.5">{t("nav.classes")}</th>
                  <th className="px-3 py-2.5">{t("fields.gender")}</th>
                  <th className="px-3 py-2.5">{t("fields.category")}</th>
                  <th className="px-3 py-2.5">{t("fields.mobile")}</th>
                  <th className="px-3 py-2.5">{t("common.status")}</th>
                  <th className="px-3 py-2.5">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((s, i) => {
                  const gender = normalizeGender(s.gender);
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-slate-100 hover:bg-teal-50/40"
                    >
                      <td className="px-3 py-2.5 text-xs text-slate-400">
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-800">
                        {s.rollNumber || "—"}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                        {s.grNumber || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                            <UserRound className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {studentShortNameGu(s)}
                            </p>
                            {s.fatherName && (
                              <p className="truncate text-[11px] text-slate-500">
                                S/O {s.fatherName}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {s.className}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-700">
                        {gender === "Male"
                          ? t("gender.male") || "Male"
                          : gender === "Female"
                            ? t("gender.female") || "Female"
                            : gender}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-700">
                        {s.category || "—"}
                        {s.caste ? (
                          <span className="block text-[10px] text-slate-400">{s.caste}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        {s.mobileNumber ? (
                          <a
                            href={`tel:${s.mobileNumber}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {s.mobileNumber}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                            statusTone(s.status)
                          )}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/teacher/attendance?classId=${s.classId}&month=${now.getMonth() + 1}&year=${now.getFullYear()}`}
                          title={t("teacherNav.attendance")}
                        >
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ClipboardList className={`h-4 w-4 ${tp.icon}`} />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={page}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}
    </PageShell>
  );
}
