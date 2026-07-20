"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/layout/page-shell";
import { Download, Printer, BookOpen, PencilLine } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import {
  SALARY_CATEGORIES,
  SALARY_FIELDS,
  currentFinancialYear,
  fyMonths,
  fyOptions,
  monthLabel,
  type SalaryCategory,
  type SalaryFieldKey,
} from "@/lib/salary-statement";
import "./salary-ledger.css";

interface ApiRow {
  category: SalaryCategory;
  month: number;
  year: number;
  [key: string]: unknown;
}

const fmt = (n: number) => (n ? n.toLocaleString("en-IN") : "0");

export default function SalaryLedgerPage() {
  const t = useT();
  const [fy, setFy] = useState(currentFinancialYear());
  const [category, setCategory] = useState<"" | SalaryCategory>("");
  const [rows, setRows] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
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
      .then((d) => setRows((d.rows || []) as ApiRow[]))
      .finally(() => setLoading(false));
  }, [fy]);

  /** month -> field -> sum (category filter applied) */
  const byMonth = useMemo(() => {
    const map = new Map<number, Record<SalaryFieldKey, number>>();
    for (const row of rows) {
      if (category && row.category !== category) continue;
      const acc = map.get(row.month) || ({} as Record<SalaryFieldKey, number>);
      for (const f of SALARY_FIELDS) {
        acc[f.key] = (acc[f.key] || 0) + (Number(row[f.key]) || 0);
      }
      map.set(row.month, acc);
    }
    return map;
  }, [rows, category]);

  const { rowTotals, monthTotals, grand } = useMemo(() => {
    const rowTotals = {} as Record<SalaryFieldKey, number>;
    const monthTotals = new Map<number, number>();
    let grand = 0;
    for (const f of SALARY_FIELDS) {
      rowTotals[f.key] = 0;
      for (const { month } of months) {
        const v = byMonth.get(month)?.[f.key] || 0;
        rowTotals[f.key] += v;
        monthTotals.set(month, (monthTotals.get(month) || 0) + v);
        grand += v;
      }
    }
    return { rowTotals, monthTotals, grand };
  }, [byMonth, months]);

  const hasData = rows.length > 0;

  const downloadExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch(
        `/api/staff/salary-statement/ledger-export?fy=${encodeURIComponent(fy)}&category=${category}`,
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `salary-ledger-${fy}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageShell
      title={t("salaryLedger.title")}
      subtitle={t("salaryLedger.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("nav.staff"), href: "/staff" },
        { label: t("salaryLedger.title") },
      ]}
      actions={
        <>
          <Select
            value={fy}
            onChange={(e) => setFy(e.target.value)}
            options={fyOptions().map((y) => ({ value: y, label: y }))}
            className="w-32"
          />
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as "" | SalaryCategory)}
            options={[
              { value: "", label: t("salaryLedger.allCategories") },
              ...SALARY_CATEGORIES.map((cKey) => ({ value: cKey, label: t(`salaryStatement.cat_${cKey}`) })),
            ]}
            className="w-56"
          />
          <Button size="sm" variant="outline" onClick={downloadExcel} disabled={loading || exporting || !hasData}>
            <Download className="h-4 w-4" />
            {t("dashboard.exportExcel")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()} disabled={loading || !hasData}>
            <Printer className="h-4 w-4" />
            {t("certificates.print")}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : !hasData ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <BookOpen className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-slate-600 font-medium">{t("salaryLedger.empty")}</p>
          <Link
            href="/staff/salary-statement"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            <PencilLine className="h-4 w-4" />
            {t("salaryLedger.goEnter")}
          </Link>
        </div>
      ) : (
        <div className="salary-ledger-area">
          <div className="lg-print-header">
            <h2 className="lg-school">{schoolName}</h2>
            <p className="lg-title">
              SALARY LEDGER — {fy}
              {category ? ` — ${t(`salaryStatement.cat_${category}`)}` : ` — ${t("salaryLedger.allCategories")}`}
            </p>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="lg-tbl">
                <thead>
                  <tr>
                    <th className="lg-comp"></th>
                    {months.map(({ month, year }) => (
                      <th key={month}>{monthLabel(month, year)}</th>
                    ))}
                    <th className="lg-total">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {SALARY_FIELDS.map((f) => (
                    <tr key={f.key}>
                      <td className="lg-comp">{f.label}</td>
                      {months.map(({ month }) => (
                        <td key={month} className="lg-num">
                          {fmt(byMonth.get(month)?.[f.key] || 0)}
                        </td>
                      ))}
                      <td className="lg-total">{fmt(rowTotals[f.key])}</td>
                    </tr>
                  ))}
                  <tr className="lg-total-row">
                    <td className="lg-comp">TOTAL</td>
                    {months.map(({ month }) => (
                      <td key={month} className="lg-num">
                        {fmt(monthTotals.get(month) || 0)}
                      </td>
                    ))}
                    <td className="lg-total">{fmt(grand)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="mt-2 text-xs text-slate-500 print:hidden">{t("salaryLedger.sourceNote")}</p>
        </div>
      )}
    </PageShell>
  );
}
