"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/layout/page-shell";
import { Download, Printer, Save, IndianRupee } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import {
  CATEGORY_LABELS,
  SALARY_CATEGORIES,
  SALARY_FIELDS,
  currentFinancialYear,
  emptyValues,
  fyMonths,
  fyOptions,
  monthLabel,
  rowTotal,
  type SalaryCategory,
  type SalaryFieldKey,
} from "@/lib/salary-statement";
import "./salary-statement.css";

type Grid = Record<string, Record<SalaryFieldKey, number>>; // "category:month" -> values

interface ApiRow {
  category: SalaryCategory;
  month: number;
  year: number;
  [key: string]: unknown;
}

const fmt = (n: number) => (n ? n.toLocaleString("en-IN") : "0");

export default function SalaryStatementPage() {
  const t = useT();
  const [fy, setFy] = useState(currentFinancialYear());
  const [grid, setGrid] = useState<Grid>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("");

  const months = useMemo(() => fyMonths(fy), [fy]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setSchoolName(d?.user?.schoolName || ""))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/staff/salary-statement?fy=${encodeURIComponent(fy)}`)
      .then((r) => r.json())
      .then((d) => {
        const next: Grid = {};
        for (const row of (d.rows || []) as ApiRow[]) {
          const values = emptyValues();
          for (const f of SALARY_FIELDS) values[f.key] = Number(row[f.key]) || 0;
          next[`${row.category}:${row.month}`] = values;
        }
        setGrid(next);
        setSavedAt(null);
      })
      .finally(() => setLoading(false));
  }, [fy]);

  const getValues = useCallback(
    (category: SalaryCategory, month: number) => grid[`${category}:${month}`] || emptyValues(),
    [grid],
  );

  const update = (category: SalaryCategory, month: number, key: SalaryFieldKey, raw: string) => {
    const num = Number(raw.replace(/[^\d.-]/g, "")) || 0;
    setGrid((prev) => ({
      ...prev,
      [`${category}:${month}`]: { ...getValues(category, month), [key]: num },
    }));
    setSavedAt(null);
  };

  const categoryTotals = useMemo(() => {
    const out = {} as Record<SalaryCategory, Record<SalaryFieldKey, number>>;
    for (const c of SALARY_CATEGORIES) {
      const totals = emptyValues();
      for (const { month } of months) {
        const v = getValues(c, month);
        for (const f of SALARY_FIELDS) totals[f.key] += v[f.key];
      }
      out[c] = totals;
    }
    return out;
  }, [months, getValues]);

  const grandTotals = useMemo(() => {
    const totals = emptyValues();
    for (const c of SALARY_CATEGORIES) {
      for (const f of SALARY_FIELDS) totals[f.key] += categoryTotals[c][f.key];
    }
    return totals;
  }, [categoryTotals]);

  const save = async () => {
    setSaving(true);
    try {
      const rows = SALARY_CATEGORIES.flatMap((category) =>
        months.map(({ month, year }) => ({ category, month, year, values: getValues(category, month) })),
      );
      const res = await fetch("/api/staff/salary-statement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financialYear: fy, rows }),
      });
      if (res.ok) setSavedAt(new Date().toLocaleTimeString("en-IN"));
      else alert((await res.json()).error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const downloadExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/staff/salary-statement/export?fy=${encodeURIComponent(fy)}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `salary-statement-${fy}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageShell
      title={t("salaryStatement.title")}
      subtitle={t("salaryStatement.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("nav.staff"), href: "/staff" },
        { label: t("salaryStatement.title") },
      ]}
      actions={
        <>
          <Select
            value={fy}
            onChange={(e) => setFy(e.target.value)}
            options={fyOptions().map((y) => ({ value: y, label: y }))}
            className="w-32"
          />
          <Button size="sm" variant="outline" onClick={downloadExcel} disabled={loading || exporting}>
            <Download className="h-4 w-4" />
            {t("dashboard.exportExcel")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()} disabled={loading}>
            <Printer className="h-4 w-4" />
            {t("certificates.print")}
          </Button>
          <Button size="sm" variant="success" onClick={save} disabled={loading || saving}>
            <Save className="h-4 w-4" />
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </>
      }
    >
      {savedAt && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 print:hidden">
          {t("salaryStatement.savedAt", { time: savedAt })}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="salary-statement-area space-y-6">
          <div className="ss-print-header">
            <h2 className="ss-school">{schoolName}</h2>
            <p className="ss-title">ANNUAL SALARY STATEMENT — {fy}</p>
          </div>

          {SALARY_CATEGORIES.map((category) => (
            <Card key={category} className="ss-category-card">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 ss-cat-head">
                  <IndianRupee className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">
                    {t(`salaryStatement.cat_${category}`)}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="ss-tbl">
                    <thead>
                      <tr>
                        <th className="ss-month">{t("salaryStatement.month")}</th>
                        {SALARY_FIELDS.map((f) => (
                          <th key={f.key}>{f.label}</th>
                        ))}
                        <th className="ss-total">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {months.map(({ month, year }) => {
                        const values = getValues(category, month);
                        return (
                          <tr key={month}>
                            <td className="ss-month">{monthLabel(month, year)}</td>
                            {SALARY_FIELDS.map((f) => (
                              <td key={f.key}>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  className="ss-input"
                                  value={values[f.key] || ""}
                                  placeholder="0"
                                  onChange={(e) => update(category, month, f.key, e.target.value)}
                                />
                              </td>
                            ))}
                            <td className="ss-total">{fmt(rowTotal(values))}</td>
                          </tr>
                        );
                      })}
                      <tr className="ss-total-row">
                        <td className="ss-month">TOTAL</td>
                        {SALARY_FIELDS.map((f) => (
                          <td key={f.key}>{fmt(categoryTotals[category][f.key])}</td>
                        ))}
                        <td className="ss-total">{fmt(rowTotal(categoryTotals[category]))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Total summary — like the PDF's "TOTAL SUMMARY" block */}
          <Card className="ss-category-card">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-amber-50 px-4 py-2.5 ss-cat-head">
                <IndianRupee className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-800">{t("salaryStatement.totalSummary")}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="ss-tbl">
                  <thead>
                    <tr>
                      <th className="ss-month">{t("salaryStatement.detail")}</th>
                      {SALARY_FIELDS.map((f) => (
                        <th key={f.key}>{f.label}</th>
                      ))}
                      <th className="ss-total">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SALARY_CATEGORIES.map((category) => (
                      <tr key={category}>
                        <td className="ss-month">{t(`salaryStatement.cat_${category}`)}</td>
                        {SALARY_FIELDS.map((f) => (
                          <td key={f.key} className="ss-num">{fmt(categoryTotals[category][f.key])}</td>
                        ))}
                        <td className="ss-total">{fmt(rowTotal(categoryTotals[category]))}</td>
                      </tr>
                    ))}
                    <tr className="ss-total-row">
                      <td className="ss-month">GRAND TOTAL</td>
                      {SALARY_FIELDS.map((f) => (
                        <td key={f.key}>{fmt(grandTotals[f.key])}</td>
                      ))}
                      <td className="ss-total">{fmt(rowTotal(grandTotals))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
