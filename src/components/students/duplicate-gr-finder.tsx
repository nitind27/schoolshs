"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Copy,
  Eye,
  Hash,
  Pencil,
  Search,
  Users,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import {
  studentDisplayFatherName,
  studentFullNameGu,
  studentShortNameGu,
} from "@/lib/student-names";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

export type DuplicateGrStudent = {
  id: string;
  grNumber: string | null;
  firstName: string | null;
  middleName?: string | null;
  surname: string | null;
  firstNameGu?: string | null;
  middleNameGu?: string | null;
  surnameGu?: string | null;
  fatherName?: string | null;
  fatherNameGu?: string | null;
  standard?: string | null;
  section?: string | null;
  status?: string | null;
  rollNumber?: string | null;
  mobileNumber?: string | null;
  schoolClass?: { name?: string | null; standard?: string | null; section?: string | null } | null;
};

export type DuplicateGrGroup = {
  grNumber: string;
  count: number;
  students: DuplicateGrStudent[];
};

function classText(s: DuplicateGrStudent) {
  if (s.schoolClass?.name) return s.schoolClass.name;
  const std = String(s.standard || s.schoolClass?.standard || "").trim();
  const sec = String(s.section || s.schoolClass?.section || "").trim();
  if (std && sec) return `${std}-${sec}`;
  return std || "—";
}

export function DuplicateGrFinder({
  groups,
  loading,
}: {
  groups: DuplicateGrGroup[];
  loading?: boolean;
}) {
  const t = useT();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => {
        const grMatch = group.grNumber.toLowerCase().includes(q);
        const students = group.students.filter((s) => {
          const name = (studentFullNameGu(s) || studentShortNameGu(s) || "").toLowerCase();
          const father = studentDisplayFatherName(s).toLowerCase();
          return name.includes(q) || father.includes(q) || classText(s).toLowerCase().includes(q);
        });
        if (grMatch) return group;
        if (!students.length) return null;
        return { ...group, students, count: students.length };
      })
      .filter((g): g is DuplicateGrGroup => Boolean(g));
  }, [groups, query]);

  const copyGr = async (gr: string) => {
    try {
      await navigator.clipboard.writeText(gr);
      toast.success(t("students.duplicateGrCopied"));
    } catch {
      toast.error(gr);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-8 text-center text-sm text-amber-900">
        {t("common.loading")}
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-sm text-emerald-900">
        {t("students.duplicateGrEmpty")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
            <Hash className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-950">{t("students.duplicateGrTitle")}</p>
            <p className="mt-0.5 text-xs leading-snug text-amber-900/90">{t("students.duplicateGrSubtitle")}</p>
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700/70" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("students.duplicateGrSearch")}
            className="h-10 border-amber-200 bg-white pl-9"
          />
        </div>
      </div>

      {!filtered.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
          {t("students.duplicateGrNoMatch")}
        </div>
      ) : (
        filtered.map((group) => (
          <section
            key={group.grNumber}
            className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm"
          >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 bg-amber-50/80 px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <p className="font-mono text-base font-bold tracking-wide text-amber-950">
                  GR {group.grNumber}
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-[11px] font-bold text-white">
                  <Users className="h-3 w-3" />
                  {t("students.duplicateGrCount", { count: String(group.count) })}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 border-amber-200 bg-white text-xs text-amber-900"
                onClick={() => void copyGr(group.grNumber)}
              >
                <Copy className="h-3.5 w-3.5" />
                {group.grNumber}
              </Button>
            </header>
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {group.students.map((s) => {
                const name = studentFullNameGu(s) || studentShortNameGu(s) || "—";
                const father = studentDisplayFatherName(s);
                return (
                  <article
                    key={s.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <p className="text-sm font-semibold leading-snug text-slate-900">{name}</p>
                    {father ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {t("fields.fatherName")}: {father}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                      <span className="rounded-md border border-sky-100 bg-sky-50 px-1.5 py-0.5 font-semibold text-sky-800">
                        {classText(s)}
                      </span>
                      {s.rollNumber ? (
                        <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-slate-600">
                          Roll {s.rollNumber}
                        </span>
                      ) : null}
                      {s.status ? (
                        <span
                          className={cn(
                            "rounded-md border px-1.5 py-0.5 font-semibold capitalize",
                            s.status === "draft"
                              ? "border-violet-200 bg-violet-50 text-violet-800"
                              : "border-slate-200 bg-white text-slate-600",
                          )}
                        >
                          {s.status}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <Link href={`/students/${s.id}/edit`}>
                        <Button size="sm" className="h-8 gap-1 px-2.5 text-xs">
                          <Pencil className="h-3.5 w-3.5" />
                          {t("students.duplicateGrEdit")}
                        </Button>
                      </Link>
                      <Link href={`/students/${s.id}`}>
                        <Button size="sm" variant="outline" className="h-8 gap-1 px-2.5 text-xs">
                          <Eye className="h-3.5 w-3.5" />
                          {t("common.view")}
                        </Button>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
