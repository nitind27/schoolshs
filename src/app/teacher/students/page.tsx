"use client";

import { Spinner } from "@/components/ui/loader";
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
  Hash,
} from "lucide-react";
import { studentShortNameGu } from "@/lib/student-names";
import type { ColumnDef } from "@tanstack/react-table";
import { GlobalDataTable } from "@/components/ui/global-data-table";
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
  sscSeatPrefix?: string | null;
  sscSeatNumber?: string | null;
  hscSeatPrefix?: string | null;
  hscSeatNumber?: string | null;
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
  if (s === "rejected" || s === "archived")
    return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function TeacherStudentsPage() {
  const t = useT();
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    boys: 0,
    girls: 0,
    other: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [error, setError] = useState("");
  const now = useMemo(() => new Date(), []);

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
        d.stats || {
          totalStudents: 0,
          totalClasses: 0,
          boys: 0,
          girls: 0,
          other: 0,
        },
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
    const set = new Set(
      allStudents.map((s) => s.category).filter(Boolean) as string[],
    );
    return [...set].sort();
  }, [allStudents]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return allStudents.filter((s) => {
      if (filters.classId && s.classId !== filters.classId) return false;
      if (filters.gender && normalizeGender(s.gender) !== filters.gender)
        return false;
      if (filters.status && s.status !== filters.status) return false;
      if (filters.category && (s.category || "") !== filters.category)
        return false;
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

  const filtersActive = Boolean(
    filters.search.trim() ||
    filters.classId ||
    filters.gender ||
    filters.status ||
    filters.category,
  );

  const setFilter = (patch: Partial<Filters>) =>
    setFilters((f) => ({ ...f, ...patch }));

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

  const columns = useMemo<ColumnDef<StudentRow>[]>(
    () => [
      {
        header: t("fields.roll"),
        accessorKey: "rollNumber",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-slate-800">
            {row.original.rollNumber || "—"}
          </span>
        ),
      },
      {
        header: t("fields.grNumber"),
        accessorKey: "grNumber",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-600">
            {row.original.grNumber || "—"}
          </span>
        ),
      },
      {
        header: t("common.name"),
        accessorFn: (s) => studentShortNameGu(s),
        cell: ({ row }) => {
          const s = row.original;
          return (
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
          );
        },
      },
      {
        header: t("nav.classes"),
        accessorKey: "className",
        cell: ({ row }) => (
          <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
            {row.original.className}
          </span>
        ),
      },
      {
        header: t("fields.gender"),
        accessorKey: "gender",
        cell: ({ row }) => {
          const gender = normalizeGender(row.original.gender);
          return (
            <span className="text-xs text-slate-700">
              {gender === "Male"
                ? t("gender.male") || "Male"
                : gender === "Female"
                  ? t("gender.female") || "Female"
                  : gender}
            </span>
          );
        },
      },
      {
        header: t("fields.category"),
        accessorKey: "category",
        cell: ({ row }) => (
          <span className="text-xs text-slate-700">
            {row.original.category || "—"}
            {row.original.caste ? (
              <span className="block text-[10px] text-slate-400">
                {row.original.caste}
              </span>
            ) : null}
          </span>
        ),
      },
      {
        header: t("fields.mobile"),
        accessorKey: "mobileNumber",
        cell: ({ row }) =>
          row.original.mobileNumber ? (
            <a
              href={`tel:${row.original.mobileNumber}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
            >
              <Phone className="h-3 w-3" />
              {row.original.mobileNumber}
            </a>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
      },
      {
        id: "boardSeatNumber",
        header: t("teacherPortal.boardSeatNumber"),
        accessorFn: (student) =>
          student.standard === "12"
            ? [student.hscSeatPrefix, student.hscSeatNumber]
                .filter(Boolean)
                .join("")
            : student.standard === "10"
              ? [student.sscSeatPrefix, student.sscSeatNumber]
                  .filter(Boolean)
                  .join("")
              : "",
        cell: ({ row }) => {
          const student = row.original;
          const seat =
            student.standard === "12"
              ? [student.hscSeatPrefix, student.hscSeatNumber]
                  .filter(Boolean)
                  .join("")
              : student.standard === "10"
                ? [student.sscSeatPrefix, student.sscSeatNumber]
                    .filter(Boolean)
                    .join("")
                : "";
          return seat ? (
            <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-violet-700">
              <Hash className="h-3 w-3" />
              {seat}
            </span>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          );
        },
      },
      {
        header: t("common.status"),
        accessorKey: "status",
        cell: ({ row }) => (
          <span
            className={cn(
              "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
              statusTone(row.original.status),
            )}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        id: "actions",
        header: t("common.actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`/teacher/attendance?classId=${row.original.classId}&month=${now.getMonth() + 1}&year=${now.getFullYear()}`}
            title={t("teacherNav.attendance")}
          >
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ClipboardList className={`h-4 w-4 ${tp.icon}`} />
            </Button>
          </Link>
        ),
      },
    ],
    [now, t],
  );

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
          <p className="text-lg font-bold text-slate-900">
            {filteredStats.total}
          </p>
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
          <p className="text-lg font-bold text-slate-900">
            {filteredStats.boys}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t("teacherPortal.statGirls")}
          </p>
          <p className="text-lg font-bold text-slate-900">
            {filteredStats.girls}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t("teacherPortal.myClasses")}
          </p>
          <p className="text-lg font-bold text-slate-900">
            {stats.totalClasses}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
          <div className="relative min-w-0 w-full sm:col-span-2 lg:min-w-[180px] lg:max-w-xs lg:flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              placeholder={t("teacherPortal.studentSearchFull")}
              className={cn(
                "h-9 w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-sm",
                "placeholder:text-slate-400 focus:outline-none focus:ring-2",
                tp.focusRing,
              )}
              aria-label={t("common.search")}
            />
          </div>

          <select
            value={filters.classId}
            onChange={(e) => setFilter({ classId: e.target.value })}
            className="h-9 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 lg:w-auto lg:min-w-[140px]"
            aria-label={t("teacherPortal.myClasses")}
          >
            <option value="">
              {t("common.all")} — {t("nav.classes")}
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.students.length})
              </option>
            ))}
          </select>

          <select
            value={filters.gender}
            onChange={(e) => setFilter({ gender: e.target.value })}
            className="h-9 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 lg:w-auto lg:min-w-[120px]"
            aria-label={t("fields.gender")}
          >
            <option value="">
              {t("common.all")} — {t("fields.gender")}
            </option>
            {GENDER_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={filters.category}
            onChange={(e) => setFilter({ category: e.target.value })}
            className="h-9 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 lg:w-auto lg:min-w-[120px]"
            aria-label={t("fields.category")}
          >
            <option value="">
              {t("common.all")} — {t("fields.category")}
            </option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilter({ status: e.target.value })}
            className="h-9 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 lg:w-auto lg:min-w-[120px]"
            aria-label={t("common.status")}
          >
            <option value="">
              {t("common.all")} — {t("common.status")}
            </option>
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
              className="h-9 w-full px-2.5 sm:w-auto"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              <FilterX className="h-3.5 w-3.5" />
              <span className="sm:inline">
                {t("attendance.clearFilters")}
              </span>
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
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="font-medium text-slate-600">
            {classes.length
              ? t("common.noData")
              : t("teacherPortal.noClassAssigned")}
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
        <GlobalDataTable
          data={filtered}
          columns={columns}
          pageSize={PAGE_SIZE}
          emptyText={t("common.noData")}
        />
      )}
    </PageShell>
  );
}
