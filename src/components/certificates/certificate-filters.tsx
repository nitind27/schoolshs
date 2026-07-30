"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FINANCIAL_YEARS } from "@/lib/constants";
import { ENGLISH_MONTHS } from "@/lib/certificates/types";
import { useT } from "@/i18n/locale-provider";
import { Lock, RefreshCw, Search, UserRound } from "lucide-react";
import type { SchoolClass } from "@/generated/prisma/client";
import { studentShortNameGu } from "@/lib/student-names";

export interface CertFilters {
  classId: string;
  standard: string;
  section: string;
  academicYear: string;
  studentId: string;
  month: string;
  year: string;
}

export function CertificateFilters({
  value,
  onChange,
  onLoad,
  showStudent = false,
  showMonth = false,
  students = [],
  lockedStudentId,
  lockedStudentLabel,
}: {
  value: CertFilters;
  onChange: (v: CertFilters) => void;
  onLoad: () => void;
  showStudent?: boolean;
  showMonth?: boolean;
  students?: {
    id: string;
    firstName: string;
    surname: string;
    firstNameGu?: string | null;
    surnameGu?: string | null;
    grNumber?: string | null;
  }[];
  /** When set, class/student pickers are hidden — only this student is used */
  lockedStudentId?: string;
  lockedStudentLabel?: string;
}) {
  const t = useT();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(false);
  const locked = Boolean(lockedStudentId);

  useEffect(() => {
    if (locked) return;
    fetch(`/api/classes?academicYear=${value.academicYear}`)
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []));
  }, [value.academicYear, locked]);

  const set = (patch: Partial<CertFilters>) => onChange({ ...value, ...patch });

  const handleClassChange = (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    if (classId && cls) {
      set({ classId, standard: cls.standard || "", section: cls.section || "" });
    } else {
      set({ classId: "", standard: "", section: "" });
    }
  };

  const handleLoad = async () => {
    setLoading(true);
    await Promise.resolve(onLoad());
    setLoading(false);
  };

  return (
    <div className="no-print mb-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
            {locked ? (
              <Lock className="h-3.5 w-3.5 text-teal-700" />
            ) : (
              <Search className="h-3.5 w-3.5 text-blue-600" />
            )}
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {locked ? t("certificates.lockedStudentTitle") : t("certificates.selectClassLoad")}
          </p>
        </div>

        {locked ? (
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/70 px-3.5 py-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white">
                <UserRound className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                  {t("certificates.lockedStudentBadge")}
                </p>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {lockedStudentLabel || t("certificates.lockedStudentFallback")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {showMonth && (
                <>
                  <Select
                    label={t("certificates.month")}
                    options={ENGLISH_MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
                    value={value.month}
                    onChange={(e) => set({ month: e.target.value })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t("certificates.year")}
                    </label>
                    <Input
                      value={value.year}
                      onChange={(e) => set({ year: e.target.value })}
                      placeholder="2026"
                    />
                  </div>
                </>
              )}
              <div className="flex items-end">
                <Button onClick={handleLoad} disabled={loading} className="w-full gap-1.5">
                  {loading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  {t("certificates.loadData")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <Select
              label={t("certificates.academicYear")}
              options={FINANCIAL_YEARS.map((y) => ({ value: y, label: y }))}
              value={value.academicYear}
              onChange={(e) =>
                set({ academicYear: e.target.value, classId: "", standard: "", section: "" })
              }
            />

            <Select
              label={t("certificates.class")}
              emptyLabel={t("certificates.selectClassPlaceholder")}
              options={classes.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              value={value.classId}
              onChange={(e) => handleClassChange(e.target.value)}
            />

            {showMonth && (
              <>
                <Select
                  label={t("certificates.month")}
                  options={ENGLISH_MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
                  value={value.month}
                  onChange={(e) => set({ month: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t("certificates.year")}
                  </label>
                  <Input
                    value={value.year}
                    onChange={(e) => set({ year: e.target.value })}
                    placeholder="2026"
                  />
                </div>
              </>
            )}

            {showStudent && (
              <Select
                label={t("certificates.selectStudent")}
                emptyLabel={t("certificates.chooseStudent")}
                options={students.map((s) => ({
                  value: s.id,
                  label: `${s.grNumber ? `[${s.grNumber}] ` : ""}${studentShortNameGu(s)}`,
                }))}
                value={value.studentId}
                onChange={(e) => set({ studentId: e.target.value })}
              />
            )}

            <div className="flex items-end">
              <Button onClick={handleLoad} disabled={loading} className="w-full gap-1.5">
                {loading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
                {t("certificates.loadData")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
