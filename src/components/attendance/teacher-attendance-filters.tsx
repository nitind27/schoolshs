"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ENGLISH_MONTHS } from "@/lib/certificates/types";
import { useT } from "@/i18n/locale-provider";
import { RefreshCw, Search } from "lucide-react";

export interface TeacherClassOption {
  id: string;
  name: string;
  standard: string;
  section: string;
}

export interface TeacherAttendanceFiltersValue {
  classId: string;
  month: string;
  year: string;
}

export function TeacherAttendanceFilters({
  classes,
  value,
  onChange,
  onLoad,
}: {
  classes: TeacherClassOption[];
  value: TeacherAttendanceFiltersValue;
  onChange: (v: TeacherAttendanceFiltersValue) => void;
  onLoad: () => void;
}) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const set = (patch: Partial<TeacherAttendanceFiltersValue>) => onChange({ ...value, ...patch });

  const handleLoad = async () => {
    setLoading(true);
    await Promise.resolve(onLoad());
    setLoading(false);
  };

  const classOptions = classes.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.standard}-${c.section})`,
  }));

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-emerald-100 bg-emerald-50/60">
        <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Search className="h-3.5 w-3.5 text-emerald-700" />
        </div>
        <p className="text-sm font-semibold text-slate-700">{t("attendance.teacherSelectClass")}</p>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Select
          label={t("attendance.classLabel")}
          options={[{ value: "", label: t("attendance.chooseClass") }, ...classOptions]}
          value={value.classId}
          onChange={(e) => set({ classId: e.target.value })}
        />
        <Select
          label={t("certificates.month")}
          options={ENGLISH_MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
          value={value.month}
          onChange={(e) => set({ month: e.target.value })}
        />
        <Select
          label={t("certificates.year")}
          options={[
            { value: String(new Date().getFullYear()), label: String(new Date().getFullYear()) },
            { value: String(new Date().getFullYear() - 1), label: String(new Date().getFullYear() - 1) },
          ]}
          value={value.year}
          onChange={(e) => set({ year: e.target.value })}
        />
        <div className="flex items-end">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={handleLoad}
            disabled={!value.classId || loading}
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {t("certificates.loadData")}
          </Button>
        </div>
      </div>
    </div>
  );
}
