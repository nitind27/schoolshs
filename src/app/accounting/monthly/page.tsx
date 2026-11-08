"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { AccountingNav } from "@/components/accounting/accounting-nav";
import { CalendarRange } from "lucide-react";
import { formatIndianCurrency, fyMonthRanges } from "@/lib/accounting";
import { useLocale, useT } from "@/i18n/locale-provider";

type AmountRow = { id: string; code: string; name: string; amount: number };
type CashRow = {
  id: string;
  code: string;
  name: string;
  accountType: string;
  start: number;
  moneyIn: number;
  moneyOut: number;
  end: number;
};
type VoucherRow = {
  id: string;
  voucherNo: string;
  voucherDate: string;
  voucherType: string;
  partyName: string | null;
  totalAmount: number;
  auditStatus: string;
};

type PeriodData = {
  financialYear: { label: string } | null;
  from: string;
  to: string;
  yearFrom: string | null;
  yearTo: string | null;
  receipts: number;
  payments: number;
  income: AmountRow[];
  expenses: AmountRow[];
  incomeTotal: number;
  expenseTotal: number;
  cashBank: CashRow[];
  vouchers: VoucherRow[];
  voucherCount: number;
  negativeCash: { name: string; end: number } | null;
};

export default function MonthlyCheckPage() {
  const t = useT();
  const { locale } = useLocale();
  const [data, setData] = useState<PeriodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (from && to) {
      params.set("from", from);
      params.set("to", to);
    }
    setLoading(true);
    setError(null);
    fetch(`/api/accounting/period?${params}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed");
        return j as PeriodData;
      })
      .then((j) => {
        setData(j);
        if (!from && j.from) {
          setFrom(j.from);
          setTo(j.to);
          setDraftFrom(j.from);
          setDraftTo(j.to);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [from, to]);

  const months = data?.financialYear?.label ? fyMonthRanges(data.financialYear.label) : [];
  const monthName = (year: number, month: number) =>
    new Date(year, month - 1, 1).toLocaleDateString(locale === "gu" ? "gu-IN" : "en-IN", {
      month: "short",
    });

  const cash = data?.cashBank.find((a) => a.accountType === "cash" || /cash in hand/i.test(a.name));
  const bankEnd = (data?.cashBank || [])
    .filter((a) => a !== cash)
    .reduce((s, a) => s + a.end, 0);

  const spendGap = (data?.expenseTotal || 0) - (data?.incomeTotal || 0);
  const voucherTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      receipt: t("accounting.voucherReceipt"),
      payment: t("accounting.voucherPayment"),
      journal: t("accounting.voucherJournal"),
      contra: t("accounting.voucherContra"),
    };
    return map[type] || type;
  };

  return (
    <PageShell
      title={t("accounting.monthCheckTitle")}
      subtitle={t("accounting.monthCheckSubtitle")}
      icon={<CalendarRange className="h-6 w-6" />}
      accentColor="border-violet-500"
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("navExt.accounting"), href: "/accounting" },
        { label: t("accounting.monthCheckTitle") },
      ]}
    >
      <div className="space-y-4">
        <AccountingNav current="month" />

        {!data?.financialYear && !loading && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("accounting.fyNotConfigured")}{" "}
            <Link href="/accounting" className="font-semibold underline">
              {t("accounting.title")}
            </Link>
          </div>
        )}

        {data?.financialYear && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">
              {t("accounting.activeFyBadge", { year: data.financialYear.label })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {months.map((m) => {
                const active = from === m.from && to === m.to;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      setFrom(m.from);
                      setTo(m.to);
                      setDraftFrom(m.from);
                      setDraftTo(m.to);
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-violet-100"
                    }`}
                  >
                    {monthName(m.year, m.month)}
                  </button>
                );
              })}
              {data.yearFrom && data.yearTo && (
                <button
                  type="button"
                  onClick={() => {
                    setFrom(data.yearFrom || "");
                    setTo(data.yearTo || "");
                    setDraftFrom(data.yearFrom || "");
                    setDraftTo(data.yearTo || "");
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    from === data.yearFrom && to === data.yearTo
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {t("accounting.wholeYear")}
                </button>
              )}
            </div>
            <div className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <DateField
                label={t("accounting.fromDate")}
                value={draftFrom}
                onChange={setDraftFrom}
                outputFormat="iso"
                showHint={false}
              />
              <DateField
                label={t("accounting.toDate")}
                value={draftTo}
                onChange={setDraftTo}
                outputFormat="iso"
                showHint={false}
              />
              <Button
                size="sm"
                onClick={() => {
                  if (draftFrom && draftTo && draftFrom <= draftTo) {
                    setFrom(draftFrom);
                    setTo(draftTo);
                  }
                }}
              >
                {t("accounting.showPeriod")}
              </Button>
            </div>
          </section>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && <PageLoader />}

        {data?.financialYear && !loading && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label={t("accounting.moneyIn")} value={formatIndianCurrency(data.receipts)} tone="emerald" />
              <Stat label={t("accounting.moneyOut")} value={formatIndianCurrency(data.payments)} tone="rose" />
              <Stat
                label={t("accounting.cashAtEnd")}
                value={cash ? formatIndianCurrency(cash.end) : "—"}
                tone={cash && cash.end < 0 ? "rose" : "blue"}
              />
              <Stat label={t("accounting.bankAtEnd")} value={formatIndianCurrency(bankEnd)} tone="violet" />
            </div>

            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                data.negativeCash
                  ? "border border-rose-200 bg-rose-50 text-rose-900"
                  : data.voucherCount === 0
                    ? "border border-slate-200 bg-slate-50 text-slate-700"
                    : spendGap > 0.5
                      ? "border border-amber-200 bg-amber-50 text-amber-950"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-900"
              }`}
            >
              {data.negativeCash
                ? t("accounting.monthCashNegative", {
                    name: data.negativeCash.name,
                    amount: formatIndianCurrency(Math.abs(data.negativeCash.end)),
                  })
                : data.voucherCount === 0
                  ? t("accounting.monthNoData")
                  : spendGap > 0.5
                    ? t("accounting.monthSpendMore", { amount: formatIndianCurrency(spendGap) })
                    : t("accounting.monthOk")}
              <p className="mt-1 text-xs opacity-80">{t("accounting.periodNote")}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <AmountList
                title={t("accounting.incomeThisPeriod")}
                total={data.incomeTotal}
                rows={data.income}
                empty={t("accounting.monthNoData")}
              />
              <AmountList
                title={t("accounting.expenseThisPeriod")}
                total={data.expenseTotal}
                rows={data.expenses}
                empty={t("accounting.monthNoData")}
              />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-bold text-slate-900">{t("accounting.cashBankMove")}</h2>
              </div>
              {data.cashBank.length === 0 ? (
                <p className="px-4 py-4 text-sm text-slate-500">{t("accounting.noCashLedger")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-slate-500">
                        <th className="px-4 py-2 font-medium">{t("accounting.accountName")}</th>
                        <th className="px-3 py-2 text-right font-medium">{t("accounting.colStart")}</th>
                        <th className="px-3 py-2 text-right font-medium">{t("accounting.colIn")}</th>
                        <th className="px-3 py-2 text-right font-medium">{t("accounting.colOut")}</th>
                        <th className="px-4 py-2 text-right font-medium">{t("accounting.colEnd")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cashBank.map((row) => (
                        <tr key={row.id} className="border-b border-slate-100">
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/accounting/ledgers?account=${row.id}`}
                              className="font-semibold text-blue-700 hover:underline"
                            >
                              {row.code} {row.name}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-right">{formatIndianCurrency(row.start)}</td>
                          <td className="px-3 py-2.5 text-right text-emerald-700">
                            {formatIndianCurrency(row.moneyIn)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-rose-700">
                            {formatIndianCurrency(row.moneyOut)}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-bold ${
                              row.end < 0 ? "text-rose-700" : "text-slate-900"
                            }`}
                          >
                            {formatIndianCurrency(row.end)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-bold text-slate-900">
                  {t("accounting.vouchersInPeriod")} ({data.voucherCount})
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/accounting/day-book?from=${data.from}&to=${data.to}`}>
                    <Button variant="outline" size="sm">
                      {t("accounting.openDayBook")}
                    </Button>
                  </Link>
                  <Link href="/accounting/reports">
                    <Button variant="outline" size="sm">
                      {t("accounting.openReports")}
                    </Button>
                  </Link>
                </div>
              </div>
              {data.vouchers.length === 0 ? (
                <p className="px-4 py-4 text-sm text-slate-500">{t("accounting.monthNoData")}</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.vouchers.map((v) => (
                    <li key={v.id}>
                      <Link
                        href={`/accounting/vouchers/${v.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{v.voucherNo}</p>
                          <p className="truncate text-xs text-slate-500">
                            {String(v.voucherDate).slice(0, 10)} · {voucherTypeLabel(v.voucherType)}
                            {v.partyName ? ` · ${v.partyName}` : ""}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-slate-900">
                          {formatIndianCurrency(v.totalAmount)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "rose" | "blue" | "violet";
}) {
  const toneClass = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    violet: "border-violet-200 bg-violet-50 text-violet-800",
  }[tone];
  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function AmountList({
  title,
  total,
  rows,
  empty,
}: {
  title: string;
  total: number;
  rows: AmountRow[];
  empty: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        <p className="text-sm font-bold text-slate-900">{formatIndianCurrency(total)}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
              <Link href={`/accounting/ledgers?account=${row.id}`} className="min-w-0 text-blue-800 hover:underline">
                <span className="mr-2 font-mono text-xs text-slate-400">{row.code}</span>
                {row.name}
              </Link>
              <span className="shrink-0 font-semibold">{formatIndianCurrency(row.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
