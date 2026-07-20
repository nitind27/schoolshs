"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  CheckCircle,
  UserPlus,
  Search,
  X,
  RefreshCw,
  Clock,
  Users,
  Ban,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TablePagination } from "@/components/ui/table-pagination";
import { AdmissionVerifyDialog } from "@/components/admissions/admission-verify-dialog";
import { AdmissionStudentCard } from "@/components/admissions/admission-student-card";
import { useT } from "@/i18n/locale-provider";
import { PAGE_SIZE } from "@/lib/pagination";
import { classLabel } from "@/lib/admissions";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/hooks/use-confirm";
import "@/components/admissions/admissions.css";

type AdmissionStudent = Parameters<typeof AdmissionStudentCard>[0]["student"];
type ClassInfo = { id: string; name: string; standard: string; section: string; stream?: string | null };
type ClassBreakdown = { standard: string; section: string; admissionStatus: string; count: number };

type DialogState = {
  id: string;
  name: string;
  action: "verified" | "rejected" | "pending";
} | null;

export default function AdmissionsPage() {
  const t = useT();
  const { confirm, ConfirmDialog } = useConfirm();

  const [students, setStudents] = useState<AdmissionStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<{ admissionStatus: string; _count: number }[]>([]);
  const [classBreakdown, setClassBreakdown] = useState<ClassBreakdown[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState("pending");
  const [classFilter, setClassFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<DialogState>(null);

  const statusLabel = (s: string) => {
    const key = t(`admissionStatus.${s}`);
    return key === `admissionStatus.${s}` ? s : key;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (classFilter) params.set("classId", classFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admissions?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setStudents(data.students || []);
      setTotal(data.total ?? 0);
      setStats(data.stats || []);
      setClassBreakdown(data.classBreakdown || []);
      setClasses(data.classes || []);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [status, page, classFilter, categoryFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = stats.find((s) => s.admissionStatus === "pending")?._count || 0;
  const verified = stats.find((s) => s.admissionStatus === "verified")?._count || 0;
  const rejected = stats.find((s) => s.admissionStatus === "rejected")?._count || 0;
  const totalAll = stats.reduce((s, x) => s + x._count, 0);

  const pendingByClassId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of classBreakdown) {
      if (row.admissionStatus !== "pending") continue;
      const cls = classes.find((x) => x.standard === row.standard && x.section === row.section);
      if (cls?.id) map.set(cls.id, (map.get(cls.id) || 0) + row.count);
    }
    return map;
  }, [classBreakdown, classes]);

  const classSelectOptions = useMemo(() => {
    const sorted = [...classes].sort(
      (a, b) => Number(a.standard) - Number(b.standard) || a.section.localeCompare(b.section),
    );
    return sorted.map((c) => {
      const name = c.name || classLabel(c.standard, c.section);
      const pendingCount = pendingByClassId.get(c.id) || 0;
      const label =
        status === "pending" && pendingCount > 0
          ? `${name} — ${pendingCount} ${t("admissions.pendingShort")}`
          : name;
      return { value: c.id, label };
    });
  }, [classes, pendingByClassId, status, t]);

  const patchStatus = async (studentIds: string[], admissionStatus: string, notes?: string) => {
    const res = await fetch("/api/admissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds, admissionStatus, notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Update failed");
    await load();
  };

  const bulkVerify = async () => {
    if (!selected.size) return;
    const ok = await confirm({
      title: t("admissions.bulkVerifyTitle"),
      message: t("admissions.bulkVerifyMsg", { count: selected.size }),
      confirmLabel: t("admissions.verify"),
      variant: "default",
    });
    if (!ok) return;
    await patchStatus([...selected], "verified");
  };

  const hasFilters = !!(classFilter || categoryFilter || search);
  const activeClassLabel = classFilter
    ? classes.find((c) => c.id === classFilter)?.name ||
      classLabel(
        classes.find((c) => c.id === classFilter)?.standard,
        classes.find((c) => c.id === classFilter)?.section,
      )
    : null;

  const clearFilters = () => {
    setClassFilter("");
    setCategoryFilter("");
    setSearch("");
    setSearchInput("");
    setPage(1);
  };

  const statCards = [
    { key: "pending", label: t("admissions.pending"), value: pending, icon: Clock },
    { key: "verified", label: t("admissions.verified"), value: verified, icon: CheckCircle },
    { key: "rejected", label: t("admissions.rejected"), value: rejected, icon: Ban },
    { key: "total", label: t("admissions.total"), value: totalAll, icon: Users },
  ] as const;

  return (
    <div className="admissions-page space-y-5 pb-8">
      {/* Hero */}
      <div className="adm-hero">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-100">
                {t("admissions.title")}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">{t("admissions.heroTitle")}</h1>
            <p className="text-blue-100 text-sm mt-1 max-w-xl">{t("admissions.subtitle")}</p>
          </div>
          <Link href="/students/new">
            <Button className="relative z-10 gap-2 bg-white text-blue-700 hover:bg-blue-50 shadow-lg border-0 font-bold">
              <UserPlus className="h-4 w-4" />
              {t("admissions.addStudent")}
            </Button>
          </Link>
        </div>

        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {statCards.map(({ key, label, value, icon: Icon }) => (
            <button
              key={key}
              type="button"
              disabled={key === "total"}
              onClick={() => {
                if (key !== "total") {
                  setStatus(key);
                  setPage(1);
                }
              }}
              className={cn("adm-stat-pill text-left", status === key && key !== "total" && "active")}
            >
              <div className="flex items-center justify-between">
                <Icon className={cn("h-4 w-4", status === key && key !== "total" ? "text-blue-600" : "text-blue-200")} />
                <span className={cn("text-2xl font-black", status === key && key !== "total" ? "text-blue-700" : "")}>
                  {value}
                </span>
              </div>
              <p className={cn("text-xs font-semibold mt-1", status === key && key !== "total" ? "text-blue-600" : "text-blue-100")}>
                {label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Control panel — dropdowns (no scroll) */}
      <div className="adm-panel p-3 md:p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(9rem,12rem)_minmax(9rem,11rem)_1fr_auto] gap-3 items-end">
          <Select
            label={t("admissions.class")}
            value={classFilter}
            onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
            options={classSelectOptions}
            emptyLabel={t("admissions.allClasses")}
            className="text-sm"
          />
          <Select
            label={t("admissions.category")}
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            options={[...CATEGORIES]}
            emptyLabel={t("admissions.allCategories")}
            className="text-sm"
          />
          <div className="adm-search sm:col-span-2 lg:col-span-1">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearch(searchInput.trim());
                  setPage(1);
                }
              }}
              placeholder={t("admissions.searchPlaceholder")}
              className="flex-1 h-10 bg-transparent text-sm outline-none placeholder:text-slate-400 min-w-0"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Button
              size="sm"
              className="h-8 rounded-lg shrink-0"
              onClick={() => { setSearch(searchInput.trim()); setPage(1); }}
            >
              {t("common.search")}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            className="h-10 w-full sm:w-10 p-0 rounded-xl shrink-0"
          >
            <RefreshCw className={cn("h-4 w-4 mx-auto", loading && "animate-spin")} />
          </Button>
        </div>

        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500">{t("admissions.activeFilters")}:</span>
            {activeClassLabel && (
              <button
                type="button"
                onClick={() => { setClassFilter(""); setPage(1); }}
                className="adm-filter-tag"
              >
                {t("admissions.class")}: {activeClassLabel}
                <X className="h-3 w-3" />
              </button>
            )}
            {categoryFilter && (
              <button
                type="button"
                onClick={() => { setCategoryFilter(""); setPage(1); }}
                className="adm-filter-tag"
              >
                {t("admissions.category")}: {categoryFilter}
                <X className="h-3 w-3" />
              </button>
            )}
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
                className="adm-filter-tag"
              >
                {t("common.search")}: {search}
                <X className="h-3 w-3" />
              </button>
            )}
            <button type="button" onClick={clearFilters} className="text-xs font-bold text-blue-600 hover:underline ml-1">
              {t("admissions.clearFilters")}
            </button>
          </div>
        )}
      </div>

      {/* List header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {statusLabel(status)}
            <span className="text-slate-400 font-normal ml-2">({total})</span>
          </h2>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {/* Student cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">{t("common.loading")}</p>
        </div>
      ) : students.length === 0 ? (
        <div className="adm-panel adm-empty">
          <div className="adm-empty-icon">
            <Inbox className="h-8 w-8" />
          </div>
          <p className="font-bold text-slate-800">{t("admissions.noApplications", { status: statusLabel(status) })}</p>
          <p className="text-sm text-slate-500 mt-1">{t("admissions.emptyHint")}</p>
          <Link href="/students/new" className="inline-block mt-4">
            <Button className="gap-2 rounded-xl">
              <UserPlus className="h-4 w-4" />
              {t("admissions.addStudent")}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((s) => (
            <AdmissionStudentCard
              key={s.id}
              student={s}
              statusTab={status}
              selected={selected.has(s.id)}
              onToggleSelect={status === "pending" ? () => {
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(s.id)) next.delete(s.id);
                  else next.add(s.id);
                  return next;
                });
              } : undefined}
              onAction={(action) =>
                setDialog({ id: s.id, name: `${s.firstName} ${s.surname}`, action })
              }
              t={t}
            />
          ))}
          <div className="adm-panel px-2">
            <TablePagination page={page} total={total} onPageChange={setPage} />
          </div>
        </div>
      )}

      {/* Sticky bulk bar */}
      {status === "pending" && selected.size > 0 && (
        <div className="adm-bulk-bar">
          <span className="text-sm font-bold">{t("admissions.selected", { count: selected.size })}</span>
          <Button
            size="sm"
            onClick={() => void bulkVerify()}
            className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold gap-1.5 rounded-lg"
          >
            <CheckCircle className="h-4 w-4" />
            {t("admissions.bulkVerify")}
          </Button>
        </div>
      )}

      <AdmissionVerifyDialog
        open={!!dialog}
        studentName={dialog?.name || ""}
        action={dialog?.action || "verified"}
        onClose={() => setDialog(null)}
        onConfirm={async (notes) => {
          if (!dialog) return;
          await patchStatus([dialog.id], dialog.action, notes);
        }}
      />
      <ConfirmDialog />
    </div>
  );
}
