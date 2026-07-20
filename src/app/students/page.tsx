"use client";

import { studentShortNameGu } from "@/lib/student-names";

import { useEffect, useState, useCallback, Suspense } from "react";
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
  Filter,
  X,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Student, SchoolClass } from "@/generated/prisma/client";
import { TablePagination } from "@/components/ui/table-pagination";
import { PAGE_SIZE } from "@/lib/pagination";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/hooks/use-confirm";

type StudentRow = Student & {
  schoolClass?: Pick<SchoolClass, "id" | "name" | "standard" | "section"> | null;
};
type ClassMeta = SchoolClass & { _count?: { students: number } };

export default function StudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-32 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const classId = searchParams.get("classId");
    const cat = searchParams.get("category");
    if (classId) setClassFilter(classId);
    if (cat) setCategoryFilter(cat);
    if (classId || cat) setShowFilters(true);
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/classes?academicYear=2025-26")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []));
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserRole(d?.user?.role ?? null))
      .catch(() => setUserRole(null));
  }, []);

  const applyClassFilter = (classId: string) => {
    setClassFilter(classId);
    setPage(1);
    setSelected(new Set());
  };

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (classFilter) params.set("classId", classFilter);
    if (genderFilter) params.set("gender", genderFilter);

    const res = await fetch(`/api/students?${params}`);
    const data = await res.json();
    if (!res.ok) {
      setStudents([]);
      setTotal(0);
    } else {
      setStudents(data.students ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [page, search, statusFilter, categoryFilter, classFilter, genderFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchStudents, search]);

  const activeFilters = [statusFilter, categoryFilter, classFilter, genderFilter].filter(Boolean).length;
  const selectedClass = classes.find((c) => c.id === classFilter);

  const clearFilters = () => {
    setStatusFilter("");
    setCategoryFilter("");
    setClassFilter("");
    setGenderFilter("");
    setSearch("");
    setPage(1);
    setSelected(new Set());
  };

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
    await confirm({
      title: t("common.delete"),
      message: t("students.confirmDelete"),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      variant: "destructive",
      onConfirm: async () => {
        await fetch(`/api/students/${id}`, { method: "DELETE" });
        fetchStudents();
      },
    });
  };

  const exportSelected = () => {
    const ids = selected.size > 0 ? Array.from(selected).join(",") : "";
    window.open(`/api/students/export?${ids ? `ids=${ids}` : ""}`, "_blank");
  };

  return (
    <PageShell
      title={t("students.title")}
      subtitle={t("students.totalCount", { count: total })}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: userRole === "clerk" ? "/clerk" : "/dashboard" },
        { label: t("nav.students") },
      ]}
      icon={<Users className="h-5 w-5" />}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={exportSelected}>
            <Download className="h-3.5 w-3.5" />
            {t("common.export")}
          </Button>
          <Link href={classFilter ? `/students/new?classId=${classFilter}` : "/students/new"}>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              {t("students.addStudent")}
            </Button>
          </Link>
        </>
      }
    >
      <div className="space-y-3">
        <Card className="overflow-hidden rounded-xl border-slate-200/80 shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col gap-2 border-b border-slate-100 bg-white p-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                placeholder={t("students.searchPlaceholder")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
              />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                className="h-9"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-3.5 w-3.5" />
                {t("common.filter")}
                {activeFilters > 0 && (
                  <span className="ml-0.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {activeFilters}
                  </span>
                )}
              </Button>
              {(activeFilters > 0 || search) && (
                <Button variant="ghost" size="sm" className="h-9 px-2" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
              <span className="hidden rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 sm:inline">
                {total.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Class chips — horizontal scroll */}
          {classes.length > 0 && (
            <div className="border-b border-slate-100 bg-slate-50/60 px-3 py-2">
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => applyClassFilter("")}
                  className={cn(
                    "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    !classFilter
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-blue-300"
                  )}
                >
                  {t("students.allClasses")}
                </button>
                {classes.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => applyClassFilter(c.id)}
                    className={cn(
                      "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      classFilter === c.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-blue-300"
                    )}
                  >
                    {c.name}
                    <span className="ml-1 opacity-70">{(c._count?.students || 0).toLocaleString("en-IN")}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Expandable filters */}
          {showFilters && (
            <div className="grid grid-cols-2 gap-2 border-b border-slate-100 bg-white p-3 lg:grid-cols-4">
              <Select
                label={t("students.filterByClass")}
                emptyLabel={t("students.allClasses")}
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
                value={classFilter}
                onChange={(e) => applyClassFilter(e.target.value)}
              />
              <Select
                label={t("students.filterByStatus")}
                emptyLabel={t("students.allStatuses")}
                options={STUDENT_STATUSES.map((s) => ({ value: s.value, label: t(`status.${s.value}`) }))}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
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
                label={t("students.filterByGender")}
                emptyLabel={t("students.allGenders")}
                options={GENDERS.map((g) => ({ value: g, label: t(`gender.${g}`) }))}
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          )}

          {/* Active filter hint */}
          {((classFilter && selectedClass) || activeFilters > 0) && (
            <div className="flex items-center justify-between gap-2 border-b border-blue-100 bg-blue-50/50 px-3 py-1.5 text-xs text-blue-800">
              <span className="truncate">
                {classFilter && selectedClass
                  ? t("students.showingClass", { name: selectedClass.name, year: selectedClass.academicYear })
                  : t("students.showingFiltered")}
                {activeFilters > 0 && ` · ${t("students.activeFilters", { count: activeFilters })}`}
              </span>
              <button type="button" onClick={clearFilters} className="shrink-0 font-medium hover:underline">
                {t("students.clear")}
              </button>
            </div>
          )}

          {/* Table body */}
          {loading ? (
            <div className="flex h-36 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : students.length === 0 ? (
            <div className="px-4 py-10 text-center">
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="w-9 px-2 py-2">
                      <button type="button" onClick={toggleAll} className="p-0.5">
                        {selected.size === students.length ? (
                          <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                        ) : (
                          <Square className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="px-2 py-2 font-semibold">{t("fields.roll")}</th>
                    <th className="px-2 py-2 font-semibold">{t("common.name")}</th>
                    <th className="hidden px-2 py-2 font-semibold md:table-cell">{t("fields.class")}</th>
                    <th className="hidden px-2 py-2 font-semibold sm:table-cell">{t("fields.category")}</th>
                    <th className="hidden px-2 py-2 font-semibold lg:table-cell">{t("fields.aadhaar")}</th>
                    <th className="px-2 py-2 font-semibold">{t("common.status")}</th>
                    <th className="px-2 py-2 text-right font-semibold">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className={cn(
                        "transition-colors hover:bg-slate-50/80",
                        selected.has(student.id) && "bg-blue-50/40"
                      )}
                    >
                      <td className="px-2 py-2">
                        <button type="button" onClick={() => toggleSelect(student.id)} className="p-0.5">
                          {selected.has(student.id) ? (
                            <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-2 py-2 font-mono text-[11px] text-slate-600">
                        {student.rollNumber || "—"}
                      </td>
                      <td className="px-2 py-2">
                        <p className="font-medium leading-tight text-slate-900">{studentShortNameGu(student)}</p>
                        <p className="text-[11px] text-slate-500">{student.mobileNumber}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400 md:hidden">
                          {student.schoolClass?.name ||
                            (student.standard
                              ? t("students.classLabel", {
                                  standard: student.standard,
                                  section: student.section || "",
                                })
                              : student.courseName || "—")}
                        </p>
                      </td>
                      <td className="hidden px-2 py-2 text-slate-700 md:table-cell">
                        {student.schoolClass?.name ||
                          (student.standard
                            ? t("students.classLabel", {
                                standard: student.standard,
                                section: student.section || "",
                              })
                            : student.courseName || "—")}
                      </td>
                      <td className="hidden px-2 py-2 sm:table-cell">
                        <CategoryBadge category={student.category} />
                      </td>
                      <td className="hidden px-2 py-2 font-mono text-[11px] text-slate-600 lg:table-cell">
                        {student.aadhaarNumber}
                      </td>
                      <td className="px-2 py-2">
                        <Badge status={student.status} />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-0.5">
                          <Link href={`/id-cards?classId=${student.classId || ""}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title={t("students.idCard")}>
                              <CreditCard className="h-3.5 w-3.5 text-pink-600" />
                            </Button>
                          </Link>
                          <Link href={`/students/${student.id}/auto-submit`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title={t("students.autoFill")}>
                              <Play className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                          </Link>
                          <Link href={`/students/${student.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/students/${student.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => deleteStudent(student.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <TablePagination page={page} total={total} onPageChange={setPage} />
        </Card>
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-3 right-3 z-40 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg sm:left-auto sm:right-6 sm:max-w-md">
          <span className="text-xs font-semibold text-slate-700">
            {t("students.selected", { count: selected.size })}
          </span>
          <div className="flex items-center gap-1.5">
            <Link href={`/bulk-submit?ids=${Array.from(selected).join(",")}`}>
              <Button size="sm" className="h-8 text-xs">
                {t("students.bulkSubmitSelected")}
              </Button>
            </Link>
            {selected.size > 1 && userRole === "school_admin" && (
              <Link href={`/auto-apply?ids=${Array.from(selected).join(",")}`}>
                <Button size="sm" variant="secondary" className="h-8 text-xs">
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
