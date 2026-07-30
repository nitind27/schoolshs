"use client";

import { Spinner } from "@/components/ui/loader";
import {
  studentDisplayFatherName,
  studentFullNameGu,
  studentShortNameGu,
} from "@/lib/student-names";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge, CategoryBadge } from "@/components/ui/badge";
import { CATEGORIES, STUDENT_STATUSES, GENDERS } from "@/lib/constants";
import {
  Search,
  Plus,
  Trash2,
  Edit,
  Eye,
  Download,
  CheckSquare,
  Square,
  Play,
  CreditCard,
  X,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Student, SchoolClass } from "@/generated/prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { GlobalDataTable } from "@/components/ui/global-data-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/hooks/use-confirm";
import { genderShort, normalizeGender } from "@/lib/gender-utils";

const PAGE_SIZE = 25;

type StudentRow = Student & {
  schoolClass?: Pick<
    SchoolClass,
    "id" | "name" | "standard" | "section" | "stream" | "academicYear"
  > | null;
};

type ClassMeta = SchoolClass & { _count?: { students: number } };

type Summary = {
  total: number;
  male: number;
  female: number;
  other: number;
  noClass: number;
};

function classLabel(student: StudentRow, t: (k: string, p?: Record<string, string>) => string) {
  if (student.schoolClass?.name) return student.schoolClass.name;
  if (student.standard) {
    return t("students.classLabel", {
      standard: student.standard,
      section: student.section || "",
    });
  }
  return student.courseName || "—";
}

function maskAadhaar(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 4) return value || "—";
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

export default function StudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-32 items-center justify-center">
          <Spinner size="md" />
        </div>
      }
    >
      <StudentsContent />
    </Suspense>
  );
}

