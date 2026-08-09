"use client";

import { PageLoader } from "@/components/ui/loader";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoModal } from "@/components/ui/info-modal";
import { AccountingHelpContent } from "@/components/accounting/accounting-help-content";
import { AddLedgerAccount } from "@/components/accounting/add-ledger-account";
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
  Send,
  CalendarRange,
} from "lucide-react";
import { formatIndianCurrency } from "@/lib/accounting";
import { FINANCIAL_YEARS } from "@/lib/constants";
import { useT } from "@/i18n/locale-provider";
import { useConfirm } from "@/hooks/use-confirm";

interface FyRow {
  id: string;
  label: string;
  isActive: boolean;
  isLocked?: boolean;
  auditStatus?: string;
  accounts?: number;
  vouchers?: number;
}

interface AccountingData {
  financialYear: {
    id: string;
    label: string;
    auditStatus: string;
    isLocked?: boolean;
    submittedAt?: string | null;
    _count: { vouchers: number; accounts: number };
  } | null;
  allFinancialYears: FyRow[];
  voucherStats: { auditStatus: string; _count: number; _sum: { totalAmount: number | null } }[];
  recentVouchers: {
    id: string;
    voucherNo: string;
    voucherType: string;
    totalAmount: number;
    auditStatus: string;
    voucherDate: string;
    partyName: string | null;
  }[];
  pendingFlagged?: number;
  school?: { id: string; name: string };
}

