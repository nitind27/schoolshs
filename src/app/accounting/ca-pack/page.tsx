"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, FileDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loader";
import { formatIndianCurrency } from "@/lib/accounting";
import { useT } from "@/i18n/locale-provider";

type TbRow = {
  code: string;
  name: string;
  groupType: string;
  closingDebit: number;
  closingCredit: number;
};

type VoucherLine = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string | null;
};

type VoucherRow = {
  voucherNo: string;
  voucherType: string;
  voucherDate: string;
  partyName: string | null;
  narration: string | null;
  totalAmount: number;
  auditStatus: string;
  createdBy: string;
  lines: VoucherLine[];
};

type PackData = {
  generatedAt: string;
  school: {
    name: string;
    udiseCode: string;
    address: string;
    district: string;
    taluka: string;
    phone: string;
  };
  financialYear: {
    label: string;
    auditStatus: string;
    isLocked: boolean;
    submittedAt?: string | null;
    startDate: string;
    endDate: string;
  };
  trialBalance: TbRow[];
  totals: { totalDebit: number; totalCredit: number };
  statements: {
    income: number;
    expenses: number;
    surplus: number;
    assets: number;
    liabilities: number;
    capital: number;
    assetSide: number;
    fundSide: number;
  };
  vouchers: VoucherRow[];
  counts: { accounts: number; vouchers: number };
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(n: number) {
  if (!n) return "—";
  return formatIndianCurrency(n);
}

export default function AccountingCaPackPage() {
  const t = useT();
  const [data, setData] = useState<PackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/accounting/ca-pack")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed");
        if (!j.financialYear) throw new Error(t("accounting.caPackNoFy"));
        setData(j);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [t]);

  const incomeRows = useMemo(
    () => (data?.trialBalance || []).filter((r) => r.groupType === "income"),
    [data],
  );
  const expenseRows = useMemo(
    () => (data?.trialBalance || []).filter((r) => r.groupType === "expenses"),
    [data],
  );
  const assetRows = useMemo(
    () => (data?.trialBalance || []).filter((r) => r.groupType === "assets"),
    [data],
  );
  const liabRows = useMemo(
    () => (data?.trialBalance || []).filter((r) => r.groupType === "liabilities"),
    [data],
  );
  const capitalRows = useMemo(
    () => (data?.trialBalance || []).filter((r) => r.groupType === "capital"),
    [data],
  );

  if (loading) return <PageLoader />;

  if (error || !data) {
    return (
      <div className="space-y-4 p-4">
        <Link href="/accounting">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" /> {t("common.back")}
          </Button>
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || t("common.submitFailed")}
        </div>
      </div>
    );
  }

  const st = data.statements;
  const balancedTb = Math.abs(data.totals.totalDebit - data.totals.totalCredit) < 0.05;
  const balancedBs = Math.abs(st.assetSide - st.fundSide) < 0.05;

  return (
    <div className="ca-pack-page space-y-4">
      {/* Screen toolbar */}
      <div className="no-print sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/accounting">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{t("accounting.caPackTitle")}</h1>
            <p className="text-xs text-slate-500">
              {t("accounting.caPackSubtitle", { year: data.financialYear.label })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="h-3.5 w-3.5" />
            {t("accounting.caPackPrint")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <FileDown className="h-3.5 w-3.5" />
            {t("accounting.caPackPdf")}
          </Button>
          <Link href="/accounting">
            <Button size="sm" variant="outline">
              <Send className="h-3.5 w-3.5" />
              {t("accounting.caPackThenSubmit")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="no-print rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        {t("accounting.caPackHint")}
      </div>

      {/* Printable pack */}
      <div className="ca-pack-print rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        {/* Cover */}
        <section className="ca-pack-section ca-pack-cover text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {t("accounting.caPackCoverEyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">{data.school.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {[data.school.address, data.school.taluka, data.school.district]
              .filter(Boolean)
              .join(", ")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {data.school.udiseCode ? `UDISE: ${data.school.udiseCode}` : ""}
            {data.school.phone ? ` · ${data.school.phone}` : ""}
          </p>
          <div className="mx-auto mt-6 max-w-md rounded-xl border border-slate-300 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("accounting.caPackForCa")}
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {t("accounting.caPackFy", { year: data.financialYear.label })}
            </p>
            <p className="mt-2 text-xs text-slate-600">
              {fmtDate(data.financialYear.startDate)} — {fmtDate(data.financialYear.endDate)}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              {t("accounting.caPackGenerated", { when: fmtDate(data.generatedAt) })}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {t("accounting.caPackCounts", {
                accounts: String(data.counts.accounts),
                vouchers: String(data.counts.vouchers),
              })}
            </p>
          </div>
          <ol className="mx-auto mt-8 max-w-lg space-y-2 text-left text-sm text-slate-700">
            <li>1. {t("accounting.caPackTocCover")}</li>
            <li>2. {t("accounting.caPackTocTb")}</li>
            <li>3. {t("accounting.caPackTocPl")}</li>
            <li>4. {t("accounting.caPackTocBs")}</li>
            <li>5. {t("accounting.caPackTocVouchers")}</li>
          </ol>
        </section>

        {/* Trial Balance */}
        <section className="ca-pack-section">
          <h3 className="ca-pack-h">{t("accounting.trialBalance")} — FY {data.financialYear.label}</h3>
          <table className="ca-pack-tbl">
            <thead>
              <tr>
                <th>{t("accounting.code")}</th>
                <th>{t("accounting.accountName")}</th>
                <th className="ca-pack-num">{t("accounting.debit")}</th>
                <th className="ca-pack-num">{t("accounting.credit")}</th>
              </tr>
            </thead>
            <tbody>
              {data.trialBalance.map((r) => (
                <tr key={r.code}>
                  <td>{r.code}</td>
                  <td>{r.name}</td>
                  <td className="ca-pack-num">{money(r.closingDebit)}</td>
                  <td className="ca-pack-num">{money(r.closingCredit)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="font-bold">
                  {t("accounting.total")}
                  {!balancedTb ? ` (${t("accounting.caPackUnbalanced")})` : ""}
                </td>
                <td className="ca-pack-num font-bold">{money(data.totals.totalDebit)}</td>
                <td className="ca-pack-num font-bold">{money(data.totals.totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* P&L */}
        <section className="ca-pack-section">
          <h3 className="ca-pack-h">
            {t("accounting.profitLoss")} — FY {data.financialYear.label}
          </h3>
          <div className="ca-pack-two">
            <div>
              <p className="ca-pack-subh">{t("accounting.income")}</p>
              <table className="ca-pack-tbl">
                <tbody>
                  {incomeRows.map((r) => (
                    <tr key={r.code}>
                      <td>{r.name}</td>
                      <td className="ca-pack-num">
                        {money(r.closingCredit - r.closingDebit)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="font-bold">{t("accounting.totalIncome")}</td>
                    <td className="ca-pack-num font-bold">{money(st.income)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <p className="ca-pack-subh">{t("accounting.expenses")}</p>
              <table className="ca-pack-tbl">
                <tbody>
                  {expenseRows.map((r) => (
                    <tr key={r.code}>
                      <td>{r.name}</td>
                      <td className="ca-pack-num">
                        {money(r.closingDebit - r.closingCredit)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="font-bold">{t("accounting.totalExpenses")}</td>
                    <td className="ca-pack-num font-bold">{money(st.expenses)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-3 text-sm font-bold">
            {t("accounting.surplusDeficit")}: {money(st.surplus)}
            {st.surplus >= 0 ? ` (${t("accounting.surplus")})` : ` (${t("accounting.deficit")})`}
          </p>
        </section>

        {/* Balance Sheet */}
        <section className="ca-pack-section">
          <h3 className="ca-pack-h">
            {t("accounting.balanceSheet")} — FY {data.financialYear.label}
          </h3>
          <div className="ca-pack-two">
            <div>
              <p className="ca-pack-subh">{t("accounting.assets")}</p>
              <table className="ca-pack-tbl">
                <tbody>
                  {assetRows.map((r) => (
                    <tr key={r.code}>
                      <td>{r.name}</td>
                      <td className="ca-pack-num">
                        {money(r.closingDebit - r.closingCredit)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="font-bold">{t("accounting.total")}</td>
                    <td className="ca-pack-num font-bold">{money(st.assetSide)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <p className="ca-pack-subh">
                {t("accounting.liabilitiesFund")}
              </p>
              <table className="ca-pack-tbl">
                <tbody>
                  {liabRows.map((r) => (
                    <tr key={r.code}>
                      <td>{r.name}</td>
                      <td className="ca-pack-num">
                        {money(r.closingCredit - r.closingDebit)}
                      </td>
                    </tr>
                  ))}
                  {capitalRows.map((r) => (
                    <tr key={r.code}>
                      <td>{r.name}</td>
                      <td className="ca-pack-num">
                        {money(r.closingCredit - r.closingDebit)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>{t("accounting.surplusDeficit")}</td>
                    <td className="ca-pack-num">{money(st.surplus)}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">{t("accounting.total")}</td>
                    <td className="ca-pack-num font-bold">{money(st.fundSide)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            {balancedBs
              ? t("accounting.caPackBsOk")
              : t("accounting.caPackBsWarn")}
          </p>
        </section>

        {/* Voucher register */}
        <section className="ca-pack-section">
          <h3 className="ca-pack-h">
            {t("accounting.voucherRegister")} — FY {data.financialYear.label}
          </h3>
          <table className="ca-pack-tbl ca-pack-tbl-sm">
            <thead>
              <tr>
                <th>{t("accounting.date")}</th>
                <th>{t("accounting.voucherNo")}</th>
                <th>{t("accounting.type")}</th>
                <th>{t("accounting.party")}</th>
                <th>{t("accounting.narration")}</th>
                <th className="ca-pack-num">{t("accounting.amount")}</th>
                <th>{t("accounting.audit")}</th>
              </tr>
            </thead>
            <tbody>
              {data.vouchers.map((v) => (
                <tr key={v.voucherNo + v.voucherDate}>
                  <td>{fmtDate(v.voucherDate)}</td>
                  <td>{v.voucherNo}</td>
                  <td className="uppercase">{v.voucherType}</td>
                  <td>{v.partyName || "—"}</td>
                  <td>{v.narration || "—"}</td>
                  <td className="ca-pack-num">{money(v.totalAmount)}</td>
                  <td>{v.auditStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.vouchers.length > 0 && (
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-bold text-slate-800">
                {t("accounting.caPackVoucherDetail")}
              </h4>
              {data.vouchers.map((v) => (
                <div key={`d-${v.voucherNo}`} className="ca-pack-voucher-block">
                  <p className="text-xs font-bold">
                    {v.voucherNo} · {fmtDate(v.voucherDate)} · {v.voucherType.toUpperCase()}
                    {v.partyName ? ` · ${v.partyName}` : ""}
                    {" · "}
                    {money(v.totalAmount)}
                  </p>
                  {v.narration ? (
                    <p className="text-[11px] text-slate-600">{v.narration}</p>
                  ) : null}
                  <table className="ca-pack-tbl ca-pack-tbl-sm mt-1">
                    <thead>
                      <tr>
                        <th>{t("accounting.code")}</th>
                        <th>{t("accounting.accountName")}</th>
                        <th className="ca-pack-num">{t("accounting.debit")}</th>
                        <th className="ca-pack-num">{t("accounting.credit")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {v.lines.map((l, i) => (
                        <tr key={i}>
                          <td>{l.accountCode}</td>
                          <td>{l.accountName}</td>
                          <td className="ca-pack-num">{money(l.debit)}</td>
                          <td className="ca-pack-num">{money(l.credit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ca-pack-section ca-pack-sign">
          <p className="text-xs text-slate-500">{t("accounting.caPackSignNote")}</p>
          <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs sm:grid-cols-3">
            <div>
              <div className="mb-10 border-b border-slate-400" />
              <p className="font-semibold">{t("accounting.caPackSignClerk")}</p>
            </div>
            <div>
              <div className="mb-10 border-b border-slate-400" />
              <p className="font-semibold">{t("accounting.caPackSignPrincipal")}</p>
            </div>
            <div>
              <div className="mb-10 border-b border-slate-400" />
              <p className="font-semibold">{t("accounting.caPackSignCa")}</p>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .ca-pack-h {
          font-size: 14pt;
          font-weight: 800;
          margin: 0 0 10px;
          padding-bottom: 4px;
          border-bottom: 1.5pt solid #0f172a;
          color: #0f172a;
        }
        .ca-pack-subh {
          font-size: 10pt;
          font-weight: 700;
          margin: 0 0 6px;
          color: #334155;
        }
        .ca-pack-tbl {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
        }
        .ca-pack-tbl th,
        .ca-pack-tbl td {
          border: 0.5pt solid #94a3b8;
          padding: 3pt 5pt;
          vertical-align: top;
        }
        .ca-pack-tbl th {
          background: #e2e8f0;
          text-align: left;
          font-weight: 700;
        }
        .ca-pack-tbl-sm {
          font-size: 8pt;
        }
        .ca-pack-num {
          text-align: right;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .ca-pack-two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .ca-pack-section {
          margin-bottom: 28px;
        }
        .ca-pack-voucher-block {
          break-inside: avoid;
          page-break-inside: avoid;
          margin-bottom: 10px;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html,
          body {
            background: #fff !important;
          }

          .no-print,
          .tn-shell,
          .shell-aside,
          .shell-menu-btn,
          .admin-menu-btn,
          .admin-aside,
          aside,
          nav,
          header.tn-shell,
          header.shell-topbar {
            display: none !important;
            visibility: hidden !important;
          }

          .ca-pack-page {
            padding: 0 !important;
            margin: 0 !important;
          }

          .ca-pack-print {
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
          }

          .ca-pack-section {
            break-inside: auto;
            page-break-inside: auto;
          }

          .ca-pack-cover {
            page-break-after: always;
            break-after: page;
          }

          .ca-pack-tbl thead {
            display: table-header-group;
          }

          .ca-pack-tbl tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .ca-pack-tbl th {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          main {
            padding: 0 !important;
            margin: 0 !important;
          }
        }

        @media screen and (max-width: 700px) {
          .ca-pack-two {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
