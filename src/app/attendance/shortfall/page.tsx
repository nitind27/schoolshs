"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/i18n/locale-provider";
import { ENGLISH_MONTHS } from "@/lib/certificates/types";
import "@/app/ops-print.css";

type ClassRow = { id: string; name: string; standard: string; section: string };

type ShortRow = {
  id: string;
  name: string;
  rollNumber: string;
  grNumber: string;
  present: number;
  marked: number;
  percent: number;
};

export default function AttendanceShortfallPage() {
  const t = useT();
  const now = new Date();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [threshold, setThreshold] = useState("75");
  const [scope, setScope] = useState<"month" | "year">("month");
  const [rows, setRows] = useState<ShortRow[]>([]);
  const [meta, setMeta] = useState({ className: "", noData: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.classes || []) as ClassRow[];
        setClasses(list);
        if (d.defaultClassId) setClassId(String(d.defaultClassId));
      })
      .catch(() => {});
  }, []);

  const load = async () => {
    if (!classId) {
      setError(t("shortfall.noClass"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ classId, month, year, threshold, scope });
      const res = await fetch(`/api/attendance/shortfall?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        setRows([]);
        return;
      }
      setRows(data.below || []);
      setMeta({ className: data.className || "", noData: data.noData || 0, total: data.total || 0 });
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const monthLabel = `${ENGLISH_MONTHS[Number(month) - 1] || month} ${year}`;
  const limit = Number(threshold) || 75;

  return (
    <PageShell
      title={t("shortfall.title")}
      subtitle={t("shortfall.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("navExt.studentAttendance"), href: "/attendance" },
        { label: t("shortfall.title") },
      ]}
      actions={
        <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!loaded}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      }
    >
      <Card className="no-print">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="w-full sm:w-64">
            <Select
              label={t("shortfall.class")}
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              options={classes.map((cls) => ({
                value: cls.id,
                label: cls.name || `${cls.standard}-${cls.section}`,
              }))}
            />
          </div>
          <div className="w-36">
            <Select
              label={t("shortfall.month")}
              value={month}
              hideEmptyOption
              onChange={(e) => setMonth(e.target.value)}
              options={ENGLISH_MONTHS.map((name, index) => ({ value: String(index + 1), label: name }))}
            />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs font-medium text-slate-600">{t("shortfall.year")}</label>
            <input
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium text-slate-600">{t("shortfall.threshold")}</label>
            <input
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value.replace(/\D/g, "").slice(0, 3))}
            />
          </div>
          <Select
            label={t("shortfall.scope")}
            value={scope}
            hideEmptyOption
            onChange={(e) => setScope(e.target.value === "year" ? "year" : "month")}
            options={[
              { value: "month", label: t("shortfall.scopeMonth") },
              { value: "year", label: t("shortfall.scopeYear") },
            ]}
            className="w-44"
          />
          <Button size="sm" onClick={load} disabled={loading}>
            {loading ? t("common.loading") : "Show list"}
          </Button>
        </CardContent>
      </Card>

      {error && <p className="no-print text-sm text-red-600">{error}</p>}

      {loaded && (
        <div className="ops-print rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-bold text-slate-900">
            {meta.className} · {monthLabel} · {t("shortfall.belowCount", { count: rows.length, threshold: limit })}
          </h2>
          {meta.noData > 0 && (
            <p className="mt-1 text-xs text-slate-500">{t("shortfall.noData", { count: meta.noData })}</p>
          )}
          {rows.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">{t("shortfall.empty")}</p>
          ) : (
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="border border-slate-300 px-2 py-1">#</th>
                  <th className="border border-slate-300 px-2 py-1">{t("shortfall.roll")}</th>
                  <th className="border border-slate-300 px-2 py-1">{t("shortfall.gr")}</th>
                  <th className="border border-slate-300 px-2 py-1">{t("shortfall.name")}</th>
                  <th className="border border-slate-300 px-2 py-1 text-right">{t("shortfall.present")}</th>
                  <th className="border border-slate-300 px-2 py-1 text-right">{t("shortfall.marked")}</th>
                  <th className="border border-slate-300 px-2 py-1 text-right">{t("shortfall.percent")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="border border-slate-300 px-2 py-1">{index + 1}</td>
                    <td className="border border-slate-300 px-2 py-1">{row.rollNumber || "—"}</td>
                    <td className="border border-slate-300 px-2 py-1">{row.grNumber || "—"}</td>
                    <td className="border border-slate-300 px-2 py-1">{row.name}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right">{row.present}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right">{row.marked}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-semibold text-red-700">{row.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </PageShell>
  );
}
