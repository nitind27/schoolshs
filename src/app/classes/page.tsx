"use client";

import { Spinner, PageLoader } from "@/components/ui/loader";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { InfoModal } from "@/components/ui/info-modal";
import { ClassForm } from "@/components/forms/class-form";
import { classGroupKey, classGroupLabel } from "@/lib/class-structure";
import { canManageClasses } from "@/lib/roles";
import {
  CLASS_TEACHER_STAFF_QUERY,
  buildTeacherClassMap,
  formatClassTeacherOptionLabel,
  getTeacherBusyClass,
  pickClassTeacherOptions,
  sortClassTeacherOptionsForClass,
  type TeacherClassAssignment,
} from "@/lib/class-teacher-staff";
import {
  Plus,
  Users,
  BookOpen,
  ChevronRight,
  UserCog,
  Pencil,
  Trash2,
  Search,
  School,
  UserCheck,
  UserX,
  Hash,
} from "lucide-react";
import type { SchoolClass, Staff } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";
import { useConfirm } from "@/hooks/use-confirm";

type ClassWithMeta = SchoolClass & {
  classTeacher?: { id: string; firstName: string; lastName: string } | null;
  _count?: { students: number };
};

function ClassCard({
  c,
  teachers,
  teacherAssignments,
  canManage,
  onTeacherChange,
  onDelete,
}: {
  c: ClassWithMeta;
  teachers: Staff[];
  teacherAssignments: Map<string, TeacherClassAssignment>;
  canManage: boolean;
  onTeacherChange: (classId: string, teacherId: string) => void;
  onDelete: (c: ClassWithMeta) => void;
}) {
  const t = useT();
  const studentCount = c._count?.students ?? 0;
  const teacherOptions = sortClassTeacherOptionsForClass(
    teachers,
    c.id,
    teacherAssignments,
  );

  return (
    <Card className="group relative h-full overflow-hidden border-slate-200/80 hover:border-blue-300 hover:shadow-lg transition-all duration-200">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500 opacity-80" />
      <CardContent className="p-4 pt-5 flex flex-col h-full">
        <Link href={`/classes/${c.id}`} className="block flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="line-clamp-2 break-words text-base font-bold text-slate-900 transition-colors group-hover:text-blue-700">
                {c.name}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Div {c.section}
                {c.stream ? ` · ${c.stream}` : ""}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 shrink-0 mt-0.5 transition-colors" />
          </div>
        </Link>

        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            <Users className="h-3.5 w-3.5" />
            {t("classes.studentsCount", { count: studentCount })}
          </span>
        </div>

        {canManage ? (
          <div
            className="mt-3 pt-3 border-t border-slate-100 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <UserCog className="h-3 w-3" /> {t("classes.classTeacher")}
              </label>
              <select
                value={c.classTeacher?.id || c.classTeacherId || ""}
                onChange={(e) => onTeacherChange(c.id, e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 text-xs font-medium px-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="">{t("classes.noClassTeacher")}</option>
                {teacherOptions.map((s) => {
                  const busy = getTeacherBusyClass(
                    s.id,
                    c.id,
                    teacherAssignments,
                  );
                  return (
                    <option key={s.id} value={s.id} disabled={Boolean(busy)}>
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
            <div className="flex gap-2">
              <Link href={`/classes/${c.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  {t("classes.viewClass")}
                </Button>
              </Link>
              <Link href={`/classes/${c.id}/edit`}>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  title={t("classes.editClass")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                title={t("classes.deleteClass")}
                onClick={() => onDelete(c)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-3 break-words border-t border-slate-100 pt-3 text-xs text-slate-500">
            {c.classTeacher
              ? `${c.classTeacher.firstName} ${c.classTeacher.lastName}`
              : t("classes.noClassTeacher")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClassesPage() {
  const t = useT();
  const { confirm, ConfirmDialog } = useConfirm();
  const [classes, setClasses] = useState<ClassWithMeta[]>([]);
  const [teachers, setTeachers] = useState<Staff[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [homeHref, setHomeHref] = useState("/dashboard");
  const [loading, setLoading] = useState(true);
  const [standard, setStandard] = useState("");
  const [search, setSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (standard) params.set("standard", standard);
    const res = await fetch(`/api/classes?${params}`);
    const data = await res.json();
    setClasses(data.classes || []);
    setLoading(false);
  }, [standard]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const role = d.user?.role as string | undefined;
        setCanManage(!!role && canManageClasses(role));
        setHomeHref(role === "clerk" ? "/clerk" : "/dashboard");
      });
    fetch(`/api/staff?${CLASS_TEACHER_STAFF_QUERY}`)
      .then((r) => r.json())
      .then((d) =>
        setTeachers(pickClassTeacherOptions((d.staff || []) as Staff[])),
      );
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const assignTeacher = async (classId: string, teacherId: string) => {
    const res = await fetch(`/api/classes/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classTeacherId: teacherId || null }),
    });
    if (res.ok) fetchClasses();
    else {
      const d = await res.json();
      alert(d.error || "Failed");
    }
  };

  const handleCreate = async (data: Partial<SchoolClass>) => {
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      alert(result.error || t("classes.saveClassFailed"));
      return;
    }
    setShowNewModal(false);
    await fetchClasses();
  };

  const handleDelete = async (c: ClassWithMeta) => {
    const studentCount = c._count?.students ?? 0;
    if (studentCount > 0) {
      alert(t("classes.deleteBlockedStudents"));
      return;
    }
    const ok = await confirm({
      title: t("classes.deleteClass"),
      message: t("classes.deleteClassConfirm", { name: c.name }),
      confirmLabel: t("classes.deleteClass"),
      variant: "destructive",
    });
    if (!ok) return;
    const res = await fetch(`/api/classes/${c.id}`, { method: "DELETE" });
    if (res.ok) fetchClasses();
    else {
      const d = await res.json();
      alert(d.error || t("classes.deleteClassFailed"));
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.section.toLowerCase().includes(q) ||
        (c.stream || "").toLowerCase().includes(q) ||
        `${c.classTeacher?.firstName || ""} ${c.classTeacher?.lastName || ""}`
          .toLowerCase()
          .includes(q),
    );
  }, [classes, search]);

  const standardOptions = useMemo(() => {
    return [...new Set(classes.map((c) => c.standard).filter(Boolean))].sort(
      (a, b) => Number(a) - Number(b),
    );
  }, [classes]);

  const stats = useMemo(() => {
    const totalStudents = classes.reduce(
      (sum, c) => sum + (c._count?.students ?? 0),
      0,
    );
    const withTeacher = classes.filter(
      (c) => c.classTeacherId || c.classTeacher?.id,
    ).length;
    return {
      total: classes.length,
      totalStudents,
      withTeacher,
      withoutTeacher: classes.length - withTeacher,
    };
  }, [classes]);

  const teacherAssignments = useMemo(
    () => buildTeacherClassMap(classes),
    [classes],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; classes: ClassWithMeta[] }>();
    for (const c of filtered) {
      const key = classGroupKey(c.standard, c.stream);
      if (!map.has(key)) {
        map.set(key, {
          label: classGroupLabel(c.standard, c.stream),
          classes: [],
        });
      }
      map.get(key)!.classes.push(c);
    }
    for (const g of map.values()) {
      g.classes.sort((a, b) => a.section.localeCompare(b.section));
    }
    return [...map.entries()].sort(([a], [b]) => {
      const [sa, sta] = a.split("-");
      const [sb, stb] = b.split("-");
      const na = parseInt(sa, 10);
      const nb = parseInt(sb, 10);
      if (na !== nb) return na - nb;
      return (sta || "").localeCompare(stb || "");
    });
  }, [filtered]);

  return (
    <PageShell
      title={t("classes.title")}
      subtitle={t("classes.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: homeHref },
        { label: t("nav.classes") },
      ]}
      actions={
        canManage ? (
          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <Link href="/students/roll-numbers" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <Hash className="h-4 w-4" /> {t("rollNumbers.title")}
              </Button>
            </Link>
            <Link href="/classes/class-teachers" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <UserCog className="h-4 w-4" />{" "}
                {t("classes.assignClassTeachers")}
              </Button>
            </Link>
            <Button className="w-full sm:w-auto" onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4" /> {t("classes.addClass")}
            </Button>
          </div>
        ) : undefined
      }
    >
      <ConfirmDialog />

      <InfoModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title={t("classes.addClass")}
      >
        <p className="mb-4 text-sm text-slate-500">
          {t("classes.newClassSubtitle")}
        </p>
        <ClassForm
          onSubmit={handleCreate}
          onCancel={() => setShowNewModal(false)}
        />
      </InfoModal>

      {canManage && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-teal-200/80 bg-gradient-to-r from-teal-50 to-emerald-50 px-4 py-3 text-sm text-teal-950 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <UserCog className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
            <div>
              <p className="font-semibold">{t("classes.classTeachersTitle")}</p>
              <p className="mt-0.5 text-teal-900/80">
                {t("classes.teacherAssignHint")}
              </p>
            </div>
          </div>
          <Link href="/classes/class-teachers" className="w-full sm:w-auto sm:shrink-0">
            <Button
              variant="outline"
              className="w-full border-teal-300 bg-white text-teal-800 hover:bg-teal-50 sm:w-auto"
            >
              {t("classes.assignClassTeachers")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: t("classes.totalClasses"),
            value: stats.total,
            icon: School,
            color: "text-blue-600 bg-blue-50",
          },
          {
            label: t("classes.totalStudents"),
            value: stats.totalStudents,
            icon: Users,
            color: "text-emerald-600 bg-emerald-50",
          },
          {
            label: t("classes.withTeacher"),
            value: stats.withTeacher,
            icon: UserCheck,
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            label: t("classes.withoutTeacher"),
            value: stats.withoutTeacher,
            icon: UserX,
            color: "text-amber-600 bg-amber-50",
          },
        ].map((s) => (
          <Card key={s.label} className="border-slate-200/80">
            <CardContent className="flex min-w-0 items-center gap-3 p-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.color}`}
              >
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900 leading-none">
                  {s.value}
                </p>
                <p className="mt-1 break-words text-xs text-slate-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="relative w-full min-w-0 flex-1 space-y-1.5 sm:min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700">
              {t("common.search")}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                placeholder={t("classes.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
        </CardContent>
      </Card>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="mb-4">{t("classes.noClassesHint")}</p>
            {canManage && (
              <Button onClick={() => setShowNewModal(true)}>
                <Plus className="h-4 w-4" /> {t("classes.emptyCta")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        grouped.map(([key, group]) => (
          <div key={key}>
            <h2 className="mb-3 flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-800">
              <span className="w-auto min-w-[2rem] h-8 px-2 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                {group.label.replace("Std ", "")}
              </span>
              {group.label}
              <span className="text-xs font-normal text-slate-500">
                ({group.classes.length} {t("classes.divisions")})
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              {group.classes.map((c) => (
                <ClassCard
                  key={c.id}
                  c={c}
                  teachers={teachers}
                  teacherAssignments={teacherAssignments}
                  canManage={canManage}
                  onTeacherChange={assignTeacher}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </PageShell>
  );
}
