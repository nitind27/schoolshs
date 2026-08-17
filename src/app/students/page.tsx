"use client";

import { Spinner } from "@/components/ui/loader";
import {
  studentDisplayFatherName,
  studentFullNameGu,
  studentShortNameGu,
} from "@/lib/student-names";
import { useEffect, useState, useCallback, useMemo, Suspense, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge, CategoryBadge } from "@/components/ui/badge";
import { CATEGORIES, STUDENT_STATUSES, GENDERS } from "@/lib/constants";
import { MANAGE_STANDARDS, classGroupKey, classGroupLabel } from "@/lib/class-structure";
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
  UserX,
  Ban,
  MoreHorizontal,
  Phone,
  Calendar,
  FilePen,
  Layers,
  School,
} from "lucide-react";
import Link from "next/link";
import type { Student, SchoolClass } from "@/generated/prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { GlobalDataTable } from "@/components/ui/global-data-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";
import { InfoModal } from "@/components/ui/info-modal";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/hooks/use-confirm";
import { genderShort, normalizeGender } from "@/lib/gender-utils";
import { useSchoolFeatures } from "@/components/school/use-school-features";

const PAGE_SIZE = 25;

function studentInitial(name: string) {
  const ch = name.trim().charAt(0);
  return ch || "?";
}

