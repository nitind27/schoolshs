"use client";

import { PageLoader } from "@/components/ui/loader";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { canManageClasses } from "@/lib/roles";
import {
  CLASS_TEACHER_STAFF_QUERY,
  buildTeacherClassMap,
  formatClassTeacherOptionLabel,
  getTeacherBusyClass,
  pickClassTeacherOptions,
  sortClassTeacherOptionsForClass,
} from "@/lib/class-teacher-staff";
import {
  ArrowLeft,
  CheckCircle2,
  School,
  Search,
  UserCheck,
  UserCog,
  UserX,
  Users,
} from "lucide-react";
import type { Staff } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";
import { classGroupKey, classGroupLabel } from "@/lib/class-structure";

type ClassRow = {
  id: string;
  name: string;
  standard: string;
  section: string;
  stream?: string | null;
  classTeacherId?: string | null;
  classTeacher?: {
    id: string;
    firstName: string;
    lastName: string;
    designation?: string | null;
  } | null;
  _count?: { students: number };
};

export default function ClassTeachersPage() {
  const t = useT();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<Staff[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [homeHref, setHomeHref] = useState("/dashboard");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [standard, setStandard] = useState("");
  const [search, setSearch] = useState("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clsRes, staffRes] = await Promise.all([
        fetch("/api/classes"),
        fetch(`/api/staff?${CLASS_TEACHER_STAFF_QUERY}`),
      ]);
      const clsData = await clsRes.json();
      const staffData = await staffRes.json();
      setClasses(clsData.classes || []);
      setTeachers(pickClassTeacherOptions((staffData.staff || []) as Staff[]));
    } catch {
      setError(t("classes.classTeacherLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const role = d.user?.role as string | undefined;
        setCanManage(!!role && canManageClasses(role));
        setHomeHref(role === "clerk" ? "/clerk" : "/dashboard");
      });
    load();
  }, [load]);

  const assignTeacher = async (classId: string, teacherId: string) => {
    setSavingId(classId);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classTeacherId: teacherId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("classes.classTeacherSaveFailed"));
        return;
      }
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId
            ? {
                ...c,
                classTeacherId: data.classTeacherId,
                classTeacher: data.classTeacher,
              }
            : c,
        ),
      );
      setSavedId(classId);
      setTimeout(() => setSavedId((id) => (id === classId ? null : id)), 1600);
    } catch {
      setError(t("classes.classTeacherSaveFailed"));
    } finally {
      setSavingId(null);
    }
  };

  const stats = useMemo(() => {
    const withTeacher = classes.filter((c) => c.classTeacherId || c.classTeacher?.id).length;
    return {
      total: classes.length,
      withTeacher,
      withoutTeacher: classes.length - withTeacher,
    };
  }, [classes]);

  const teacherAssignments = useMemo(() => buildTeacherClassMap(classes), [classes]);

  const standardOptions = useMemo(
    () =>
      [...new Set(classes.map((c) => c.standard).filter(Boolean))].sort(
        (a, b) => Number(a) - Number(b),
      ),
    [classes],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return classes.filter((c) => {
      if (standard && c.standard !== standard) return false;
      const assigned = Boolean(c.classTeacherId || c.classTeacher?.id);
      if (onlyUnassigned && assigned) return false;
      if (!q) return true;
      const teacherName = `${c.classTeacher?.firstName || ""} ${c.classTeacher?.lastName || ""}`
        .trim()
        .toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.section.toLowerCase().includes(q) ||
        teacherName.includes(q)
      );
    });
  }, [classes, search, standard, onlyUnassigned]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; classes: ClassRow[] }>();
    for (const c of filtered) {
      const key = classGroupKey(c.standard, c.stream);
      if (!map.has(key)) {
        map.set(key, { label: classGroupLabel(c.standard, c.stream), classes: [] });
      }
      map.get(key)!.classes.push(c);
    }
    for (const g of map.values()) {
      g.classes.sort((a, b) => a.section.localeCompare(b.section));
    }
    return [...map.entries()].sort(([a], [b]) => {
      const [sa] = a.split("-");
      const [sb] = b.split("-");
      return Number(sa) - Number(sb);
    });
  }, [filtered]);

  if (!canManage && !loading) {
    return (
      <PageShell title={t("classes.classTeachersTitle")} breadcrumbs={[{ label: t("nav.dashboard"), href: homeHref }]}>
        <p className="py-16 text-center text-slate-500">{t("common.error")}</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={t("classes.classTeachersTitle")}
      subtitle={t("classes.classTeachersSubtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: homeHref },
        { label: t("nav.classes"), href: "/classes" },
        { label: t("classes.classTeachersTitle") },
      ]}
      actions={
        <Link href="/classes" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4" /> {t("classes.backToClasses")}
          </Button>
        </Link>
      }
    >
      <section className="ct-guide mb-5">
        <div className="ct-guide-step">
          <span>1</span>
          <div>
            <strong>{t("classes.ctStep1Title")}</strong>
            <p>{t("classes.ctStep1Desc")}</p>
          </div>
        </div>
        <div className="ct-guide-step">
          <span>2</span>
          <div>
            <strong>{t("classes.ctStep2Title")}</strong>
            <p>{t("classes.ctStep2Desc")}</p>
          </div>
        </div>
        <div className="ct-guide-step">
          <span>3</span>
          <div>
            <strong>{t("classes.ctStep3Title")}</strong>
            <p>{t("classes.ctStep3Desc")}</p>
          </div>
        </div>
      </section>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: t("classes.totalClasses"), value: stats.total, icon: School, tone: "blue" },
          { label: t("classes.withTeacher"), value: stats.withTeacher, icon: UserCheck, tone: "emerald" },
          { label: t("classes.withoutTeacher"), value: stats.withoutTeacher, icon: UserX, tone: "amber" },
        ].map((s) => (
          <Card key={s.label} className="border-slate-200/80">
            <CardContent className="flex min-w-0 items-center gap-3 p-3.5">
              <div className={`ct-stat-ico is-${s.tone}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-none text-slate-900">{s.value}</p>
                <p className="mt-1 break-words text-xs text-slate-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Card className="mb-5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="relative w-full min-w-0 flex-1 space-y-1.5 sm:min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700">{t("common.search")}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("classes.classTeacherSearch")}
                className="flex h-10 w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          <Select
            label={t("classes.standardFilter")}
            options={standardOptions}
            value={standard}
            onChange={(e) => setStandard(e.target.value)}
            emptyLabel={t("common.all")}
            className="w-full sm:w-40"
          />
          <button
            type="button"
            className={`ct-filter-chip w-full justify-center sm:w-auto ${onlyUnassigned ? "is-active" : ""}`}
            onClick={() => setOnlyUnassigned((v) => !v)}
          >
            <UserX className="h-3.5 w-3.5" />
            {t("classes.onlyUnassigned")}
          </button>
        </CardContent>
      </Card>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-slate-500">
            <UserCog className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>{t("classes.noClassesHint")}</p>
            <Link href="/classes" className="mt-4 inline-block">
              <Button variant="outline">{t("classes.backToClasses")}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([key, group]) => (
            <section key={key} className="ct-group">
              <h2 className="mb-3 flex flex-wrap items-center gap-2 text-base font-semibold text-slate-800">
                <span className="flex h-8 min-w-[2rem] items-center justify-center rounded-lg bg-teal-100 px-2 text-sm font-bold text-teal-800">
                  {group.label.replace("Std ", "")}
                </span>
                {group.label}
                <span className="text-xs font-normal text-slate-500">
                  ({group.classes.length})
                </span>
              </h2>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="ct-table-head hidden md:grid">
                  <span>{t("classes.classColumn")}</span>
                  <span>{t("classes.students")}</span>
                  <span>{t("classes.classTeacher")}</span>
                  <span>{t("common.status")}</span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {group.classes.map((c) => {
                    const teacherId = c.classTeacher?.id || c.classTeacherId || "";
                    const assigned = Boolean(teacherId);
                    const teacherOptions = sortClassTeacherOptionsForClass(
                      teachers,
                      c.id,
                      teacherAssignments,
                    );
                    return (
                      <li key={c.id} className="ct-row">
                        <div className="ct-class">
                          <strong>{c.name}</strong>
                          <small>
                            Div {c.section}
                            {c.stream ? ` · ${c.stream}` : ""}
                          </small>
                        </div>
                        <div className="ct-students">
                          <Users className="h-3.5 w-3.5" />
                          {t("classes.studentsCount", { count: c._count?.students ?? 0 })}
                        </div>
                        <div className="ct-select">
                          <label className="md:hidden text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            {t("classes.classTeacher")}
                          </label>
                          <select
                            value={teacherId}
                            disabled={savingId === c.id}
                            onChange={(e) => assignTeacher(c.id, e.target.value)}
                            className="ct-teacher-select"
                          >
                            <option value="">{t("classes.noClassTeacher")}</option>
                            {teacherOptions.map((s) => {
                              const busy = getTeacherBusyClass(
                                s.id,
                                c.id,
                                teacherAssignments,
                              );
                              return (
                                <option
                                  key={s.id}
                                  value={s.id}
                                  disabled={Boolean(busy)}
                                >
                                  {formatClassTeacherOptionLabel({
                                    firstName: s.firstName,
                                    lastName: s.lastName,
                                    designation: s.designation,
                                    busyClassName: busy?.className,
                                  })}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div className="ct-status">
                          {savedId === c.id ? (
                            <span className="ct-badge is-saved">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t("classes.teacherSaved")}
                            </span>
                          ) : assigned ? (
                            <span className="ct-badge is-ok">
                              <UserCheck className="h-3.5 w-3.5" />
                              {t("classes.teacherAssigned")}
                            </span>
                          ) : (
                            <span className="ct-badge is-warn">
                              <UserX className="h-3.5 w-3.5" />
                              {t("classes.teacherPending")}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}

      <style jsx global>{`
        .ct-guide {
          display: grid;
          gap: 0.65rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 900px) {
          .ct-guide {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        .ct-guide-step {
          display: flex;
          min-width: 0;
          gap: 0.7rem;
          align-items: flex-start;
          padding: 0.85rem 0.95rem;
          border-radius: 1rem;
          border: 1px solid #ccfbf1;
          background: linear-gradient(160deg, #f0fdfa, #fff);
        }
        .ct-guide-step > span {
          width: 1.7rem;
          height: 1.7rem;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #0f766e;
          color: #fff;
          font-size: 0.78rem;
          font-weight: 800;
          flex-shrink: 0;
        }
        .ct-guide-step strong {
          display: block;
          font-size: 0.84rem;
          color: #0f172a;
          overflow-wrap: anywhere;
        }
        .ct-guide-step p {
          margin: 0.15rem 0 0;
          font-size: 0.72rem;
          color: #64748b;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }
        .ct-stat-ico {
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 0.75rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ct-stat-ico.is-blue { background: #eff6ff; color: #2563eb; }
        .ct-stat-ico.is-emerald { background: #ecfdf5; color: #059669; }
        .ct-stat-ico.is-amber { background: #fffbeb; color: #d97706; }
        .ct-filter-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          height: 2.5rem;
          padding: 0 0.85rem;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 0.78rem;
          font-weight: 700;
          color: #475569;
        }
        .ct-filter-chip.is-active {
          border-color: transparent;
          background: #0f766e;
          color: #fff;
        }
        .ct-table-head {
          grid-template-columns: 1.4fr 0.8fr 1.6fr 0.9fr;
          gap: 0.75rem;
          padding: 0.65rem 1rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #64748b;
        }
        .ct-row {
          display: grid;
          min-width: 0;
          grid-template-columns: 1fr;
          gap: 0.65rem;
          padding: 0.9rem 1rem;
        }
        @media (min-width: 768px) {
          .ct-row {
            grid-template-columns: 1.4fr 0.8fr 1.6fr 0.9fr;
            align-items: center;
          }
        }
        .ct-class strong {
          display: block;
          font-size: 0.9rem;
          color: #0f172a;
          overflow-wrap: anywhere;
        }
        .ct-class small {
          color: #64748b;
          font-size: 0.72rem;
        }
        .ct-students {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          font-weight: 650;
          color: #334155;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .ct-teacher-select {
          min-width: 0;
          width: 100%;
          height: 2.4rem;
          border-radius: 0.7rem;
          border: 1px solid #cbd5e1;
          background: #fff;
          padding: 0 0.65rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #0f172a;
        }
        .ct-teacher-select:focus {
          outline: none;
          border-color: #14b8a6;
          box-shadow: 0 0 0 3px rgb(20 184 166 / 0.15);
        }
        .ct-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          border-radius: 999px;
          padding: 0.28rem 0.6rem;
          font-size: 0.68rem;
          font-weight: 750;
          max-width: 100%;
          white-space: normal;
          overflow-wrap: anywhere;
        }
        .ct-badge.is-ok { background: #ecfdf5; color: #047857; }
        .ct-badge.is-warn { background: #fffbeb; color: #b45309; }
        .ct-badge.is-saved { background: #eff6ff; color: #1d4ed8; }
        @media (max-width: 767px) {
          .ct-row {
            padding: 1rem;
          }
          .ct-select {
            min-width: 0;
          }
          .ct-status {
            display: flex;
          }
        }
        @media (max-width: 399px) {
          .ct-guide-step {
            padding: 0.75rem;
          }
          .ct-row {
            padding: 0.85rem;
          }
        }
      `}</style>
    </PageShell>
  );
}
