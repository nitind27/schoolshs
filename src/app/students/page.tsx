"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge, CategoryBadge } from "@/components/ui/badge";
import { CATEGORIES, STUDENT_STATUSES, SCHOOL_STANDARDS, CLASS_SECTIONS, GENDERS } from "@/lib/constants";
import { Search, Plus, Trash2, Edit, Eye, Download, CheckSquare, Square, Play, CreditCard, Filter, X, Users } from "lucide-react";
import Link from "next/link";
import type { Student, SchoolClass } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";

type StudentRow = Student & {
  schoolClass?: Pick<SchoolClass, "id" | "name" | "standard" | "section"> | null;
};
type ClassMeta = SchoolClass & { _count?: { students: number } };

export default function StudentsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center h-48 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
      <StudentsContent />
    </Suspense>
  );
}

function StudentsContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [standardFilter, setStandardFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const classId = searchParams.get("classId");
    const cat = searchParams.get("category");
    const std = searchParams.get("standard");
    const sec = searchParams.get("section");
    if (classId) setClassFilter(classId);
    if (cat) setCategoryFilter(cat);
    if (std) setStandardFilter(std);
    if (sec) setSectionFilter(sec);
    if (classId || cat || std || sec) setShowFilters(true);
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
    if (classId) {
      const cls = classes.find((c) => c.id === classId);
      if (cls) {
        setStandardFilter(cls.standard);
        setSectionFilter(cls.section);
      }
    }
  };

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (classFilter) params.set("classId", classFilter);
    else {
      if (standardFilter) params.set("standard", standardFilter);
      if (sectionFilter) params.set("section", sectionFilter);
    }
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
  }, [page, search, statusFilter, categoryFilter, classFilter, standardFilter, sectionFilter, genderFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchStudents, search]);

  const activeFilters = [statusFilter, categoryFilter, classFilter, standardFilter, sectionFilter, genderFilter].filter(Boolean).length;
  const selectedClass = classes.find((c) => c.id === classFilter);

  const clearFilters = () => {
    setStatusFilter("");
    setCategoryFilter("");
    setClassFilter("");
    setStandardFilter("");
    setSectionFilter("");
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
    if (!confirm(t("students.confirmDelete"))) return;
    await fetch(`/api/students/${id}`, { method: "DELETE" });
    fetchStudents();
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
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("nav.students") },
      ]}
      actions={(
        <>
          <Button variant="outline" onClick={exportSelected}>
            <Download className="h-4 w-4" /> {t("common.export")}
          </Button>
          <Link href={classFilter ? `/students/new?classId=${classFilter}` : "/students/new"}>
            <Button><Plus className="h-4 w-4" /> {t("students.addStudent")}</Button>
          </Link>
        </>
      )}
    >
      {classes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("students.quickClassFilter")}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setClassFilter("");
                  setStandardFilter("");
                  setSectionFilter("");
                  setPage(1);
                  setSelected(new Set());
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  !classFilter
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
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
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    classFilter === c.id
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                  )}
                >
                  {c.name}
                  <span className="ml-1.5 opacity-80">({(c._count?.students || 0).toLocaleString("en-IN")})</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                placeholder={t("students.searchPlaceholder")}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4" />
              {t("common.filter")} {activeFilters > 0 && `(${activeFilters})`}
            </Button>
            {activeFilters > 0 && (
              <Button variant="ghost" onClick={clearFilters}>
                <X className="h-4 w-4" /> {t("students.clearFilters")}
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
              <Select
                label={t("students.filterByClass")}
                emptyLabel={t("students.allClasses")}
                options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.standard}-${c.section})` }))}
                value={classFilter}
                onChange={(e) => applyClassFilter(e.target.value)}
              />
              <Select
                label={t("students.filterByStandard")}
                emptyLabel={t("students.allStandards")}
                options={SCHOOL_STANDARDS.map((s) => ({ value: s, label: s }))}
                value={standardFilter}
                disabled={!!classFilter}
                onChange={(e) => { setStandardFilter(e.target.value); setPage(1); }}
              />
              <Select
                label={t("students.filterBySection")}
                emptyLabel={t("students.allSections")}
                options={CLASS_SECTIONS.map((s) => ({ value: s, label: s }))}
                value={sectionFilter}
                disabled={!!classFilter}
                onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
              />
              <Select
                label={t("students.filterByStatus")}
                emptyLabel={t("students.allStatuses")}
                options={STUDENT_STATUSES.map((s) => ({ value: s.value, label: t(`status.${s.value}`) }))}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              />
              <Select
                label={t("students.filterByCategory")}
                emptyLabel={t("students.allCategories")}
                options={CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}`) }))}
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              />
              <Select
                label={t("students.filterByGender")}
                emptyLabel={t("students.allGenders")}
                options={GENDERS.map((g) => ({ value: g, label: t(`gender.${g}`) }))}
                value={genderFilter}
                onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {(classFilter && selectedClass) || activeFilters > 0 ? (
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {classFilter && selectedClass ? (
                <span>
                  {t("students.showingClass", { name: selectedClass.name, year: selectedClass.academicYear })}
                </span>
              ) : (
                <span>{t("students.showingFiltered")}</span>
              )}
              {activeFilters > 0 && (
                <span className="ml-2 text-slate-400">· {t("students.activeFilters", { count: activeFilters })}</span>
              )}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Users className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p className="text-slate-500 mb-4">{t("students.noStudents")}</p>
              {activeFilters > 0 || search ? (
                <Button variant="outline" onClick={clearFilters}>{t("students.clearFilters")}</Button>
              ) : (
                <Link href="/students/new"><Button>{t("students.addStudent")}</Button></Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="p-3 text-left w-10">
                      <button onClick={toggleAll}>
                        {selected.size === students.length ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4 text-slate-400" />}
                      </button>
                    </th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("fields.roll")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("common.name")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("fields.class")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("fields.category")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("fields.aadhaar")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("common.status")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3">
                        <button onClick={() => toggleSelect(student.id)}>
                          {selected.has(student.id) ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4 text-slate-400" />}
                        </button>
                      </td>
                      <td className="p-3 font-mono text-xs">{student.rollNumber || "—"}</td>
                      <td className="p-3">
                        <p className="font-medium text-slate-900">{student.firstName} {student.surname}</p>
                        <p className="text-xs text-slate-500">{student.mobileNumber}</p>
                      </td>
                      <td className="p-3">
                        <p className="text-slate-700">{student.schoolClass?.name || (student.standard ? t("students.classLabel", { standard: student.standard, section: student.section || "" }) : student.courseName || "—")}</p>
                      </td>
                      <td className="p-3"><CategoryBadge category={student.category} /></td>
                      <td className="p-3 font-mono text-xs">{student.aadhaarNumber}</td>
                      <td className="p-3"><Badge status={student.status} /></td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/id-cards?classId=${student.classId || ""}`}>
                            <Button variant="ghost" size="icon" title={t("students.idCard")}><CreditCard className="h-4 w-4 text-pink-600" /></Button>
                          </Link>
                          <Link href={`/students/${student.id}/auto-submit`}>
                            <Button variant="ghost" size="icon" title={t("students.autoFill")}><Play className="h-4 w-4 text-emerald-600" /></Button>
                          </Link>
                          <Link href={`/students/${student.id}`}><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></Link>
                          <Link href={`/students/${student.id}/edit`}><Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button></Link>
                          <Button variant="ghost" size="icon" onClick={() => deleteStudent(student.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > 50 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-200">
              <p className="text-sm text-slate-500">{t("students.showingRange", { from: (page - 1) * 50 + 1, to: Math.min(page * 50, total), total })}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>{t("common.previous")}</Button>
                <Button variant="outline" size="sm" disabled={page * 50 >= total} onClick={() => setPage((p) => p + 1)}>{t("common.next")}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 lg:translate-x-0 lg:left-auto lg:right-8 bg-white border border-slate-200 shadow-xl rounded-xl p-4 flex items-center gap-4 z-40 flex-wrap max-w-lg">
          <span className="text-sm font-medium">{t("students.selected", { count: selected.size })}</span>
          <Link href={`/bulk-submit?ids=${Array.from(selected).join(",")}`}>
            <Button size="sm">{t("students.bulkSubmitSelected")}</Button>
          </Link>
          {selected.size > 1 && userRole === "school_admin" && (
            <Link href={`/auto-apply?ids=${Array.from(selected).join(",")}`}>
              <Button size="sm" variant="secondary">
                <Play className="h-4 w-4" /> {t("autoApply.title")}
              </Button>
            </Link>
          )}
        </div>
      )}
    </PageShell>
  );
}
