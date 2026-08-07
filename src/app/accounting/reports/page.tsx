"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatIndianCurrency } from "@/lib/accounting";
import { useT } from "@/i18n/locale-provider";

type TbRow = {
  groupType: string;
  closingDebit: number;
  closingCredit: number;
  name: string;
};

export default function FinancialReportsPage() {
  const t = useT();
  const [data, setData] = useState<{
    trialBalance: TbRow[];
    financialYear: { label: string } | null;
    totalDebit?: number;
    totalCredit?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/accounting/trial-balance")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed");
        setData(j);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  const tb = data?.trialBalance || [];

  const { income, expenses, assets, liabilities, capital, surplus, assetSide, fundSide } =
    useMemo(() => {
      const incomeAmt = tb
        .filter((a) => a.groupType === "income")
        .reduce((s, a) => s + a.closingCredit - a.closingDebit, 0);
      const expenseAmt = tb
        .filter((a) => a.groupType === "expenses")
        .reduce((s, a) => s + a.closingDebit - a.closingCredit, 0);
      const assetAmt = tb
        .filter((a) => a.groupType === "assets")
        .reduce((s, a) => s + a.closingDebit - a.closingCredit, 0);
      const liabAmt = tb
        .filter((a) => a.groupType === "liabilities")
        .reduce((s, a) => s + a.closingCredit - a.closingDebit, 0);
      const capitalAmt = tb
        .filter((a) => a.groupType === "capital")
        .reduce((s, a) => s + a.closingCredit - a.closingDebit, 0);
      const surplusAmt = incomeAmt - expenseAmt;
      // Assets = Liabilities + Capital + Surplus (deficit reduces fund side)
      const fund = liabAmt + capitalAmt + surplusAmt;
      return {
        income: incomeAmt,
        expenses: expenseAmt,
        assets: assetAmt,
        liabilities: liabAmt,
        capital: capitalAmt,
        surplus: surplusAmt,
        assetSide: assetAmt,
        fundSide: fund,
      };
    }, [tb]);

  const balanced = Math.abs(assetSide - fundSide) < 0.05;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/accounting">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t("accounting.reportsTitle")}</h1>
          <p className="text-slate-500">
            {t("accounting.reportsSubtitle", {
              year: data?.financialYear?.label || "",
            })}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-emerald-200">
          <CardContent className="p-6">
            <TrendingUp className="h-8 w-8 text-emerald-600 mb-2" />
            <p className="text-sm text-slate-500">{t("accounting.totalIncome")}</p>
            <p className="text-2xl font-bold text-emerald-700">
              {formatIndianCurrency(income)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-6">
            <TrendingDown className="h-8 w-8 text-red-600 mb-2" />
            <p className="text-sm text-slate-500">{t("accounting.totalExpenses")}</p>
            <p className="text-2xl font-bold text-red-700">
              {formatIndianCurrency(expenses)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="p-6">
            <Wallet className="h-8 w-8 text-blue-600 mb-2" />
            <p className="text-sm text-slate-500">{t("accounting.surplusDeficit")}</p>
            <p
              className={`text-2xl font-bold ${surplus >= 0 ? "text-blue-700" : "text-red-700"}`}
            >
              {formatIndianCurrency(surplus)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("accounting.profitLoss")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-emerald-700 pt-2">
                {t("accounting.income")}
              </p>
              {tb
                .filter((a) => a.groupType === "income")
                .map((a) => (
                  <div
                    key={a.name}
                    className="flex items-start justify-between gap-3 pl-4"
                  >
                    <span className="min-w-0 break-words">{a.name}</span>
                    <span className="shrink-0 text-right">
                      {formatIndianCurrency(a.closingCredit - a.closingDebit)}
                    </span>
                  </div>
                ))}
              <div className="flex items-start justify-between gap-3 border-t pt-2 font-bold">
                <span className="min-w-0 break-words">
                  {t("accounting.totalIncomeLabel")}
                </span>
                <span className="shrink-0 text-right">
                  {formatIndianCurrency(income)}
                </span>
              </div>
              <p className="font-semibold text-red-700 pt-4">
                {t("accounting.expenses")}
              </p>
              {tb
                .filter((a) => a.groupType === "expenses")
                .map((a) => (
                  <div
                    key={a.name}
                    className="flex items-start justify-between gap-3 pl-4"
                  >
                    <span className="min-w-0 break-words">{a.name}</span>
                    <span className="shrink-0 text-right">
                      {formatIndianCurrency(a.closingDebit - a.closingCredit)}
                    </span>
                  </div>
                ))}
              <div className="flex items-start justify-between gap-3 border-t pt-2 font-bold">
                <span className="min-w-0 break-words">
                  {t("accounting.totalExpensesLabel")}
                </span>
                <span className="shrink-0 text-right">
                  {formatIndianCurrency(expenses)}
                </span>
              </div>
              <div className="mt-3 flex items-start justify-between gap-3 border-t-2 pt-3 text-lg font-bold">
                <span className="min-w-0 break-words">
                  {t("accounting.netSurplus")}
                </span>
                <span
                  className={`shrink-0 text-right ${surplus >= 0 ? "text-emerald-700" : "text-red-700"}`}
                >
                  {formatIndianCurrency(surplus)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("accounting.balanceSheet")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-blue-700">{t("accounting.assets")}</p>
              {tb
                .filter((a) => a.groupType === "assets")
                .map((a) => (
                  <div
                    key={a.name}
                    className="flex items-start justify-between gap-3 pl-4"
                  >
                    <span className="min-w-0 break-words">{a.name}</span>
                    <span className="shrink-0 text-right">
                      {formatIndianCurrency(a.closingDebit - a.closingCredit)}
                    </span>
                  </div>
                ))}
              <div className="flex items-start justify-between gap-3 border-t pt-2 font-bold">
                <span className="min-w-0 break-words">
                  {t("accounting.totalAssets")}
                </span>
                <span className="shrink-0 text-right">
                  {formatIndianCurrency(assets)}
                </span>
              </div>

              <p className="font-semibold text-orange-700 pt-4">
                {t("accounting.liabilitiesFund")}
              </p>
              {tb
                .filter((a) => a.groupType === "liabilities")
                .map((a) => (
                  <div
                    key={a.name}
                    className="flex items-start justify-between gap-3 pl-4"
                  >
                    <span className="min-w-0 break-words">{a.name}</span>
                    <span className="shrink-0 text-right">
                      {formatIndianCurrency(a.closingCredit - a.closingDebit)}
                    </span>
                  </div>
                ))}
              {tb
                .filter((a) => a.groupType === "capital")
                .map((a) => (
                  <div
                    key={a.name}
                    className="flex items-start justify-between gap-3 pl-4"
                  >
                    <span className="min-w-0 break-words">{a.name}</span>
                    <span className="shrink-0 text-right">
                      {formatIndianCurrency(a.closingCredit - a.closingDebit)}
                    </span>
                  </div>
                ))}
              <div className="flex items-start justify-between gap-3 pl-4">
                <span className="min-w-0 break-words">
                  {surplus >= 0
                    ? t("accounting.surplus")
                    : t("accounting.deficit")}
                </span>
                <span
                  className={`shrink-0 text-right ${surplus >= 0 ? "" : "text-red-700"}`}
                >
                  {formatIndianCurrency(surplus)}
                </span>
              </div>
              <div className="mt-3 flex items-start justify-between gap-3 border-t-2 pt-3 font-bold">
                <span className="min-w-0 break-words">{t("accounting.total")}</span>
                <span className="shrink-0 text-right">
                  {formatIndianCurrency(fundSide)}
                </span>
              </div>
              <p
                className={`mt-2 text-xs font-semibold ${balanced ? "text-emerald-700" : "text-amber-700"}`}
              >
                {balanced
                  ? t("accounting.bsBalanced")
                  : t("accounting.bsUnbalanced", {
                      assets: formatIndianCurrency(assetSide),
                      funds: formatIndianCurrency(fundSide),
                    })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
