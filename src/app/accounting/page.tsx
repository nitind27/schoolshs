"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoModal } from "@/components/ui/info-modal";
import { AccountingHelpContent } from "@/components/accounting/accounting-help-content";
import { PageShell } from "@/components/layout/page-shell";
import {
  Calculator,
  BookOpen,
  FileText,
  TrendingUp,
  Shield,
  Plus,
  ArrowRight,
  IndianRupee,
  HelpCircle,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";
import { formatIndianCurrency } from "@/lib/accounting";
import { FINANCIAL_YEARS } from "@/lib/constants";
import { useT } from "@/i18n/locale-provider";

interface AccountingData {
  financialYear: { id: string; label: string; auditStatus: string; _count: { vouchers: number; accounts: number } } | null;
  allFinancialYears: { id: string; label: string; isActive: boolean }[];
  voucherStats: { auditStatus: string; _count: number; _sum: { totalAmount: number | null } }[];
  recentVouchers: { id: string; voucherNo: string; voucherType: string; totalAmount: number; auditStatus: string; voucherDate: string; partyName: string | null }[];
}

export default function AccountingPage() {
  const t = useT();
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newFy, setNewFy] = useState("2025-26");
  const [showHelp, setShowHelp] = useState(false);

  const load = () => {
    fetch("/api/accounting")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const initAccounts = async () => {
    if (!data?.financialYear) return;
    await fetch("/api/accounting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "init_accounts", label: data.financialYear.label }),
    });
    load();
  };

  const setFinancialYear = async (label: string) => {
    await fetch("/api/accounting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    load();
  };

  const voucherTypeLabel = (type: string) => {
    const key = `accounting.voucher${type.charAt(0).toUpperCase() + type.slice(1)}` as const;
    const map: Record<string, string> = {
      receipt: t("accounting.voucherReceipt"),
      payment: t("accounting.voucherPayment"),
      journal: t("accounting.voucherJournal"),
      contra: t("accounting.voucherContra"),
    };
    return map[type] || type;
  };

  if (loading) {
    return (
      <div className="flex justify-center h-64 items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const fy = data?.financialYear;
  const fyLabel = fy?.label || t("accounting.fyNotSet");
  const totalReceipts = data?.voucherStats?.filter((s) => s.auditStatus === "verified").reduce((a, s) => a + (s._sum.totalAmount || 0), 0) || 0;
  const pendingAudit = data?.voucherStats?.find((s) => s.auditStatus === "pending")?._count || 0;

  return (
    <PageShell
      title="Accounting & Finance"
      subtitle={`School financial management for ${fyLabel}`}
      icon={<Calculator className="h-6 w-6" />}
      accentColor="border-blue-500"
      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Accounting" }]}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setShowHelp(true)}>
            <HelpCircle className="h-3.5 w-3.5" /> How to Use
          </Button>
          <select
            value={newFy}
            onChange={(e) => setNewFy(e.target.value)}
            className="h-9 px-3 rounded-xl border border-slate-300 text-sm bg-white"
          >
            {FINANCIAL_YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => setFinancialYear(newFy)}>
            Set Active FY
          </Button>
          <Link href="/accounting/vouchers/new">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" /> New Voucher
            </Button>
          </Link>
        </>
      }
    >
      <div className="space-y-6">

        {/* Help Modal */}
        <InfoModal isOpen={showHelp} onClose={() => setShowHelp(false)} title={t("accounting.helpTitle")}>
          <AccountingHelpContent />
        </InfoModal>

      {!fy && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="font-medium">{t("accounting.fyNotConfigured")}</p>
          </div>
        </div>
      )}

      {fy && fy._count.accounts === 0 && (
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-blue-900">Chart of Accounts not initialized</p>
                <p className="text-sm text-blue-700 mt-0.5">{t("accounting.coaNotInit", { year: fy.label })}</p>
              </div>
            </div>
            <Button onClick={initAccounts} size="sm">{t("accounting.initStandardAccounts")}</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-md">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-medium text-white/70">{t("accounting.totalVouchers")}</p>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,.18)" }}>
              <FileText className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold">{fy?._count.vouchers || 0}</p>
          <p className="text-xs text-white/60 mt-1">this financial year</p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-md">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-medium text-white/70">{t("accounting.ledgerAccounts")}</p>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,.18)" }}>
              <BookOpen className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold">{fy?._count.accounts || 0}</p>
          <p className="text-xs text-white/60 mt-1">chart of accounts</p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-md">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-medium text-white/70">{t("accounting.pendingCaAudit")}</p>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,.18)" }}>
              <Shield className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold">{pendingAudit}</p>
          <p className="text-xs text-white/60 mt-1">vouchers pending</p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-md">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-medium text-white/70">{t("accounting.verifiedAmount")}</p>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,.18)" }}>
              <IndianRupee className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-xl font-bold leading-tight">{formatIndianCurrency(totalReceipts)}</p>
          <p className="text-xs text-white/60 mt-1">verified total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calculator className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle>{t("accounting.quickLinks")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            {[
              { href: "/accounting/vouchers",      label: t("accounting.voucherRegister"), desc: t("accounting.voucherRegisterDesc"),   icon: FileText,   color: "blue"   },
              { href: "/accounting/vouchers/new",  label: t("accounting.createVoucher"),   desc: t("accounting.createVoucherDesc"),     icon: Plus,       color: "emerald" },
              { href: "/accounting/trial-balance", label: t("accounting.trialBalance"),    desc: t("accounting.trialBalanceDesc"),      icon: TrendingUp, color: "violet" },
              { href: "/accounting/reports",       label: t("accounting.financialReports"),desc: t("accounting.financialReportsDesc"),  icon: Calculator, color: "amber"  },
            ].map((item) => {
              const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
                blue:    { bg: "bg-blue-50 hover:bg-blue-100 hover:border-blue-400",    icon: "bg-blue-100 text-blue-600",    border: "border-blue-200" },
                emerald: { bg: "bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400", icon: "bg-emerald-100 text-emerald-600", border: "border-emerald-200" },
                violet:  { bg: "bg-violet-50 hover:bg-violet-100 hover:border-violet-400",    icon: "bg-violet-100 text-violet-600",    border: "border-violet-200" },
                amber:   { bg: "bg-amber-50 hover:bg-amber-100 hover:border-amber-400",  icon: "bg-amber-100 text-amber-600",  border: "border-amber-200" },
              };
              const c = colorMap[item.color];
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`group flex flex-col gap-3 rounded-xl border p-4 transition-all cursor-pointer ${c.bg} ${c.border}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.icon}`}>
                      <item.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{item.label}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-violet-600" />
              </div>
              <CardTitle>{t("accounting.recentVouchers")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {data?.recentVouchers?.length ? (
              <div className="space-y-2">
                {data.recentVouchers.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 hover:bg-slate-100 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{v.voucherNo}</p>
                      <p className="text-xs text-slate-500 truncate">{v.partyName || voucherTypeLabel(v.voucherType)}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-bold text-slate-900">{formatIndianCurrency(v.totalAmount)}</p>
                      <Badge status={v.auditStatus === "verified" ? "verified" : "pending"} />
                    </div>
                  </div>
                ))}
                <Link href="/accounting/vouchers">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    View All Vouchers <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <FileText className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">{t("accounting.noVouchersYet")}</p>
                <Link href="/accounting/vouchers/new" className="mt-3">
                  <Button size="sm"><Plus className="h-3.5 w-3.5" /> Create First Voucher</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </PageShell>
  );
}
