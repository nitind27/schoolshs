"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { PageLoader } from "@/components/ui/loader";
import { formatIndianCurrency } from "@/lib/accounting";
import { useT } from "@/i18n/locale-provider";
import { ArrowLeft, BookMarked, Download } from "lucide-react";

type DayRow = {
  date: string;
  voucherNo: string;
  type: string;
  narration: string;
  receipt: number | "";
  payment: number | "";
};

function monthStartISO(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1))
    .toISOString()
    .slice(0, 10);
}
function monthEndISO(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
}

export default function DayBookPage() {
  const t = useT();
  const [dateFrom, setDateFrom] = useState(monthStartISO);
  const [dateTo, setDateTo] = useState(monthEndISO);
  const [rows, setRows] = useState<DayRow[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!dateFrom || !dateTo) {
      setError(t("reportsHub.dateRequired"));
      return;
    }
    if (dateFrom > dateTo) {
      setError(t("reportsHub.dateRangeInvalid"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({
        type: "day_book",
        format: "json",
        dateFrom,
        dateTo,
      });
      const res = await fetch(`/api/reports/export?${p}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setTitle(data.title || t("accounting.dayBook"));
      const sheet = data.sheets?.[0];
      if (!sheet || sheet.headers?.[0] === "Note") {
        setRows([]);
        if (sheet?.rows?.[0]?.[0]) setError(String(sheet.rows[0][0]));
        return;
      }
      const parsed: DayRow[] = (sheet.rows || []).map(
        (r: (string | number)[]) => ({
          date: String(r[0] ?? ""),
          voucherNo: String(r[1] ?? ""),
          type: String(r[2] ?? ""),
          narration: String(r[3] ?? ""),
          receipt: r[4] === "" || r[4] == null ? "" : Number(r[4]) || 0,
          payment: r[5] === "" || r[5] == null ? "" : Number(r[5]) || 0,
        }),
      );
      setRows(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalReceipt = rows.reduce(
    (s, r) => s + (typeof r.receipt === "number" ? r.receipt : 0),
    0,
  );
  const totalPayment = rows.reduce(
    (s, r) => s + (typeof r.payment === "number" ? r.payment : 0),
    0,
  );

  const exportXlsx = () => {
    const p = new URLSearchParams({
      type: "day_book",
      format: "xlsx",
      dateFrom,
      dateTo,
    });
    window.open(`/api/reports/export?${p}`, "_blank");
  };

  return (
    <PageShell
      title={t("accounting.dayBook")}
      subtitle={t("accounting.dayBookDesc")}
      icon={<BookMarked className="h-6 w-6" />}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("navExt.accounting"), href: "/accounting" },
        { label: t("accounting.dayBook") },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/accounting">
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> {t("common.back")}
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={exportXlsx}
            disabled={!rows.length}
          >
            <Download className="h-3.5 w-3.5" /> Excel
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
          <DateField
            label={t("reportsHub.filterDateFrom")}
            value={dateFrom}
            onChange={setDateFrom}
            outputFormat="iso"
            showHint={false}
          />
          <DateField
            label={t("reportsHub.filterDateTo")}
            value={dateTo}
            onChange={setDateTo}
            outputFormat="iso"
            showHint={false}
          />
          <div className="flex items-end">
            <Button onClick={() => void load()} className="w-full sm:w-auto">
              {t("common.refresh")}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <PageLoader />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
              {title || t("accounting.dayBook")}
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Voucher</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Narration</th>
                  <th className="px-3 py-2 text-right">Receipt</th>
                  <th className="px-3 py-2 text-right">Payment</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-10 text-center text-slate-500"
                    >
                      {t("accounting.dayBookEmpty")}
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr
                      key={`${r.voucherNo}-${i}`}
                      className="border-t border-slate-100"
                    >
                      <td className="px-3 py-2 whitespace-nowrap">{r.date}</td>
                      <td className="px-3 py-2 font-medium">{r.voucherNo}</td>
                      <td className="px-3 py-2 capitalize">{r.type}</td>
                      <td className="px-3 py-2 max-w-xs truncate">
                        {r.narration || "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-700">
                        {typeof r.receipt === "number"
                          ? formatIndianCurrency(r.receipt)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-red-700">
                        {typeof r.payment === "number"
                          ? formatIndianCurrency(r.payment)
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-700">
                      {formatIndianCurrency(totalReceipt)}
                    </td>
                    <td className="px-3 py-2 text-right text-red-700">
                      {formatIndianCurrency(totalPayment)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
