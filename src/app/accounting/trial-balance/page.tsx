"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatIndianCurrency } from "@/lib/accounting";
import { useT } from "@/i18n/locale-provider";
import { AddLedgerAccount } from "@/components/accounting/add-ledger-account";

export default function TrialBalancePage() {
  const t = useT();
  const [data, setData] = useState<{ trialBalance: Record<string, unknown>[]; totalDebit: number; totalCredit: number; financialYear: { label: string } | null } | null>(null);

  const load = () => {
    fetch("/api/accounting/trial-balance").then((r) => r.json()).then(setData);
  };

  useEffect(load, []);

  const balanced = data && Math.abs(data.totalDebit - data.totalCredit) < 0.01;

  const groupLabel = (type: string) => {
    const map: Record<string, string> = {
      assets: t("accounting.groupAssets"),
      liabilities: t("accounting.groupLiabilities"),
      income: t("accounting.groupIncome"),
      expenses: t("accounting.groupExpenses"),
      capital: t("accounting.groupCapital"),
    };
    return map[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/accounting"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{t("accounting.trialBalanceTitle")}</h1>
          <p className="text-slate-500">{t("accounting.trialBalanceSubtitle", { year: data?.financialYear?.label || "" })}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{t("accounting.trialBalanceLedgerHint")}</p>
        <AddLedgerAccount onAdded={load} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between">
            <span>{t("accounting.accountSummary")}</span>
            <span className={balanced ? "text-emerald-600 text-base" : "text-red-600 text-base"}>
              {balanced ? `✓ ${t("accounting.booksBalanced")}` : `✗ ${t("accounting.differenceFound")}`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left">
                <th className="p-3">{t("accounting.code")}</th>
                <th className="p-3">{t("accounting.accountName")}</th>
                <th className="p-3">{t("accounting.group")}</th>
                <th className="p-3 text-right">{t("accounting.debit")} (₹)</th>
                <th className="p-3 text-right">{t("accounting.credit")} (₹)</th>
              </tr>
            </thead>
            <tbody>
              {data?.trialBalance?.map((a) => (
                <tr key={a.id as string} className="border-b">
                  <td className="p-3 font-mono">{a.code as string}</td>
                  <td className="p-3 font-medium">{a.name as string}</td>
                  <td className="p-3 text-slate-500">{groupLabel(a.groupType as string)}</td>
                  <td className="p-3 text-right">{(a.closingDebit as number) > 0 ? formatIndianCurrency(a.closingDebit as number) : "—"}</td>
                  <td className="p-3 text-right">{(a.closingCredit as number) > 0 ? formatIndianCurrency(a.closingCredit as number) : "—"}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold">
                <td colSpan={3} className="p-3 text-right">{t("accounting.total")}</td>
                <td className="p-3 text-right">{formatIndianCurrency(data?.totalDebit || 0)}</td>
                <td className="p-3 text-right">{formatIndianCurrency(data?.totalCredit || 0)}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