function StudentsContent() {
  const t = useT();
  const { confirm, ConfirmDialog } = useConfirm();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [standardFilter, setStandardFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [noClassOnly, setNoClassOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const classId = searchParams.get("classId");
    const cat = searchParams.get("category");
    const std = searchParams.get("standard");
    const g = searchParams.get("gender");
    if (classId) setClassFilter(classId);
    if (cat) setCategoryFilter(cat);
    if (std) setStandardFilter(std);
    if (g) setGenderFilter(g);
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserRole(d?.user?.role ?? null))
      .catch(() => setUserRole(null));
  }, []);

  const applyClassFilter = (classId: string) => {
    setClassFilter(classId);
    setNoClassOnly(false);
    if (classId) {
      const cls = classes.find((c) => c.id === classId);
      if (cls?.standard) setStandardFilter(cls.standard);
    }
    setPage(1);
    setSelected(new Set());
  };

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      summary: "1",
    });
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (classFilter) params.set("classId", classFilter);
    else if (standardFilter) params.set("standard", standardFilter);
    if (genderFilter) params.set("gender", genderFilter);
    if (noClassOnly) params.set("noClass", "1");

    try {
      const res = await fetch(`/api/students?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setStudents([]);
        setTotal(0);
      } else {
        setStudents(data.students ?? []);
        setTotal(data.total ?? 0);
        if (data.summary) setSummary(data.summary);
      }
    } catch {
      setStudents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    search,
    statusFilter,
    categoryFilter,
    classFilter,
    standardFilter,
    genderFilter,
    noClassOnly,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchStudents, search]);

  const activeFilters = [
    statusFilter,
    categoryFilter,
    classFilter,
    genderFilter,
    standardFilter && !classFilter ? standardFilter : "",
    noClassOnly ? "noClass" : "",
  ].filter(Boolean).length;

  const selectedClass = classes.find((c) => c.id === classFilter);

  const clearFilters = () => {
    setStatusFilter("");
    setCategoryFilter("");
    setClassFilter("");
    setStandardFilter("");
    setGenderFilter("");
    setNoClassOnly(false);
    setSearch("");
    setPage(1);
    setSelected(new Set());
  };

  const standardOptions = useMemo(
    () =>
      [...new Set(classes.map((c) => c.standard).filter(Boolean))].sort(
        (a, b) => Number(a) - Number(b),
      ),
    [classes],
  );

  const classesForFilter = useMemo(() => {
    const list = standardFilter
      ? classes.filter((c) => c.standard === standardFilter)
      : classes;
    return [...list].sort((a, b) => {
      const na = Number(a.standard) - Number(b.standard);
      if (na !== 0) return na;
      return `${a.stream || ""}${a.section}`.localeCompare(`${b.stream || ""}${b.section}`);
    });
  }, [classes, standardFilter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === students.length) setSelected(new Set());
    else setSelected(new Set(students.map((s) => s.id)));
  };

  const deleteStudent = async (id: string) => {
    const ok = await confirm({
      title: t("common.delete"),
      message: t("students.confirmDelete"),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      variant: "destructive",
    });
    if (!ok) return;
    const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || t("students.deleteFailed"));
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    fetchStudents();
  };

  const exportSelected = () => {
    const ids = selected.size > 0 ? Array.from(selected).join(",") : "";
    window.open(`/api/students/export?${ids ? `ids=${ids}` : ""}`, "_blank");
  };

  const columns = useMemo<ColumnDef<StudentRow>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: () => (
          <button type="button" onClick={toggleAll} className="p-0.5">
            {selected.size === students.length && students.length > 0 ? (
              <CheckSquare className="h-4 w-4 text-blue-600" />
            ) : (
              <Square className="h-4 w-4 text-slate-400" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => toggleSelect(row.original.id)}
            className="p-0.5"
          >
            {selected.has(row.original.id) ? (
              <CheckSquare className="h-4 w-4 text-blue-600" />
            ) : (
              <Square className="h-4 w-4 text-slate-400" />
            )}
          </button>
        ),
      },
      {
        header: t("fields.grNumber"),
        accessorKey: "grNumber",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-slate-700">
            {row.original.grNumber || "—"}
          </span>
        ),
      },
      {
        header: t("fields.roll"),
        accessorKey: "rollNumber",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-600">
            {row.original.rollNumber || "—"}
          </span>
        ),
      },
      {
        header: t("common.name"),
        accessorFn: (s) => studentFullNameGu(s) || studentShortNameGu(s) || "",
        cell: ({ row }) => {
          const name =
            studentFullNameGu(row.original) || studentShortNameGu(row.original) || "—";
          const father = studentDisplayFatherName(row.original);
          return (
            <div>
              <p className="font-semibold leading-snug text-slate-900">{name}</p>
              {father ? (
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {t("fields.fatherName")}: {father}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        header: t("fields.class"),
        accessorFn: (s) => classLabel(s, t),
        cell: ({ row }) => (
          <span className="inline-flex rounded-lg bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800 border border-sky-100">
            {classLabel(row.original, t)}
          </span>
        ),
      },
      {
        header: t("fields.gender"),
        accessorKey: "gender",
        cell: ({ row }) => {
          const g = String(row.original.gender || "").toLowerCase();
          const tone =
            g.includes("female") || g === "f"
              ? "bg-rose-50 text-rose-700 border-rose-100"
              : g.includes("male") || g === "m"
                ? "bg-sky-50 text-sky-700 border-sky-100"
                : "bg-slate-100 text-slate-700 border-slate-200";
          return (
            <span className={cn("inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md border px-1.5 text-[11px] font-bold", tone)}>
              {genderShort(row.original.gender)}
            </span>
          );
        },
      },
      {
        header: t("fields.category"),
        accessorKey: "category",
        cell: ({ row }) => <CategoryBadge category={row.original.category} />,
      },
      {
        header: t("fields.mobile"),
        accessorKey: "mobileNumber",
        cell: ({ row }) => (
          <span className="text-xs text-slate-700">{row.original.mobileNumber || "—"}</span>
        ),
      },
      {
        header: t("fields.dob"),
        accessorKey: "dateOfBirth",
        cell: ({ row }) => (
          <span className="text-xs text-slate-600">{row.original.dateOfBirth || "—"}</span>
        ),
      },
      {
        header: t("fields.aadhaar"),
        accessorKey: "aadhaarNumber",
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-slate-500">
            {maskAadhaar(row.original.aadhaarNumber)}
          </span>
        ),
      },
      {
        header: t("common.status"),
        accessorKey: "status",
        cell: ({ row }) => <Badge status={row.original.status} />,
      },
      {
        id: "actions",
        header: () => <span className="block text-right">{t("common.actions")}</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-0.5">
            <Link href={`/id-cards?studentId=${row.original.id}`}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={t("students.idCard")}
              >
                <CreditCard className="h-3.5 w-3.5 text-pink-600" />
              </Button>
            </Link>
            <Link href={`/auto-apply?ids=${row.original.id}`}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={t("students.autoFill")}
              >
                <Play className="h-3.5 w-3.5 text-emerald-600" />
              </Button>
            </Link>
            <Link href={`/students/${row.original.id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href={`/students/${row.original.id}/edit`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => deleteStudent(row.original.id)}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    [selected, students.length, t],
  );

  return (
    <PageShell
      title={t("students.title")}
      subtitle={t("students.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: userRole === "clerk" ? "/clerk" : "/dashboard" },
        { label: t("nav.students") },
      ]}
      icon={<Users className="h-5 w-5" />}
      actions={
        <div className="grid w-full grid-cols-1 gap-2 min-[350px]:grid-cols-[0.9fr_1.1fr] sm:flex sm:w-auto">
          <Button
            variant="outline"
            onClick={exportSelected}
            className="w-full whitespace-nowrap px-3 sm:w-auto sm:px-4"
          >
            <Download className="h-3.5 w-3.5" />
            {t("common.export")}
          </Button>
          <Link
            href={classFilter ? `/students/new?classId=${classFilter}` : "/students/new"}
            className="w-full sm:w-auto"
          >
            <Button className="w-full whitespace-nowrap px-3 sm:w-auto sm:px-4">
              <Plus className="h-4 w-4 shrink-0" />
              <span>{t("students.addStudent")}</span>
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Colorful summary strip */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100/80 bg-gradient-to-r from-white via-sky-50/40 to-violet-50/30 px-2.5 py-2 shadow-sm">
          {[
            {
              key: "total",
              label: t("students.statTotal"),
              value: summary?.total ?? total,
              active: !genderFilter && !noClassOnly && !classFilter && !standardFilter,
              onClick: () => clearFilters(),
              idle: "border-indigo-100 bg-indigo-50/80 text-indigo-950 hover:bg-indigo-100",
              activeCls: "border-transparent bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-200/60",
              labelIdle: "text-indigo-600",
              labelActive: "text-indigo-100",
            },
            {
              key: "boys",
              label: t("students.statBoys"),
              value: summary?.male ?? "—",
              active: genderFilter === "Male",
              onClick: () => {
                setGenderFilter((g) => (g === "Male" ? "" : "Male"));
                setNoClassOnly(false);
                setPage(1);
              },
              idle: "border-sky-100 bg-sky-50/80 text-sky-950 hover:bg-sky-100",
              activeCls: "border-transparent bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-200/60",
              labelIdle: "text-sky-600",
              labelActive: "text-sky-100",
            },
            {
              key: "girls",
              label: t("students.statGirls"),
              value: summary?.female ?? "—",
              active: genderFilter === "Female",
              onClick: () => {
                setGenderFilter((g) => (g === "Female" ? "" : "Female"));
                setNoClassOnly(false);
                setPage(1);
              },
              idle: "border-rose-100 bg-rose-50/80 text-rose-950 hover:bg-rose-100",
              activeCls: "border-transparent bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-200/60",
              labelIdle: "text-rose-600",
              labelActive: "text-rose-100",
            },
            {
              key: "noclass",
              label: t("students.statNoClass"),
              value: summary?.noClass ?? "—",
              active: noClassOnly,
              onClick: () => {
                setNoClassOnly((v) => !v);
                setClassFilter("");
                setStandardFilter("");
                setPage(1);
              },
              idle: "border-amber-100 bg-amber-50/80 text-amber-950 hover:bg-amber-100",
              activeCls: "border-transparent bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-200/60",
              labelIdle: "text-amber-700",
              labelActive: "text-amber-100",
            },
          ].map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={s.onClick}
              className={cn(
                "flex min-h-14 min-w-[7.5rem] flex-1 cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-all sm:flex-none",
                s.active ? s.activeCls : s.idle,
              )}
            >
              <span className={cn("text-[11px] font-semibold", s.active ? s.labelActive : s.labelIdle)}>
                {s.label}
              </span>
              <span className="text-base font-bold tabular-nums">
                {typeof s.value === "number" ? s.value.toLocaleString("en-IN") : s.value}
              </span>
            </button>
          ))}
          <div className="ml-auto hidden items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800 sm:flex">
            <span className="font-bold text-emerald-700 tabular-nums">
              {total.toLocaleString("en-IN")}
            </span>
            {t("students.statFiltered")}
          </div>
        </div>

        <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
          <div className="border-b border-slate-100 bg-white p-3 sm:p-4">
            {/* Search + clear */}
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder={t("students.searchPlaceholder")}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />
              </div>
              {(activeFilters > 0 || search) && (
                <Button variant="ghost" size="sm" className="h-10 shrink-0 px-3" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("students.clear")}</span>
                </Button>
              )}
            </div>

            {/* Standard pills — few buttons only */}
            {standardOptions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setStandardFilter("");
                    setClassFilter("");
                    setNoClassOnly(false);
                    setPage(1);
                  }}
                  className={cn(
                    "min-h-9 cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold transition min-[380px]:px-3 min-[380px]:text-xs",
                    !standardFilter && !noClassOnly
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-200"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100",
                  )}
                >
                  {t("students.allStandards")}
                </button>
                {standardOptions.map((std) => (
                  <button
                    key={std}
                    type="button"
                    onClick={() => {
                      setStandardFilter(std);
                      setClassFilter("");
                      setNoClassOnly(false);
                      setPage(1);
                    }}
                    className={cn(
                      "min-h-9 cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold transition min-[380px]:px-3 min-[380px]:text-xs",
                      standardFilter === std
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-200"
                        : "bg-slate-50 text-slate-600 hover:bg-sky-50 hover:text-sky-700 border border-slate-200 hover:border-sky-200",
                    )}
                  >
                    {t("students.stdShort", { standard: std })}
                  </button>
                ))}
              </div>
            )}

            {/* Compact filters grid */}
            <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-4">
              <Select
                label={t("students.filterByClass")}
                emptyLabel={t("students.allClasses")}
                options={classesForFilter.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c._count?.students ?? 0})`,
                }))}
                value={classFilter}
                onChange={(e) => applyClassFilter(e.target.value)}
              />
              <Select
                label={t("students.filterByGender")}
                emptyLabel={t("students.allGenders")}
                options={GENDERS.map((g) => ({ value: g, label: t(`gender.${g}`) }))}
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value);
                  setNoClassOnly(false);
                  setPage(1);
                }}
              />
              <Select
                label={t("students.filterByCategory")}
                emptyLabel={t("students.allCategories")}
                options={CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}`) }))}
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
              />
              <Select
                label={t("students.filterByStatus")}
                emptyLabel={t("students.allStatuses")}
                options={STUDENT_STATUSES.map((s) => ({
                  value: s.value,
                  label: t(`status.${s.value}`),
                }))}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {(activeFilters > 0 || search) && (
              <p className="mt-2.5 text-xs text-slate-500">
                {t("students.showingRange", {
                  from: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
                  to: Math.min(page * PAGE_SIZE, total),
                  total,
                })}
                {selectedClass ? ` · ${selectedClass.name}` : ""}
              </p>
            )}
          </div>

          {loading && students.length === 0 ? (
            <div className="flex h-40 items-center justify-center lg:hidden">
              <Spinner size="md" />
            </div>
          ) : null}

          {!loading && students.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <Users className="mx-auto mb-2 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">{t("students.noStudents")}</p>
              {activeFilters > 0 || search ? (
                <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                  {t("students.clearFilters")}
                </Button>
              ) : (
                <Link href="/students/new" className="mt-3 inline-block">
                  <Button size="sm">{t("students.addStudent")}</Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block">
                <GlobalDataTable
                  data={students}
                  columns={columns}
                  loading={loading}
                  emptyText={t("students.noStudents")}
                  manualPagination
                  totalRows={total}
                  pageSize={PAGE_SIZE}
                  pageIndex={Math.max(page - 1, 0)}
                  onPageChange={(idx) => setPage(idx + 1)}
                  getRowClassName={(row) =>
                    selected.has(row.id) ? "bg-blue-50/50" : undefined
                  }
                  className="rounded-none border-0 shadow-none"
                />
              </div>

              {/* Compact responsive table */}
              {loading && students.length === 0 ? null : (
                <>
                  <div className="lg:hidden">
                    <table className="w-full table-fixed text-left">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="w-12 px-2 py-3 text-center">
                            <button
                              type="button"
                              onClick={toggleAll}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-200"
                              aria-label={t("students.selected", { count: students.length })}
                            >
                              {selected.size === students.length && students.length > 0 ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5 text-slate-400" />
                              )}
                            </button>
                          </th>
                          <th className="px-2 py-3">{t("common.name")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {students.map((student) => {
                          const name =
                            studentFullNameGu(student) ||
                            studentShortNameGu(student) ||
                            "—";
                          const father = studentDisplayFatherName(student);
                          return (
                            <tr
                              key={student.id}
                              className={cn(
                                "align-top transition-colors",
                                selected.has(student.id) && "bg-blue-50/60",
                              )}
                            >
                              <td className="px-2 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleSelect(student.id)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100"
                                  aria-label={t("students.selected", {
                                    count: selected.has(student.id) ? 1 : 0,
                                  })}
                                >
                                  {selected.has(student.id) ? (
                                    <CheckSquare className="h-5 w-5 text-blue-600" />
                                  ) : (
                                    <Square className="h-5 w-5 text-slate-400" />
                                  )}
                                </button>
                              </td>
                              <td className="min-w-0 px-2 py-3 pr-3">
                                <div className="flex min-w-0 items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="break-words text-sm font-semibold leading-snug text-slate-900">
                                      {name}
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                      {classLabel(student, t)} ·{" "}
                                      {genderShort(normalizeGender(student.gender))}
                                      {student.category ? ` · ${student.category}` : ""}
                                    </p>
                                  </div>
                                  <div className="shrink-0">
                                    <Badge status={student.status} />
                                  </div>
                                </div>

                                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
                                  <span>GR: {student.grNumber || "—"}</span>
                                  <span>Roll: {student.rollNumber || "—"}</span>
                                  <span className="truncate">{student.mobileNumber || "—"}</span>
                                  <span>DOB: {student.dateOfBirth || "—"}</span>
                                  {father ? (
                                    <span className="col-span-2 truncate">
                                      {t("fields.fatherName")}: {father}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="mt-2.5 flex flex-wrap items-center gap-1">
                                  <Link href={`/students/${student.id}`}>
                                    <Button variant="outline" size="sm" className="h-9 px-2.5">
                                      <Eye className="h-3.5 w-3.5" />
                                      {t("common.view")}
                                    </Button>
                                  </Link>
                                  <Link href={`/id-cards?studentId=${student.id}`}>
                                    <Button variant="ghost" size="icon-sm" className="h-9 w-9" title={t("students.idCard")}>
                                      <CreditCard className="h-4 w-4 text-pink-600" />
                                    </Button>
                                  </Link>
                                  <Link href={`/auto-apply?ids=${student.id}`}>
                                    <Button variant="ghost" size="icon-sm" className="h-9 w-9" title={t("students.autoFill")}>
                                      <Play className="h-4 w-4 text-emerald-600" />
                                    </Button>
                                  </Link>
                                  <Link href={`/students/${student.id}/edit`}>
                                    <Button variant="secondary" size="icon-sm" className="h-9 w-9" title={t("common.edit")}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="h-9 w-9 text-red-500"
                                    onClick={() => deleteStudent(student.id)}
                                    title={t("common.delete")}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="lg:hidden">
                    <TablePagination
                      page={page}
                      total={total}
                      pageSize={PAGE_SIZE}
                      onPageChange={setPage}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </Card>
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-40 grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:left-auto sm:right-6 sm:w-auto sm:max-w-lg sm:grid-cols-[auto_1fr] sm:items-center">
          <span className="text-sm font-semibold text-slate-700">
            {t("students.selected", { count: selected.size })}
          </span>
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            <Link href={`/bulk-submit?ids=${Array.from(selected).join(",")}`} className="w-full">
              <Button className="h-10 w-full text-xs">
                {t("students.bulkSubmitSelected")}
              </Button>
            </Link>
            {selected.size > 1 && userRole === "school_admin" && (
              <Link href={`/auto-apply?ids=${Array.from(selected).join(",")}`} className="w-full">
                <Button variant="secondary" className="h-10 w-full text-xs">
                  <Play className="h-3 w-3" />
                  {t("autoApply.title")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog />
    </PageShell>
  );
}