function genderTone(gender?: string | null) {
  const g = String(gender || "").toLowerCase();
  if (g.includes("female") || g === "f") return "bg-rose-50 text-rose-700 border-rose-100";
  if (g.includes("male") || g === "m") return "bg-sky-50 text-sky-700 border-sky-100";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function StudentRowActions({
  studentId,
  onDeactivate,
  onDelete,
  compact = false,
  showAutoApply = true,
}: {
  studentId: string;
  onDeactivate: () => void;
  onDelete: () => void;
  compact?: boolean;
  showAutoApply?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const placeMenu = useCallback(() => {
    const btn = menuBtnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const menuW = 184;
    const left = Math.min(
      Math.max(8, compact ? r.left : r.right - menuW),
      window.innerWidth - menuW - 8,
    );
    const below = r.bottom + 6;
    const estimatedH = 180;
    const top =
      below + estimatedH > window.innerHeight - 8
        ? Math.max(8, r.top - estimatedH - 6)
        : below;
    setMenuPos({ top, left });
  }, [compact]);

  useEffect(() => {
    if (!open) return;
    placeMenu();
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, placeMenu]);

  return (
    <div ref={rootRef} className={cn("relative flex items-center gap-1.5", compact ? "flex-wrap" : "justify-end")}>
      <Link href={`/students/${studentId}`}>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 px-2.5">
          <Eye className="h-3.5 w-3.5" />
          {t("common.view")}
        </Button>
      </Link>
      <Link href={`/students/${studentId}/edit`}>
        <Button variant="secondary" size="sm" className="h-9 gap-1.5 px-2.5">
          <Edit className="h-3.5 w-3.5" />
          {t("common.edit")}
        </Button>
      </Link>
      <Button
        ref={menuBtnRef}
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5 px-2.5"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          placeMenu();
          setOpen(true);
        }}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
        {t("common.more")}
      </Button>

      {open && menuPos ? (
        <div
          role="menu"
          style={{ top: menuPos.top, left: menuPos.left }}
          className="fixed z-50 min-w-[11.5rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          <Link
            href={`/id-cards?studentId=${studentId}`}
            role="menuitem"
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            <CreditCard className="h-4 w-4 text-pink-600" />
            {t("students.idCard")}
          </Link>
          {showAutoApply ? (
            <Link
              href={`/auto-apply?ids=${studentId}`}
              role="menuitem"
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              <Play className="h-4 w-4 text-emerald-600" />
              {t("students.autoFill")}
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-amber-800 hover:bg-amber-50"
            onClick={() => {
              setOpen(false);
              onDeactivate();
            }}
          >
            <Ban className="h-4 w-4 text-amber-600" />
            {t("students.deactivate")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-red-700 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
            {t("common.delete")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

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
  draftCount?: number;
  byStandard?: Record<string, { total: number; pendingDivision: number }>;
};

function classLabel(student: StudentRow, t: (k: string, p?: Record<string, string>) => string) {
  if (student.schoolClass?.name) return student.schoolClass.name;
  if (student.standard && student.section) {
    return t("students.classLabel", {
      standard: student.standard,
      section: student.section || "",
    });
  }
  if (student.standard) {
    return t("students.stdPendingDivision", { standard: student.standard });
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
  const router = useRouter();
  const pathname = usePathname();
  const { confirm, ConfirmDialog } = useConfirm();
  const { has } = useSchoolFeatures();
  const canAutoApply = has("scholarship_auto_apply");
  const searchParams = useSearchParams();
  const viewMode = searchParams.get("status") === "draft" ? "draft" : "all";
  const isDraftView = viewMode === "draft";
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
  const [pendingDivisionOnly, setPendingDivisionOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [divisionModalOpen, setDivisionModalOpen] = useState(false);
  const [assigningDivision, setAssigningDivision] = useState(false);
  const [pickClassId, setPickClassId] = useState("");

  useEffect(() => {
    const classId = searchParams.get("classId");
    const cat = searchParams.get("category");
    const std = searchParams.get("standard");
    const g = searchParams.get("gender");
    const st = searchParams.get("status");
    setClassFilter(classId || "");
    setCategoryFilter(cat || "");
    setStandardFilter(std || "");
    setGenderFilter(g || "");
    // Draft tab uses URL ?status=draft — other statuses use the filter dropdown only
    setStatusFilter(st && st !== "draft" ? st : "");
  }, [searchParams]);

  const switchView = useCallback(
    (mode: "all" | "draft") => {
      const params = new URLSearchParams(searchParams.toString());
      if (mode === "draft") {
        params.set("status", "draft");
      } else {
        params.delete("status");
      }
      setPage(1);
      setSelected(new Set());
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .catch(() => setClasses([]));
  }, []);

  /** Tab badge counts — lightweight, once on mount */
  useEffect(() => {
    fetch("/api/students?limit=1&page=1&summary=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.summary) {
          setSummary((prev) => ({ ...prev, ...d.summary }));
        }
      })
      .catch(() => {});
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
    setPendingDivisionOnly(false);
    setPage(1);
    setSelected(new Set());
  };

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (!isDraftView) params.set("summary", "1");
    if (search.trim()) params.set("search", search.trim());
    if (isDraftView) {
      params.set("status", "draft");
    } else if (statusFilter) {
      params.set("status", statusFilter);
    }
    if (categoryFilter) params.set("category", categoryFilter);
    if (classFilter) params.set("classId", classFilter);
    else if (standardFilter) params.set("standard", standardFilter);
    if (genderFilter) params.set("gender", genderFilter);
    if (noClassOnly) params.set("noClass", "1");
    if (pendingDivisionOnly) params.set("pendingDivision", "1");

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
    pendingDivisionOnly,
    isDraftView,
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
    pendingDivisionOnly ? "pendingDivision" : "",
  ].filter(Boolean).length;

  const selectedClass = classes.find((c) => c.id === classFilter);

  const clearFilters = () => {
    setCategoryFilter("");
    setClassFilter("");
    setStandardFilter("");
    setGenderFilter("");
    setNoClassOnly(false);
    setPendingDivisionOnly(false);
    setSearch("");
    setStatusFilter("");
    setPage(1);
    setSelected(new Set());
    if (isDraftView) {
      router.replace(`${pathname}?status=draft`, { scroll: false });
    } else {
      router.replace(pathname, { scroll: false });
    }
  };

  const statusFilterOptions = useMemo(
    () =>
      STUDENT_STATUSES.filter((s) => s.value !== "draft").map((s) => ({
        value: s.value,
        label: t(`status.${s.value}`),
      })),
    [t],
  );

  const standardOptions = [...MANAGE_STANDARDS];

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

  const selectedRows = useMemo(
    () => students.filter((s) => selected.has(s.id)),
    [students, selected],
  );

  const selectedStandards = useMemo(() => {
    const set = new Set(
      selectedRows.map((s) => String(s.standard || "").trim()).filter(Boolean),
    );
    return [...set];
  }, [selectedRows]);

  const divisionClasses = useMemo(() => {
    let list = classes;
    if (selectedStandards.length === 1) {
      list = classes.filter((c) => c.standard === selectedStandards[0]);
      const streams = new Set(
        selectedRows
          .map((s) => String(s.courseType || "").trim())
          .filter((v) => ["Arts", "Commerce", "Science"].includes(v)),
      );
      if (["11", "12"].includes(selectedStandards[0]) && streams.size === 1) {
        const stream = [...streams][0];
        const filtered = list.filter((c) => (c.stream || "") === stream);
        if (filtered.length) list = filtered;
      }
    }
    return [...list].sort((a, b) => {
      const na = Number(a.standard) - Number(b.standard);
      if (na !== 0) return na;
      const streamCmp = `${a.stream || ""}`.localeCompare(`${b.stream || ""}`);
      if (streamCmp !== 0) return streamCmp;
      return a.section.localeCompare(b.section);
    });
  }, [classes, selectedStandards, selectedRows]);

  const divisionGroups = useMemo(() => {
    const map = new Map<string, { label: string; classes: ClassMeta[] }>();
    for (const c of divisionClasses) {
      const key = classGroupKey(c.standard, c.stream);
      if (!map.has(key)) {
        map.set(key, { label: classGroupLabel(c.standard, c.stream), classes: [] });
      }
      map.get(key)!.classes.push(c);
    }
    return [...map.values()];
  }, [divisionClasses]);

  const pickedDivision = divisionClasses.find((c) => c.id === pickClassId) || null;

  const openDivisionModal = () => {
    setPickClassId("");
    setDivisionModalOpen(true);
  };

  const assignDivision = async () => {
    if (!pickedDivision || selected.size === 0) return;
    setAssigningDivision(true);
    try {
      const res = await fetch("/api/students/assign-division", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: Array.from(selected),
          classId: pickedDivision.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || t("students.assignDivisionFailed"));
        return;
      }
      setDivisionModalOpen(false);
      setSelected(new Set());
      setPickClassId("");
      await fetchStudents();
    } catch {
      alert(t("students.assignDivisionFailed"));
    } finally {
      setAssigningDivision(false);
    }
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

  const deleteStudent = async (student: StudentRow) => {
    const name = studentFullNameGu(student) || studentShortNameGu(student) || "—";
    const gr = student.grNumber ? ` · GR ${student.grNumber}` : "";
    await confirm({
      title: t("students.deleteTitle"),
      message: t("students.confirmDeleteDetail", { name, gr }),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      variant: "destructive",
      onConfirm: async () => {
        const res = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            typeof data.error === "string" ? data.error : t("students.deleteFailed"),
          );
        }
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(student.id);
          return next;
        });
        await fetchStudents();
      },
    });
  };

  const deactivateStudent = async (id: string) => {
    await confirm({
      title: t("students.deactivateTitle"),
      message: t("students.confirmDeactivate"),
      confirmLabel: t("students.deactivate"),
      cancelLabel: t("common.cancel"),
      variant: "destructive",
      onConfirm: async () => {
        const res = await fetch(`/api/students/${id}/active`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: false }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            typeof data.error === "string" ? data.error : t("students.deactivateFailed"),
          );
        }
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        await fetchStudents();
      },
    });
  };

  const exportSelected = () => {
    const params = new URLSearchParams();
    if (selected.size > 0) {
      params.set("ids", Array.from(selected).join(","));
    } else {
      if (classFilter) params.set("classId", classFilter);
      else if (standardFilter) params.set("standard", standardFilter);
      if (noClassOnly) params.set("noClass", "1");
      if (pendingDivisionOnly) params.set("pendingDivision", "1");
    }
    const q = params.toString();
    window.open(`/api/students/export${q ? `?${q}` : ""}`, "_blank");
  };

  const columns = useMemo<ColumnDef<StudentRow>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        size: 44,
        header: () => (
          <button type="button" onClick={toggleAll} className="p-0.5" aria-label="Select all">
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
            aria-label="Select student"
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
        id: "student",
        header: t("common.name"),
        accessorFn: (s) => studentFullNameGu(s) || studentShortNameGu(s) || "",
        cell: ({ row }) => {
          const s = row.original;
          const name = studentFullNameGu(s) || studentShortNameGu(s) || "—";
          const father = studentDisplayFatherName(s);
          return (
            <div className="flex min-w-[14rem] max-w-sm items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 text-sm font-bold text-sky-800 ring-1 ring-sky-200/70">
                {studentInitial(name)}
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-snug text-slate-900">{name}</p>
                {father ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t("fields.fatherName")}:{" "}
                    <span className="font-medium text-slate-700">{father}</span>
                  </p>
                ) : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                    GR {s.grNumber || "—"}
                  </span>
                  <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                    Roll {s.rollNumber || "—"}
                  </span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: "class",
        header: t("fields.class"),
        accessorFn: (s) => classLabel(s, t),
        cell: ({ row }) => (
          <div className="space-y-1.5">
            <span className="inline-flex rounded-lg border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
              {classLabel(row.original, t)}
            </span>
            <div>
              <span
                className={cn(
                  "inline-flex h-6 min-w-[1.75rem] items-center justify-center rounded-md border px-1.5 text-[11px] font-bold",
                  genderTone(row.original.gender),
                )}
              >
                {genderShort(normalizeGender(row.original.gender))}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "details",
        header: t("common.details"),
        enableSorting: false,
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="min-w-[11rem] space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="font-medium tabular-nums">{s.mobileNumber || "—"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>{s.dateOfBirth || "—"}</span>
              </div>
              <p className="font-mono text-[11px] tracking-wide text-slate-500">
                {maskAadhaar(s.aadhaarNumber)}
              </p>
              {s.category ? <CategoryBadge category={s.category} /> : null}
            </div>
          );
        },
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
          <StudentRowActions
            studentId={row.original.id}
            showAutoApply={canAutoApply}
            onDeactivate={() => deactivateStudent(row.original.id)}
            onDelete={() => deleteStudent(row.original)}
          />
        ),
      },
    ],
    [selected, students.length, t, canAutoApply],
  );

  return (
    <PageShell
      title={t("students.title")}
      subtitle={
        isDraftView ? t("students.draftAdmissionsSubtitle") : t("students.subtitle")
      }
      breadcrumbs={[
        { label: t("nav.dashboard"), href: userRole === "clerk" ? "/clerk" : "/dashboard" },
        { label: t("nav.students") },
      ]}
      icon={<Users className="h-5 w-5" />}
      actions={
        <div className="grid w-full grid-cols-1 gap-2 min-[350px]:grid-cols-[0.9fr_1.1fr] sm:flex sm:w-auto sm:flex-wrap">
          <Link href="/students/inactive" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full whitespace-nowrap border-amber-200 bg-amber-50 px-3 text-amber-900 hover:bg-amber-100 sm:w-auto sm:px-4"
            >
              <UserX className="h-3.5 w-3.5" />
              {t("students.inactiveStudents")}
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={exportSelected}
            className="w-full whitespace-nowrap px-3 sm:w-auto sm:px-4"
          >
            <Download className="h-3.5 w-3.5" />
            {t("common.export")}
          </Button>
          <Link
            href={
              classFilter
                ? `/students/new?classId=${classFilter}`
                : standardFilter
                  ? `/students/new?standard=${encodeURIComponent(standardFilter)}`
                  : "/students/new"
            }
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
        {/* All Students / Draft tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label={t("nav.students")}
            className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "all"}
              onClick={() => switchView("all")}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                viewMode === "all"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50",
              )}
            >
              {t("nav.studentsAll")}
              {viewMode === "all" && !loading ? (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                  {total.toLocaleString("en-IN")}
                </span>
              ) : summary?.total != null ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    viewMode === "all" ? "bg-white/20" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {summary.total.toLocaleString("en-IN")}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "draft"}
              onClick={() => switchView("draft")}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                viewMode === "draft"
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50",
              )}
            >
              <FilePen className="h-3.5 w-3.5" />
              {t("students.draftAdmissions")}
              {(summary?.draftCount ?? 0) > 0 || (isDraftView && total > 0) ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    viewMode === "draft" ? "bg-white/20" : "bg-violet-100 text-violet-700",
                  )}
                >
                  {(isDraftView ? total : summary?.draftCount ?? 0).toLocaleString("en-IN")}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {isDraftView ? (
          <div className="rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-900">
            {t("students.draftAdmissionsBanner")}
          </div>
        ) : null}
        {!isDraftView ? (
        /* Colorful summary strip */
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100/80 bg-gradient-to-r from-white via-sky-50/40 to-violet-50/30 px-2.5 py-2 shadow-sm">
          {[
            {
              key: "total",
              label: t("students.statTotal"),
              value: summary?.total ?? total,
              active:
                !genderFilter &&
                !noClassOnly &&
                !pendingDivisionOnly &&
                !classFilter &&
                !standardFilter &&
                !statusFilter &&
                viewMode === "all",
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
                setPendingDivisionOnly(false);
                setPage(1);
              },
              idle: "border-amber-100 bg-amber-50/80 text-amber-950 hover:bg-amber-100",
              activeCls: "border-transparent bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-200/60",
              labelIdle: "text-amber-700",
              labelActive: "text-amber-100",
            },
            ...(!isDraftView && (summary?.draftCount ?? 0) > 0
              ? [
                  {
                    key: "drafts",
                    label: t("students.statDrafts"),
                    value: summary?.draftCount ?? 0,
                    active: false,
                    onClick: () => switchView("draft"),
                    idle: "border-violet-100 bg-violet-50/80 text-violet-950 hover:bg-violet-100",
                    activeCls:
                      "border-transparent bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-200/60",
                    labelIdle: "text-violet-600",
                    labelActive: "text-violet-100",
                  },
                ]
              : []),
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
        ) : null}

        {!isDraftView ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MANAGE_STANDARDS.map((std) => {
              const meta = summary?.byStandard?.[std];
              const count = meta?.total ?? 0;
              const pending = meta?.pendingDivision ?? 0;
              const active = standardFilter === std && !noClassOnly;
              return (
                <button
                  key={std}
                  type="button"
                  onClick={() => {
                    setStandardFilter(std);
                    setClassFilter("");
                    setNoClassOnly(false);
                    setPendingDivisionOnly(false);
                    setPage(1);
                    setSelected(new Set());
                  }}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-left transition",
                    active
                      ? "border-teal-500 bg-teal-50"
                      : "border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/40",
                  )}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-teal-800">
                    {t("students.stdShort", { standard: std })}
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                    {count.toLocaleString("en-IN")}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    {t("students.stdBoardStudents", { count: String(count) })}
                  </p>
                  {pending > 0 ? (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setStandardFilter(std);
                        setClassFilter("");
                        setNoClassOnly(false);
                        setPendingDivisionOnly(true);
                        setPage(1);
                        setSelected(new Set());
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          setStandardFilter(std);
                          setClassFilter("");
                          setNoClassOnly(false);
                          setPendingDivisionOnly(true);
                          setPage(1);
                        }
                      }}
                      className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800"
                    >
                      {t("students.stdBoardPending", { count: String(pending) })}
                    </span>
                  ) : (
                    <span className="mt-2 inline-block text-[10px] font-semibold text-slate-400">
                      {t("students.allInStandard")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : null}

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
                    setPendingDivisionOnly(false);
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
                      setPendingDivisionOnly(false);
                      setPage(1);
                    }}
                    className={cn(
                      "min-h-9 cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold transition min-[380px]:px-3 min-[380px]:text-xs",
                      standardFilter === std && !pendingDivisionOnly
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-200"
                        : "bg-slate-50 text-slate-600 hover:bg-sky-50 hover:text-sky-700 border border-slate-200 hover:border-sky-200",
                    )}
                  >
                    {t("students.stdShort", { standard: std })}
                  </button>
                ))}
                {standardFilter ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPendingDivisionOnly((v) => !v);
                      setClassFilter("");
                      setNoClassOnly(false);
                      setPage(1);
                    }}
                    className={cn(
                      "min-h-9 cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold transition min-[380px]:px-3 min-[380px]:text-xs",
                      pendingDivisionOnly
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-100",
                    )}
                  >
                    {t("students.pendingDivision")}
                  </button>
                ) : null}
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
                options={statusFilterOptions}
                value={statusFilter}
                disabled={isDraftView}
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
                                <div className="flex min-w-0 items-start gap-2.5">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 text-sm font-bold text-sky-800 ring-1 ring-sky-200/70">
                                    {studentInitial(name)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="break-words text-sm font-semibold leading-snug text-slate-900">
                                          {name}
                                        </p>
                                        {father ? (
                                          <p className="mt-0.5 text-xs text-slate-500">
                                            {t("fields.fatherName")}: {father}
                                          </p>
                                        ) : null}
                                      </div>
                                      <Badge status={student.status} />
                                    </div>

                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      <span className="inline-flex rounded-lg border border-sky-100 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                                        {classLabel(student, t)}
                                      </span>
                                      <span
                                        className={cn(
                                          "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-bold",
                                          genderTone(student.gender),
                                        )}
                                      >
                                        {genderShort(normalizeGender(student.gender))}
                                      </span>
                                      {student.category ? (
                                        <CategoryBadge category={student.category} />
                                      ) : null}
                                    </div>

                                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2 text-[11px] text-slate-600">
                                      <span className="font-mono font-semibold text-slate-700">
                                        GR {student.grNumber || "—"}
                                      </span>
                                      <span>Roll {student.rollNumber || "—"}</span>
                                      <span className="truncate tabular-nums">
                                        {student.mobileNumber || "—"}
                                      </span>
                                      <span>DOB {student.dateOfBirth || "—"}</span>
                                      <span className="col-span-2 font-mono tracking-wide text-slate-500">
                                        {maskAadhaar(student.aadhaarNumber)}
                                      </span>
                                    </div>

                                    <div className="mt-2.5">
                                      <StudentRowActions
                                        studentId={student.id}
                                        compact
                                        showAutoApply={canAutoApply}
                                        onDeactivate={() => deactivateStudent(student.id)}
                                        onDelete={() => deleteStudent(student)}
                                      />
                                    </div>
                                  </div>
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
            {isDraftView ? (
              <Link href={`/bulk-submit?ids=${Array.from(selected).join(",")}`} className="w-full">
                <Button className="h-10 w-full text-xs">
                  {t("students.bulkSubmitSelected")}
                </Button>
              </Link>
            ) : (
              <Button className="h-10 w-full text-xs" type="button" onClick={openDivisionModal}>
                <Layers className="h-3.5 w-3.5" />
                {t("students.assignDivision")}
              </Button>
            )}
            {isDraftView ? (
              <Button
                variant="outline"
                className="h-10 w-full text-xs"
                type="button"
                onClick={openDivisionModal}
              >
                <Layers className="h-3.5 w-3.5" />
                {t("students.assignDivision")}
              </Button>
            ) : null}
            {selected.size > 1 && userRole === "school_admin" && canAutoApply && (
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

      <InfoModal
        isOpen={divisionModalOpen}
        onClose={() => {
          if (assigningDivision) return;
          setDivisionModalOpen(false);
        }}
        title={t("students.assignDivisionTitle")}
      >
        <p className="mb-3 text-sm text-slate-600">{t("students.assignDivisionDesc")}</p>
        <p className="mb-3 text-xs font-semibold text-slate-500">
          {t("students.selected", { count: selected.size })}
          {selectedStandards.length === 1
            ? ` · ${t("students.assignDivisionStdHint", { standard: selectedStandards[0] })}`
            : ""}
        </p>
        {divisionClasses.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <p>{t("students.assignDivisionEmpty")}</p>
            <Link
              href="/classes"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"
            >
              <School className="h-4 w-4" />
              {t("students.assignDivisionOpenClasses")}
            </Link>
          </div>
        ) : (
          <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
            {divisionGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {group.classes.map((c) => {
                    const active = pickClassId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setPickClassId(c.id)}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-left transition",
                          active
                            ? "border-emerald-600 bg-emerald-50 shadow-sm ring-2 ring-emerald-600/20"
                            : "border-slate-200 bg-white hover:border-emerald-400",
                        )}
                      >
                        <span className="block text-base font-bold text-slate-900">
                          {c.section}
                        </span>
                        <span className="mt-0.5 block text-xs font-medium text-slate-600">
                          {c.name}
                        </span>
                        {typeof c._count?.students === "number" ? (
                          <span className="mt-1 block text-[11px] text-slate-400">
                            {t("classes.studentsCount", { count: c._count.students })}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            type="button"
            disabled={assigningDivision}
            onClick={() => setDivisionModalOpen(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!pickClassId || assigningDivision || divisionClasses.length === 0}
            onClick={() => void assignDivision()}
          >
            <Layers className="h-4 w-4" />
            {assigningDivision
              ? t("common.saving")
              : t("students.assignDivision")}
          </Button>
        </div>
      </InfoModal>
      <ConfirmDialog />
    </PageShell>
  );
}
