"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SCHOOL_STANDARDS, CLASS_SECTIONS, FINANCIAL_YEARS } from "@/lib/constants";
import { ENGLISH_MONTHS } from "@/lib/certificates/types";
import { useT } from "@/i18n/locale-provider";
import { Search, RefreshCw } from "lucide-react";
import type { SchoolClass } from "@/generated/prisma/client";

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
}: {
  value: CertFilters;
  onChange: (v: CertFilters) => void;
  onLoad: () => void;
  showStudent?: boolean;
  showMonth?: boolean;
  students?: { id: string; firstName: string; surname: string; grNumber?: string | null }[];
}) {
  const t = useT();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/classes?academicYear=${value.academicYear}`)
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []));
  }, [value.academicYear]);

  const set = (patch: Partial<CertFilters>) => onChange({ ...value, ...patch });

  const handleLoad = async () => {
    setLoading(true);
    await Promise.resolve(onLoad());
    setLoading(false);
  };

  return (
    <div className="no-print mb-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

        {/* Header strip */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
            <Search className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Select Class &amp; Load Data</p>
        </div>

        {/* Filter fields */}
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">

          {/* Academic year */}
          <Select
            label={t("certificates.academicYear")}
            options={FINANCIAL_YEARS.map((y) => ({ value: y, label: y }))}
            value={value.academicYear}
            onChange={(e) => set({ academicYear: e.target.value })}
          />

          {/* Class */}
          <Select
            label={t("certificates.class")}
            emptyLabel={t("certificates.allClasses")}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
            value={value.classId}
            onChange={(e) => {
              const c = classes.find((x) => x.id === e.target.value);
              set({ classId: e.target.value, standard: c?.standard || "", section: c?.section || "" });
            }}
          />

          {/* Standard + Section (only when no class selected) */}
          {!value.classId && (
            <>
              <Select
                label={t("certificates.standard")}
                emptyLabel={t("certificates.all")}
                options={SCHOOL_STANDARDS.map((s) => ({ value: s, label: `Std ${s}` }))}
                value={value.standard}
                onChange={(e) => set({ standard: e.target.value })}
              />
              <Select
                label={t("certificates.section")}
                emptyLabel={t("certificates.all")}
                options={CLASS_SECTIONS.map((s) => ({ value: s, label: `Div ${s}` }))}
                value={value.section}
                onChange={(e) => set({ section: e.target.value })}
              />
            </>
          )}

          {/* Month + Year */}
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

          {/* Student */}
          {showStudent && (
            <Select
              label={t("certificates.selectStudent")}
              emptyLabel={t("certificates.chooseStudent")}
              options={students.map((s) => ({
                value: s.id,
                label: `${s.grNumber ? `[${s.grNumber}] ` : ""}${s.firstName} ${s.surname}`,
              }))}
              value={value.studentId}
              onChange={(e) => set({ studentId: e.target.value })}
            />
          )}

          {/* Load button — always last */}
          <div className="flex items-end">
            <Button
              onClick={handleLoad}
              disabled={loading}
              className="w-full gap-1.5"
            >
              {loading
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                : <Search className="h-3.5 w-3.5" />
              }
              {t("certificates.loadData")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