export default function AccountingPage() {
  const t = useT();
  const { confirm, ConfirmDialog } = useConfirm();
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newFy, setNewFy] = useState("2026-27");
  const [showHelp, setShowHelp] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fyBusy, setFyBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    fetch("/api/accounting")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d?.financialYear?.label) setNewFy(d.financialYear.label);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserRole(d.user?.role || null));
  }, []);

  const initAccounts = async () => {
    if (!data?.financialYear) return;
    setFyBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "init_accounts",
          label: data.financialYear.label,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed");
      setMsg(t("accounting.ledgersReady", { count: String(payload.count || 0) }));
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("common.submitFailed"));
    } finally {
      setFyBusy(false);
    }
  };

  const setFinancialYear = async (label: string) => {
    const existing = data?.allFinancialYears?.find((y) => y.label === label);
    const hasOtherData =
      (data?.financialYear?.label && data.financialYear.label !== label) ||
      false;

    await confirm({
      title: t("accounting.switchFyTitle"),
      message: t("accounting.switchFyBody", {
        year: label,
        hint: hasOtherData
          ? t("accounting.switchFyHint")
          : t("accounting.switchFyHintNew"),
      }),
      confirmLabel: t("accounting.setActiveFy"),
      variant: "warning",
      onConfirm: async () => {
        setFyBusy(true);
        setMsg(null);
        try {
          const res = await fetch("/api/accounting", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label, autoInitAccounts: true }),
          });
          const payload = await res.json();
          if (!res.ok) throw new Error(payload.error || "Failed");
          setMsg(
            payload.message ||
              t("accounting.fyActivated", { year: label }),
          );
          load();
        } catch (e) {
          setMsg(e instanceof Error ? e.message : t("common.submitFailed"));
        } finally {
          setFyBusy(false);
        }
      },
    });

    // silence unused if confirm cancels without using existing
    void existing;
  };

  const submitToCa = async () => {
    await confirm({
      title: t("accounting.submitToCa"),
      message: t("accounting.submitToCaConfirm"),
      confirmLabel: t("common.submit"),
      variant: "warning",
      onConfirm: async () => {
        setSubmitting(true);
        setMsg(null);
        try {
          const res = await fetch("/api/accounting/submit-audit", {
            method: "POST",
          });
          const payload = await res.json();
          if (!res.ok) throw new Error(payload.error || t("common.submitFailed"));
          setMsg(t("accounting.submittedToCa"));
          load();
        } catch (e) {
          setMsg(e instanceof Error ? e.message : t("common.submitFailed"));
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const fyAuditLabel = (status: string) => {
    const key = `auditStatus.${status}` as "auditStatus.open";
    const val = t(key);
    return val !== key ? val : status;
  };

  const voucherTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      receipt: t("accounting.voucherReceipt"),
      payment: t("accounting.voucherPayment"),
      journal: t("accounting.voucherJournal"),
      contra: t("accounting.voucherContra"),
    };
    return map[type] || type;
  };

  const fy = data?.financialYear;
  const fyLabel = fy?.label || t("accounting.fyNotSet");
  const canWrite = userRole === "school_admin" || userRole === "clerk";
  const fyLocked = Boolean(fy?.isLocked);
  const accountCount = fy?._count.accounts || 0;
  const voucherCount = fy?._count.vouchers || 0;
  const pendingAudit =
    data?.voucherStats?.find((s) => s.auditStatus === "pending")?._count || 0;
  const pendingFlagged = data?.pendingFlagged || 0;
  const totalVerified =
    data?.voucherStats
      ?.filter((s) => s.auditStatus === "verified")
      .reduce((a, s) => a + (s._sum.totalAmount || 0), 0) || 0;

  const step1Done = Boolean(fy);
  const step2Done = accountCount > 0;
  const step3Done = voucherCount > 0;
  const step4Done = voucherCount > 0; // reports available once vouchers exist
  const step5Done = ["submitted", "in_review", "verified"].includes(
    fy?.auditStatus || "",
  );
  const canSubmitCa =
    userRole === "school_admin" &&
    step2Done &&
    step3Done &&
    !fyLocked &&
    ["open", "pending", "returned"].includes(fy?.auditStatus || "open") &&
    pendingFlagged === 0;

  const flowSteps = useMemo(
    () => [
      {
        n: 1,
        title: t("accounting.flow1Title"),
        desc: t("accounting.flow1Desc"),
        done: step1Done,
        active: !step1Done,
      },
      {
        n: 2,
        title: t("accounting.flow2Title"),
        desc: t("accounting.flow2Desc"),
        done: step2Done,
        active: step1Done && !step2Done,
      },
      {
        n: 3,
        title: t("accounting.flow3Title"),
        desc: t("accounting.flow3Desc"),
        done: step3Done,
        active: step2Done && !step3Done,
      },
      {
        n: 4,
        title: t("accounting.flow4Title"),
        desc: t("accounting.flow4Desc"),
        done: step4Done && step3Done,
        active: step3Done && !step5Done,
      },
      {
        n: 5,
        title: t("accounting.flow5Title"),
        desc: t("accounting.flow5Desc"),
        done: step5Done,
        active: canSubmitCa,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step1Done, step2Done, step3Done, step4Done, step5Done, canSubmitCa, t],
  );

  if (loading) return <PageLoader />;

  return (
    <>
      <PageShell
        title={t("accounting.title")}
        subtitle={t("accounting.subtitle", { year: fyLabel })}
        icon={<Calculator className="h-6 w-6" />}
        accentColor="border-blue-500"
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("navExt.accounting") },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowHelp(true)}>
              <HelpCircle className="h-3.5 w-3.5" /> {t("accounting.howToUse")}
            </Button>
            {canWrite && !fyLocked && (
              <Link href="/accounting/vouchers/new">
                <Button size="sm" disabled={!step2Done}>
                  <Plus className="h-3.5 w-3.5" /> {t("accounting.newVoucher")}
                </Button>
              </Link>
            )}
          </>
        }
      >
        <div className="space-y-5">
          <InfoModal
            isOpen={showHelp}
            onClose={() => setShowHelp(false)}
            title={t("accounting.helpTitle")}
          >
            <AccountingHelpContent />
          </InfoModal>

          {msg && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              {msg}
            </div>
          )}

          {/* ── Easy flow guide ── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                  {t("accounting.flowEyebrow")}
                </p>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {t("accounting.flowTitle")}
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-600">
                  {t("accounting.flowIntro")}
                </p>
              </div>
              {fy && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                  <CalendarRange className="h-3.5 w-3.5" />
                  {t("accounting.activeFyBadge", { year: fy.label })}
                </span>
              )}
            </div>

            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {flowSteps.map((s) => (
                <li
                  key={s.n}
                  className={`rounded-xl border p-3 ${
                    s.done
                      ? "border-emerald-200 bg-emerald-50/80"
                      : s.active
                        ? "border-amber-300 bg-amber-50 ring-2 ring-amber-100"
                        : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${
                        s.done
                          ? "bg-emerald-600 text-white"
                          : s.active
                            ? "bg-amber-500 text-white"
                            : "bg-slate-300 text-white"
                      }`}
                    >
                      {s.done ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                    </span>
                    <strong className="text-sm text-slate-900">{s.title}</strong>
                  </div>
                  <p className="text-xs leading-snug text-slate-600">{s.desc}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* ── Step 1: FY picker ── */}
          {canWrite && (
            <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                    {t("accounting.flow1Title")}
                  </p>
                  <h3 className="mt-1 text-base font-bold text-blue-950">
                    {t("accounting.fyPickerTitle")}
                  </h3>
                  <p className="mt-1 max-w-xl text-sm text-blue-800/90">
                    {t("accounting.fyPickerDesc")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={newFy}
                    onChange={(e) => setNewFy(e.target.value)}
                    className="h-10 rounded-xl border border-blue-300 bg-white px-3 text-sm"
                    disabled={fyBusy}
                  >
                    {FINANCIAL_YEARS.map((y) => {
                      const row = data?.allFinancialYears?.find((f) => f.label === y);
                      const tag = row
                        ? ` · ${row.vouchers || 0} V / ${row.accounts || 0} A`
                        : "";
                      return (
                        <option key={y} value={y}>
                          {y}
                          {row?.isActive ? " ★" : ""}
                          {tag}
                        </option>
                      );
                    })}
                  </select>
                  <Button
                    size="sm"
                    onClick={() => void setFinancialYear(newFy)}
                    disabled={fyBusy || (fy?.label === newFy && accountCount > 0)}
                  >
                    {fyBusy ? t("common.saving") : t("accounting.setActiveFy")}
                  </Button>
                </div>
              </div>

              {data?.allFinancialYears && data.allFinancialYears.length > 0 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {data.allFinancialYears.map((y) => (
                    <button
                      key={y.id}
                      type="button"
                      onClick={() => {
                        setNewFy(y.label);
                        if (!y.isActive) void setFinancialYear(y.label);
                      }}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        y.isActive
                          ? "border-blue-500 bg-white shadow-sm ring-2 ring-blue-100"
                          : "border-blue-100 bg-white/70 hover:border-blue-300"
                      }`}
                    >
                      <p className="text-sm font-bold text-slate-900">
                        {y.label}
                        {y.isActive ? (
                          <span className="ml-2 text-[10px] font-bold uppercase text-blue-600">
                            {t("common.active")}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {t("accounting.fyDataCounts", {
                          vouchers: String(y.vouchers || 0),
                          accounts: String(y.accounts || 0),
                        })}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {!fy && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="font-medium">{t("accounting.fyNotConfigured")}</p>
              </div>
            </div>
          )}

          {/* ── Step 2: Ledgers ── */}
          {fy && accountCount === 0 && canWrite && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-950">
                      {t("accounting.coaNotInitTitle")}
                    </p>
                    <p className="mt-0.5 text-sm text-amber-800">
                      {t("accounting.coaNotInit", { year: fy.label })}
                    </p>
                  </div>
                </div>
                <Button onClick={() => void initAccounts()} size="sm" disabled={fyBusy}>
                  {t("accounting.initStandardAccounts")}
                </Button>
              </div>
            </div>
          )}

          {fy && accountCount > 0 && canWrite && !fyLocked && (
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {t("accounting.manageLedgers")}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t("accounting.manageLedgersDesc")}
                </p>
              </div>
              <AddLedgerAccount onAdded={load} />
            </div>
          )}

          {/* ── Step 5: Submit CA ── */}
          {fy && (
            <div
              className={`rounded-xl border p-5 ${
                step5Done
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50"
              }`}
            >
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600">
                    <Send className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-violet-900">
                      {t("accounting.flow5Title")} — {t("accounting.submitToCa")}
                    </p>
                    <p className="mt-0.5 text-sm text-violet-700">
                      {t("accounting.submitToCaEasy")}
                    </p>
                    <p className="mt-1 text-xs text-violet-600">
                      {t("caPortal.fyStatus")}:{" "}
                      <span className="font-semibold">
                        {fyAuditLabel(fy.auditStatus)}
                      </span>
                      {fy.isLocked ? ` · ${t("accounting.booksLocked")}` : ""}
                    </p>

                    {/* Checklist — why button is on / off */}
                    <ul className="mt-3 space-y-1.5 text-xs">
                      <li className="flex items-center gap-2">
                        {userRole === "school_admin" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        <span
                          className={
                            userRole === "school_admin"
                              ? "text-emerald-800"
                              : "font-medium text-amber-800"
                          }
                        >
                          {t("accounting.submitCheckAdmin")}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {step2Done ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        <span className={step2Done ? "text-emerald-800" : "text-slate-600"}>
                          {t("accounting.submitCheckLedgers", {
                            count: String(accountCount),
                          })}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {step3Done ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        <span className={step3Done ? "text-emerald-800" : "text-slate-600"}>
                          {t("accounting.submitCheckVouchers", {
                            count: String(voucherCount),
                          })}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {pendingFlagged === 0 ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                        )}
                        <span
                          className={
                            pendingFlagged === 0 ? "text-emerald-800" : "font-medium text-rose-700"
                          }
                        >
                          {pendingFlagged === 0
                            ? t("accounting.submitCheckNoFlags")
                            : t("accounting.submitNeedFixFlags", {
                                count: String(pendingFlagged),
                              })}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {!fyLocked &&
                        ["open", "pending", "returned"].includes(fy.auditStatus || "open") ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        <span
                          className={
                            !fyLocked &&
                            ["open", "pending", "returned"].includes(fy.auditStatus || "open")
                              ? "text-emerald-800"
                              : "font-medium text-amber-800"
                          }
                        >
                          {step5Done
                            ? t("accounting.submitCheckAlreadySent")
                            : fyLocked
                              ? t("accounting.booksLocked")
                              : t("accounting.submitCheckBooksOpen")}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
                  {userRole === "school_admin" ? (
                    <Button
                      onClick={() => void submitToCa()}
                      size="sm"
                      disabled={!canSubmitCa || submitting}
                      className={
                        canSubmitCa
                          ? "bg-violet-600 hover:bg-violet-700"
                          : undefined
                      }
                    >
                      <Send className="h-3.5 w-3.5" />
                      {submitting
                        ? t("common.saving")
                        : step5Done
                          ? t("accounting.submittedToCa")
                          : t("accounting.submitToCa")}
                    </Button>
                  ) : (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                      {t("accounting.submitOnlyAdmin")}
                    </p>
                  )}
                  {userRole === "school_admin" && !canSubmitCa && !step5Done && (
                    <p className="max-w-[220px] text-right text-[11px] text-violet-700">
                      {t("accounting.submitButtonWhenReady")}
                    </p>
                  )}
                  {userRole === "school_admin" && canSubmitCa && (
                    <p className="max-w-[220px] text-right text-[11px] font-medium text-emerald-700">
                      {t("accounting.submitButtonReady")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-md">
              <div className="mb-3 flex items-start justify-between">
                <p className="text-xs font-medium text-white/70">
                  {t("accounting.totalVouchers")}
                </p>
                <FileText className="h-4 w-4 text-white/80" />
              </div>
              <p className="text-3xl font-bold">{voucherCount}</p>
              <p className="mt-1 text-xs text-white/60">{t("accounting.statThisFy")}</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-md">
              <div className="mb-3 flex items-start justify-between">
                <p className="text-xs font-medium text-white/70">
                  {t("accounting.ledgerAccounts")}
                </p>
                <BookOpen className="h-4 w-4 text-white/80" />
              </div>
              <p className="text-3xl font-bold">{accountCount}</p>
              <p className="mt-1 text-xs text-white/60">
                {t("accounting.statChartOfAccounts")}
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-md">
              <div className="mb-3 flex items-start justify-between">
                <p className="text-xs font-medium text-white/70">
                  {t("accounting.pendingCaAudit")}
                </p>
                <Shield className="h-4 w-4 text-white/80" />
              </div>
              <p className="text-3xl font-bold">{pendingAudit}</p>
              <p className="mt-1 text-xs text-white/60">
                {t("accounting.statVouchersPending")}
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-md">
              <div className="mb-3 flex items-start justify-between">
                <p className="text-xs font-medium text-white/70">
                  {t("accounting.verifiedAmount")}
                </p>
                <IndianRupee className="h-4 w-4 text-white/80" />
              </div>
              <p className="text-xl font-bold leading-tight">
                {formatIndianCurrency(totalVerified)}
              </p>
              <p className="mt-1 text-xs text-white/60">
                {t("accounting.statVerifiedTotal")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                    <Calculator className="h-4 w-4 text-blue-600" />
                  </div>
                  <CardTitle>{t("accounting.quickLinks")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    href: "/accounting/vouchers",
                    label: t("accounting.voucherRegister"),
                    desc: t("accounting.voucherRegisterDesc"),
                    icon: FileText,
                    color: "blue",
                    writeOnly: false,
                  },
                  {
                    href: "/accounting/day-book",
                    label: t("accounting.dayBook"),
                    desc: t("accounting.dayBookDesc"),
                    icon: BookOpen,
                    color: "amber",
                    writeOnly: false,
                  },
                  {
                    href: "/accounting/vouchers/new",
                    label: t("accounting.createVoucher"),
                    desc: t("accounting.createVoucherDesc"),
                    icon: Plus,
                    color: "emerald",
                    writeOnly: true,
                  },
                  {
                    href: "/accounting/trial-balance",
                    label: t("accounting.trialBalance"),
                    desc: t("accounting.trialBalanceDesc"),
                    icon: TrendingUp,
                    color: "violet",
                    writeOnly: false,
                  },
                  {
                    href: "/accounting/reports",
                    label: t("accounting.financialReports"),
                    desc: t("accounting.financialReportsDesc"),
                    icon: Calculator,
                    color: "amber",
                    writeOnly: false,
                  },
                ]
                  .filter((item) => !(item.writeOnly && (!canWrite || fyLocked)))
                  .map((item) => {
                    const colorMap: Record<
                      string,
                      { bg: string; icon: string; border: string }
                    > = {
                      blue: {
                        bg: "bg-blue-50 hover:bg-blue-100 hover:border-blue-400",
                        icon: "bg-blue-100 text-blue-600",
                        border: "border-blue-200",
                      },
                      emerald: {
                        bg: "bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400",
                        icon: "bg-emerald-100 text-emerald-600",
                        border: "border-emerald-200",
                      },
                      violet: {
                        bg: "bg-violet-50 hover:bg-violet-100 hover:border-violet-400",
                        icon: "bg-violet-100 text-violet-600",
                        border: "border-violet-200",
                      },
                      amber: {
                        bg: "bg-amber-50 hover:bg-amber-100 hover:border-amber-400",
                        icon: "bg-amber-100 text-amber-600",
                        border: "border-amber-200",
                      },
                    };
                    const c = colorMap[item.color];
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={`group flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition-all ${c.bg} ${c.border}`}
                        >
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.icon}`}
                          >
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-slate-800">
                              {item.label}
                            </h3>
                            <p className="mt-0.5 text-xs leading-snug text-slate-500">
                              {item.desc}
                            </p>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-1" />
                        </div>
                      </Link>
                    );
                  })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                    <FileText className="h-4 w-4 text-violet-600" />
                  </div>
                  <CardTitle>{t("accounting.recentVouchers")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {data?.recentVouchers?.length ? (
                  <div className="space-y-2">
                    {data.recentVouchers.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 transition-colors hover:bg-slate-100"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {v.voucherNo}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {v.partyName || voucherTypeLabel(v.voucherType)}
                          </p>
                        </div>
                        <div className="ml-2 shrink-0 text-right">
                          <p className="text-sm font-bold text-slate-900">
                            {formatIndianCurrency(v.totalAmount)}
                          </p>
                          <Badge
                            status={
                              v.auditStatus === "verified" ? "verified" : "pending"
                            }
                          />
                        </div>
                      </div>
                    ))}
                    <Link href="/accounting/vouchers">
                      <Button variant="outline" size="sm" className="mt-2 w-full">
                        {t("accounting.viewAllVouchers")}{" "}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <Circle className="mb-2 h-8 w-8 opacity-40" />
                    <p className="text-sm">{t("accounting.noVouchersYet")}</p>
                    <p className="mt-1 px-4 text-center text-xs text-slate-400">
                      {t("accounting.emptyFyHint")}
                    </p>
                    <Link href="/accounting/vouchers/new" className="mt-3">
                      <Button size="sm" disabled={!canWrite || fyLocked || !step2Done}>
                        <Plus className="h-3.5 w-3.5" />{" "}
                        {t("accounting.createFirstVoucher")}
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageShell>
      <ConfirmDialog />
    </>
  );
}
