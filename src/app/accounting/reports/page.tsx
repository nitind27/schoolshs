"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatIndianCurrency } from "@/lib/accounting";
import { useT } from "@/i18n/locale-provider";

export default function FinancialReportsPage() {
  const t = useT();
  const [data, setData] = useState<{ trialBalance: { groupType: string; closingDebit: number; closingCredit: number; name: string }[]; financialYear: { label: string } | null } | null>(null);

  useEffect(() => {
    fetch("/api/accounting/trial-balance").then((r) => r.json()).then(setData);
  }, []);

  const tb = data?.trialBalance || [];
  const income = tb.filter((a) => a.groupType === "income").reduce((s, a) => s + a.closingCredit, 0);
  const expenses = tb.filter((a) => a.groupType === "expenses").reduce((s, a) => s + a.closingDebit, 0);
  const assets = tb.filter((a) => a.groupType === "assets").reduce((s, a) => s + a.closingDebit, 0);
  const liabilities = tb.filter((a) => a.groupType === "liabilities").reduce((s, a) => s + a.closingCredit, 0);
  const capital = tb.filter((a) => a.groupType === "capital").reduce((s, a) => s + a.closingCredit, 0);
  const surplus = income - expenses;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/accounting"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{t("accounting.reportsTitle")}</h1>
          <p className="text-slate-500">{t("accounting.reportsSubtitle", { year: data?.financialYear?.label || "" })}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-emerald-200">
          <CardContent className="p-6">
            <TrendingUp className="h-8 w-8 text-emerald-600 mb-2" />
            <p className="text-sm text-slate-500">{t("accounting.totalIncome")}</p>
            <p className="text-2xl font-bold text-emerald-700">{formatIndianCurrency(income)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-6">
            <TrendingDown className="h-8 w-8 text-red-600 mb-2" />
            <p className="text-sm text-slate-500">{t("accounting.totalExpenses")}</p>
            <p className="text-2xl font-bold text-red-700">{formatIndianCurrency(expenses)}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="p-6">
            <Wallet className="h-8 w-8 text-blue-600 mb-2" />
            <p className="text-sm text-slate-500">{t("accounting.surplusDeficit")}</p>
            <p className={`text-2xl font-bold ${surplus >= 0 ? "text-blue-700" : "text-red-700"}`}>{formatIndianCurrency(surplus)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>{t("accounting.profitLoss")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-emerald-700 pt-2">{t("accounting.income")}</p>
              {tb.filter((a) => a.groupType === "income").map((a) => (
                <div key={a.name} className="flex justify-between pl-4"><span>{a.name}</span><span>{formatIndianCurrency(a.closingCredit)}</span></div>
              ))}
              <div className="flex justify-between font-bold border-t pt-2"><span>{t("accounting.totalIncomeLabel")}</span><span>{formatIndianCurrency(income)}</span></div>
              <p className="font-semibold text-red-700 pt-4">{t("accounting.expenses")}</p>
              {tb.filter((a) => a.groupType === "expenses").map((a) => (
                <div key={a.name} className="flex justify-between pl-4"><span>{a.name}</span><span>{formatIndianCurrency(a.closingDebit)}</span></div>
              ))}
              <div className="flex justify-between font-bold border-t pt-2"><span>{t("accounting.totalExpensesLabel")}</span><span>{formatIndianCurrency(expenses)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t-2 pt-3 mt-3"><span>{t("accounting.netSurplus")}</span><span className={surplus >= 0 ? "text-emerald-700" : "text-red-700"}>{formatIndianCurrency(surplus)}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("accounting.balanceSheet")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-blue-700">{t("accounting.assets")}</p>
              {tb.filter((a) => a.groupType === "assets").map((a) => (
                <div key={a.name} className="flex justify-between pl-4"><span>{a.name}</span><span>{formatIndianCurrency(a.closingDebit)}</span></div>
              ))}
              <div className="flex justify-between font-bold border-t pt-2"><span>{t("accounting.totalAssets")}</span><span>{formatIndianCurrency(assets)}</span></div>
              <p className="font-semibold text-orange-700 pt-4">{t("accounting.liabilitiesFund")}</p>
              {tb.filter((a) => a.groupType === "liabilities").map((a) => (
                <div key={a.name} className="flex justify-between pl-4"><span>{a.name}</span><span>{formatIndianCurrency(a.closingCredit)}</span></div>
              ))}
              {tb.filter((a) => a.groupType === "capital").map((a) => (
                <div key={a.name} className="flex justify-between pl-4"><span>{a.name}</span><span>{formatIndianCurrency(a.closingCredit)}</span></div>
              ))}
              <div className="flex justify-between pl-4"><span>{t("accounting.surplus")}</span><span>{formatIndianCurrency(Math.max(surplus, 0))}</span></div>
              <div className="flex justify-between font-bold border-t-2 pt-3 mt-3"><span>{t("accounting.total")}</span><span>{formatIndianCurrency(liabilities + capital + Math.max(surplus, 0))}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
