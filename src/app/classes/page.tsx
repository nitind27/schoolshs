"use client";

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
  canManage,
  onTeacherChange,
  onDelete,
}: {
  c: ClassWithMeta;
  teachers: Staff[];
  canManage: boolean;
  onTeacherChange: (classId: string, teacherId: string) => void;
  onDelete: (c: ClassWithMeta) => void;
}) {
  const t = useT();
  const studentCount = c._count?.students ?? 0;

  return (
    <Card className="group relative h-full overflow-hidden border-slate-200/80 hover:border-blue-300 hover:shadow-lg transition-all duration-200">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500 opacity-80" />
      <CardContent className="p-4 pt-5 flex flex-col h-full">
        <Link href={`/classes/${c.id}`} className="block flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-base truncate group-hover:text-blue-700 transition-colors">
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
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 text-blue-700 px-2.5 py-1 text-xs font-semibold">
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
                {teachers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Link href={`/classes/${c.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  {t("classes.viewClass")}
                </Button>
              </Link>
              <Link href={`/classes/${c.id}/edit`}>
                <Button variant="secondary" size="icon-sm" title={t("classes.editClass")}>
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
          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 truncate">
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
    fetch("/api/staff?active=true")
      .then((r) => r.json())
      .then((d) =>
        setTeachers(
          (d.staff || []).filter((s: Staff) =>
            ["Teacher", "Head Teacher", "Principal", "Class Teacher"].includes(s.designation)
          )
        )
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
          .includes(q)
    );
  }, [classes, search]);

  const standardOptions = useMemo(() => {
    return [...new Set(classes.map((c) => c.standard).filter(Boolean))].sort(
      (a, b) => Number(a) - Number(b),
    );
  }, [classes]);

  const stats = useMemo(() => {
    const totalStudents = classes.reduce((sum, c) => sum + (c._count?.students ?? 0), 0);
    const withTeacher = classes.filter((c) => c.classTeacherId || c.classTeacher?.id).length;
    return {
      total: classes.length,
      totalStudents,
      withTeacher,
      withoutTeacher: classes.length - withTeacher,
    };
  }, [classes]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; classes: ClassWithMeta[] }>();
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
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="h-4 w-4" /> {t("classes.addClass")}
          </Button>
        ) : undefined
      }
    >
      <ConfirmDialog />

      <InfoModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title={t("classes.addClass")}
      >
        <p className="mb-4 text-sm text-slate-500">{t("classes.newClassSubtitle")}</p>
        <ClassForm
          onSubmit={handleCreate}
          onCancel={() => setShowNewModal(false)}
        />
      </InfoModal>

      {canManage && (
        <div className="rounded-xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200/80 px-4 py-3 text-sm text-blue-900 mb-4 flex items-start gap-3">
          <School className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <p>{t("classes.manageHint")}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { label: t("classes.totalClasses"), value: stats.total, icon: School, color: "text-blue-600 bg-blue-50" },
          { label: t("classes.totalStudents"), value: stats.totalStudents, icon: Users, color: "text-emerald-600 bg-emerald-50" },
          { label: t("classes.withTeacher"), value: stats.withTeacher, icon: UserCheck, color: "text-indigo-600 bg-indigo-50" },
          { label: t("classes.withoutTeacher"), value: stats.withoutTeacher, icon: UserX, color: "text-amber-600 bg-amber-50" },
        ].map((s) => (
          <Card key={s.label} className="border-slate-200/80">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 leading-none">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[200px] space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">{t("common.search")}</label>
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
            className="w-40"
          />
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center h-48 items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
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
            <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
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
