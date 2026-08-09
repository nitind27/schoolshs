"use client";

import { Spinner } from "@/components/ui/loader";
import {
  studentDisplayFatherName,
  studentFullNameGu,
  studentShortNameGu,
} from "@/lib/student-names";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge, CategoryBadge } from "@/components/ui/badge";
import { CATEGORIES, GENDERS } from "@/lib/constants";
import {
  Search,
  UserCheck,
  Users,
  ArrowLeft,
  Eye,
} from "lucide-react";
import Link from "next/link";
import type { Student, SchoolClass } from "@/generated/prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { GlobalDataTable } from "@/components/ui/global-data-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";
import { useConfirm } from "@/hooks/use-confirm";

const PAGE_SIZE = 25;

type StudentRow = Student & {
  schoolClass?: Pick<
    SchoolClass,
    "id" | "name" | "standard" | "section" | "stream" | "academicYear"
  > | null;
};

type ClassMeta = SchoolClass & { _count?: { students: number } };

function classLabel(student: StudentRow, t: (k: string, p?: Record<string, string>) => string) {
  if (student.schoolClass?.name) return student.schoolClass.name;
  if (student.standard) {
    return t("students.classLabel", {
      standard: student.standard,
      section: student.section || "",
    });
  }
  return "—";
}

export default function InactiveStudentsPage() {
  const t = useT();
  const { confirm, ConfirmDialog } = useConfirm();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [standardFilter, setStandardFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .catch(() => setClasses([]));
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserRole(d?.user?.role ?? null))
      .catch(() => setUserRole(null));
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      status: "archived",
    });
    if (search.trim()) params.set("search", search.trim());
    if (categoryFilter) params.set("category", categoryFilter);
    if (classFilter) params.set("classId", classFilter);
    else if (standardFilter) params.set("standard", standardFilter);
    if (genderFilter) params.set("gender", genderFilter);

    try {
      const res = await fetch(`/api/students?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setStudents([]);
        setTotal(0);
      } else {
        setStudents(data.students ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      setStudents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, classFilter, standardFilter, genderFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchStudents();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchStudents, search]);

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

  const activateStudent = async (id: string) => {
    const ok = await confirm({
      title: t("students.activateTitle"),
      message: t("students.confirmActivate"),
      confirmLabel: t("students.activate"),
      cancelLabel: t("common.cancel"),
    });
    if (!ok) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/students/${id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || t("students.activateFailed"));
        return;
      }
      await fetchStudents();
    } finally {
      setBusyId(null);
    }
  };

  const columns = useMemo<ColumnDef<StudentRow>[]>(
    () => [
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
          <span className="text-sm text-slate-700">{classLabel(row.original, t)}</span>
        ),
      },
      {
        header: t("fields.category"),
        accessorKey: "category",
        cell: ({ row }) =>
          row.original.category ? <CategoryBadge category={row.original.category} /> : "—",
      },
      {
        header: t("common.status"),
        accessorKey: "status",
        cell: () => <Badge status="archived" />,
      },
      {
        id: "actions",
        header: () => <span className="block text-right">{t("common.actions")}</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Link href={`/students/${row.original.id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8" title={t("common.view")}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              disabled={busyId === row.original.id}
              onClick={() => activateStudent(row.original.id)}
            >
              <UserCheck className="h-3.5 w-3.5" />
              {t("students.activate")}
            </Button>
          </div>
        ),
      },
    ],
    [busyId, t],
  );

  return (
    <PageShell
      title={t("students.inactiveTitle")}
      subtitle={t("students.inactiveSubtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: userRole === "clerk" ? "/clerk" : "/dashboard" },
        { label: t("nav.students"), href: "/students" },
        { label: t("students.inactiveStudents") },
      ]}
      icon={<Users className="h-5 w-5" />}
      actions={
        <Link href="/students">
          <Button variant="outline" className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("students.backToActive")}
          </Button>
        </Link>
      }
    >
      <ConfirmDialog />

      <Card className="overflow-hidden border-amber-100">
        <div className="border-b border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          {t("students.inactiveBanner")}
        </div>

        <div className="space-y-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("students.searchPlaceholder")}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none ring-sky-200 focus:ring-2"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-4">
            <Select
              label={t("students.filterByClass")}
              emptyLabel={t("students.allClasses")}
              options={classesForFilter.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
            />
            <Select
              label={t("students.filterByStandard")}
              emptyLabel={t("students.allStandards")}
              options={standardOptions.map((s) => ({
                value: s,
                label: t("students.stdShort", { standard: s }),
              }))}
              value={standardFilter}
              onChange={(e) => {
                setStandardFilter(e.target.value);
                setClassFilter("");
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
          </div>
        </div>

        <div className="border-t border-slate-100 px-2 pb-2 sm:px-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Spinner size="md" />
            </div>
          ) : students.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">
              {t("students.inactiveEmpty")}
            </p>
          ) : (
            <GlobalDataTable data={students} columns={columns} />
          )}
          <TablePagination page={page} total={total} onPageChange={setPage} pageSize={PAGE_SIZE} />
        </div>
      </Card>
    </PageShell>
  );
}
