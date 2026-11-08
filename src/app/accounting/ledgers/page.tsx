"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { InfoModal } from "@/components/ui/info-modal";
import { AccountingNav } from "@/components/accounting/accounting-nav";
import { AddLedgerAccount } from "@/components/accounting/add-ledger-account";
import { BookOpen, Pencil, Search, Trash2 } from "lucide-react";
import {
  ACCOUNT_GROUPS,
  formatIndianCurrency,
  getGroupBalanceType,
} from "@/lib/accounting";
import { useT } from "@/i18n/locale-provider";
import { useConfirm } from "@/hooks/use-confirm";
import { toast } from "@/components/ui/toast";

type Ledger = {
  id: string;
  code: string;
  name: string;
  groupType: string;
  accountType: string;
  balanceType: string;
  openingBalance: number;
  lineCount: number;
  yearDebit: number;
  yearCredit: number;
  closingDebit: number;
  closingCredit: number;
};

type StatementLine = {
  id: string;
  voucherId: string;
  voucherNo: string;
  voucherDate: string;
  voucherType: string;
  partyName: string | null;
  narration: string | null;
  debit: number;
  credit: number;
  balance: number;
  balanceSide: "debit" | "credit";
};

type EditForm = {
  id: string;
  name: string;
  code: string;
  groupType: string;
  openingBalance: string;
  balanceType: string;
};

const GROUP_ORDER = ["assets", "liabilities", "capital", "income", "expenses"] as const;

function sideLabel(debit: number, credit: number, dr: string, cr: string) {
  if (debit > 0.004) return `${formatIndianCurrency(debit)} ${dr}`;
  if (credit > 0.004) return `${formatIndianCurrency(credit)} ${cr}`;
  return "—";
}

export default function LedgersPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const { confirm, ConfirmDialog } = useConfirm();
  const [accounts, setAccounts] = useState<Ledger[]>([]);
  const [fyLabel, setFyLabel] = useState("");
  const [fyIdReady, setFyIdReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [statementId, setStatementId] = useState<string | null>(null);
  const [statement, setStatement] = useState<{
    name: string;
    openingDebit: number;
    openingCredit: number;
    lines: StatementLine[];
  } | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);

  const dr = t("accounting.sideDr");
  const cr = t("accounting.sideCr");

  const load = () => {
    setLoading(true);
    fetch("/api/accounting/accounts")
      .then((r) => r.json())
      .then((d) => {
        setAccounts(d.accounts || []);
        setFyLabel(d.financialYear?.label || "");
        setFyIdReady(Boolean(d.financialYear));
        setLocked(Boolean(d.financialYear?.isLocked));
        setCanWrite(Boolean(d.canWrite));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

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

  const groupHelp = (type: string) => {
    const map: Record<string, string> = {
      assets: t("accounting.groupHelpAssets"),
      liabilities: t("accounting.groupHelpLiabilities"),
      capital: t("accounting.groupHelpCapital"),
      income: t("accounting.groupHelpIncome"),
      expenses: t("accounting.groupHelpExpenses"),
    };
    return map[type] || "";
  };

  const apiError = (data: { code?: string; error?: string }) => {
    const map: Record<string, string> = {
      HAS_VOUCHERS: t("accounting.deleteLedgerHasVouchers"),
      DUPLICATE_NAME: t("accounting.accountNameTaken"),
      DUPLICATE_CODE: t("accounting.accountCodeTaken"),
      FY_LOCKED: t("accounting.booksLocked"),
      BAD_OPENING: t("accounting.badOpening"),
      NAME_REQUIRED: t("accounting.accountNameRequired"),
    };
    return (data.code && map[data.code]) || data.error || t("common.error");
  };

  const openEdit = (acc: Ledger) => {
    setFormError("");
    setEditing({
      id: acc.id,
      name: acc.name,
      code: acc.code,
      groupType: acc.groupType,
      openingBalance: acc.openingBalance ? String(acc.openingBalance) : "",
      balanceType: acc.balanceType === "credit" ? "credit" : "debit",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      setFormError(t("accounting.accountNameRequired"));
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch(`/api/accounting/accounts/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name.trim(),
          code: editing.code.trim(),
          groupType: editing.groupType,
          openingBalance: editing.openingBalance === "" ? 0 : Number(editing.openingBalance),
          balanceType: editing.balanceType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiError(data));
      toast.success(t("accounting.ledgerSaved"));
      setEditing(null);
      load();
      if (statementId === editing.id) void loadStatement(editing.id);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const deleteLedger = async (acc: Ledger) => {
    await confirm({
      title: t("accounting.deleteLedgerTitle"),
      message: t("accounting.deleteLedgerMessage", { name: `${acc.code} ${acc.name}` }),
      confirmLabel: t("common.delete"),
      variant: "destructive",
      onConfirm: async () => {
        const res = await fetch(`/api/accounting/accounts/${acc.id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(apiError(data));
        toast.success(t("accounting.ledgerDeleted"));
        if (statementId === acc.id) {
          setStatementId(null);
          setStatement(null);
        }
        load();
      },
    });
  };

  const loadStatement = async (id: string) => {
    setStatementId(id);
    setStatementLoading(true);
    try {
      const res = await fetch(`/api/accounting/accounts/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.error"));
      setStatement({
        name: data.account?.name || "",
        openingDebit: data.openingDebit || 0,
        openingCredit: data.openingCredit || 0,
        lines: data.lines || [],
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
      setStatement(null);
    } finally {
      setStatementLoading(false);
    }
  };

  useEffect(() => {
    const id = searchParams.get("account");
    if (id) void loadStatement(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q),
    );
  }, [accounts, query]);

  const opening = useMemo(() => {
    let debit = 0;
    let credit = 0;
    let withAmount = 0;
    for (const a of accounts) {
      if (a.openingBalance > 0) {
        withAmount += 1;
        if (a.balanceType === "credit") credit += a.openingBalance;
        else debit += a.openingBalance;
      }
    }
    return { debit, credit, withAmount, gap: debit - credit };
  }, [accounts]);

  const initAccounts = async () => {
    if (!fyLabel) return;
    const res = await fetch("/api/accounting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "init_accounts", label: fyLabel }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || t("common.error"));
      return;
    }
    toast.success(t("accounting.ledgersReady", { count: String(data.count || 0) }));
    load();
  };

  if (loading) return <PageLoader />;

  const gapSide =
    opening.gap > 0.5 ? t("accounting.openingSideCredit") : t("accounting.openingSideDebit");

  return (
    <>
      <PageShell
        title={t("accounting.ledgersPageTitle")}
        subtitle={
          fyLabel
            ? t("accounting.ledgersPageSubtitleYear", { year: fyLabel })
            : t("accounting.ledgersPageSubtitle")
        }
        icon={<BookOpen className="h-6 w-6" />}
        accentColor="border-emerald-500"
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("navExt.accounting"), href: "/accounting" },
          { label: t("accounting.ledgersPageTitle") },
        ]}
        actions={canWrite && !locked ? <AddLedgerAccount onAdded={load} /> : null}
      >
        <div className="space-y-4">
          <AccountingNav current="ledgers" />

          {!fyIdReady && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t("accounting.fyNotConfigured")}{" "}
              <Link href="/accounting" className="font-semibold underline">
                {t("accounting.title")}
              </Link>
            </div>
          )}

          {fyIdReady && accounts.length === 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
              <p className="font-semibold text-amber-950">{t("accounting.noLedgersYet")}</p>
              {canWrite && (
                <Button className="mt-3" size="sm" onClick={() => void initAccounts()}>
                  {t("accounting.initStandardAccounts")}
                </Button>
              )}
            </div>
          )}

          {accounts.length > 0 && (
            <>
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                  {t("accounting.openingTitle")}
                </p>
                <p className="mt-1 max-w-3xl text-sm text-amber-950">{t("accounting.openingDesc")}</p>
                <p className="mt-2 max-w-3xl text-sm font-medium text-amber-900">
                  {t("accounting.openingExample")}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">{t("accounting.openingDr")}</p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatIndianCurrency(opening.debit)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">{t("accounting.openingCr")}</p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatIndianCurrency(opening.credit)}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl px-4 py-3 ${
                      Math.abs(opening.gap) < 0.5 ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                    }`}
                  >
                    <p className="text-xs text-white/80">
                      {opening.withAmount === 0
                        ? t("accounting.openingNone")
                        : Math.abs(opening.gap) < 0.5
                          ? t("accounting.openingOk")
                          : t("accounting.openingGap", {
                              side: gapSide,
                              amount: formatIndianCurrency(Math.abs(opening.gap)),
                            })}
                    </p>
                  </div>
                </div>
              </section>

              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("accounting.searchLedgers")}
                />
              </div>

              {statementId && (
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {t("accounting.statementTitle", { name: statement?.name || "…" })}
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatementId(null);
                        setStatement(null);
                      }}
                    >
                      {t("accounting.hideStatement")}
                    </Button>
                  </div>
                  {statementLoading || !statement ? (
                    <p className="text-sm text-slate-500">{t("common.loading")}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-slate-500">
                            <th className="py-2 pr-3 font-medium">{t("accounting.date")}</th>
                            <th className="py-2 pr-3 font-medium">{t("accounting.voucherNo")}</th>
                            <th className="py-2 pr-3 font-medium">{t("accounting.narration")}</th>
                            <th className="py-2 pr-3 text-right font-medium">{t("accounting.debit")}</th>
                            <th className="py-2 pr-3 text-right font-medium">{t("accounting.credit")}</th>
                            <th className="py-2 text-right font-medium">{t("accounting.running")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b bg-amber-50/70">
                            <td className="py-2 pr-3 text-slate-500">—</td>
                            <td className="py-2 pr-3 font-medium">{t("accounting.statementOpening")}</td>
                            <td className="py-2 pr-3 text-slate-600">{t("accounting.openingTitle")}</td>
                            <td className="py-2 pr-3 text-right">
                              {statement.openingDebit ? formatIndianCurrency(statement.openingDebit) : "—"}
                            </td>
                            <td className="py-2 pr-3 text-right">
                              {statement.openingCredit ? formatIndianCurrency(statement.openingCredit) : "—"}
                            </td>
                            <td className="py-2 text-right font-semibold">
                              {sideLabel(statement.openingDebit, statement.openingCredit, dr, cr)}
                            </td>
                          </tr>
                          {statement.lines.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-4 text-slate-500">
                                {t("accounting.statementEmpty")}
                              </td>
                            </tr>
                          )}
                          {statement.lines.map((line) => (
                            <tr key={line.id} className="border-b border-slate-100">
                              <td className="py-2 pr-3 text-slate-600">
                                {String(line.voucherDate).slice(0, 10)}
                              </td>
                              <td className="py-2 pr-3">
                                <Link
                                  href={`/accounting/vouchers/${line.voucherId}`}
                                  className="font-semibold text-blue-700 hover:underline"
                                >
                                  {line.voucherNo}
                                </Link>
                              </td>
                              <td className="max-w-[240px] truncate py-2 pr-3 text-slate-700">
                                {line.partyName || line.narration || "—"}
                              </td>
                              <td className="py-2 pr-3 text-right">
                                {line.debit ? formatIndianCurrency(line.debit) : "—"}
                              </td>
                              <td className="py-2 pr-3 text-right">
                                {line.credit ? formatIndianCurrency(line.credit) : "—"}
                              </td>
                              <td className="py-2 text-right font-semibold">
                                {formatIndianCurrency(line.balance)}{" "}
                                {line.balanceSide === "credit" ? cr : dr}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {filtered.length === 0 && (
                <p className="text-sm text-slate-500">{t("accounting.noLedgersMatch")}</p>
              )}

              {GROUP_ORDER.map((group) => {
                const rows = filtered.filter((a) => a.groupType === group);
                if (!rows.length) return null;
                return (
                  <section key={group} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <h2 className="text-sm font-bold text-slate-900">{groupLabel(group)}</h2>
                      <p className="mt-0.5 text-xs text-slate-500">{groupHelp(group)}</p>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {rows.map((acc) => {
                        const needsOpening =
                          (acc.accountType === "cash" || /cash in hand/i.test(acc.name)) &&
                          acc.openingBalance <= 0;
                        const active = statementId === acc.id;
                        return (
                          <li
                            key={acc.id}
                            className={`px-4 py-3 ${needsOpening ? "bg-amber-50/80" : ""} ${
                              active ? "ring-2 ring-inset ring-blue-200" : ""
                            }`}
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900">
                                  <span className="mr-2 font-mono text-xs text-slate-500">{acc.code}</span>
                                  {acc.name}
                                </p>
                                <p className="mt-1 text-xs text-slate-600">
                                  {t("accounting.openingAmount")}:{" "}
                                  <span className="font-semibold text-slate-800">
                                    {sideLabel(
                                      acc.balanceType === "credit" ? 0 : acc.openingBalance,
                                      acc.balanceType === "credit" ? acc.openingBalance : 0,
                                      dr,
                                      cr,
                                    )}
                                  </span>
                                  {" · "}
                                  {t("accounting.thisYearDr")} {formatIndianCurrency(acc.yearDebit)}
                                  {" · "}
                                  {t("accounting.thisYearCr")} {formatIndianCurrency(acc.yearCredit)}
                                  {" · "}
                                  {t("accounting.balanceNow")}{" "}
                                  <span className="font-semibold">
                                    {sideLabel(acc.closingDebit, acc.closingCredit, dr, cr)}
                                  </span>
                                  {" · "}
                                  {t("accounting.lineCount", { count: String(acc.lineCount) })}
                                </p>
                                {needsOpening && (
                                  <p className="mt-1 text-xs font-medium text-amber-800">
                                    {t("accounting.cashOpeningCta")}
                                  </p>
                                )}
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void loadStatement(acc.id)}
                                >
                                  {t("accounting.viewStatement")}
                                </Button>
                                {canWrite && (
                                  <Button variant="outline" size="sm" onClick={() => openEdit(acc)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                    {needsOpening ? t("accounting.homeOpeningOpen") : t("accounting.editLedger")}
                                  </Button>
                                )}
                                {canWrite && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void deleteLedger(acc)}
                                    title={t("common.delete")}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </>
          )}
        </div>
      </PageShell>

      <InfoModal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={t("accounting.editLedger")}
        size="wide"
      >
        {editing && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{t("accounting.openingHintPlain")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">{t("accounting.group")}</label>
                <Select
                  value={editing.groupType}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      groupType: e.target.value,
                      balanceType: getGroupBalanceType(e.target.value),
                    })
                  }
                  options={ACCOUNT_GROUPS.map((g) => ({ value: g.value, label: groupLabel(g.value) }))}
                  hideEmptyOption
                />
                <p className="mt-1 text-xs text-slate-500">{t("accounting.groupHint")}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t("accounting.code")}</label>
                <Input
                  className="mt-1"
                  value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">{t("accounting.accountName")}</label>
              <Input
                className="mt-1"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">{t("accounting.openingAmount")}</label>
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  step="0.01"
                  value={editing.openingBalance}
                  onChange={(e) => setEditing({ ...editing, openingBalance: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t("accounting.openingSide")}</label>
                <Select
                  value={editing.balanceType}
                  onChange={(e) => setEditing({ ...editing, balanceType: e.target.value })}
                  options={[
                    { value: "debit", label: t("accounting.debit") },
                    { value: "credit", label: t("accounting.credit") },
                  ]}
                  hideEmptyOption
                />
                <p className="mt-1 text-xs text-slate-500">
                  {editing.balanceType === "credit"
                    ? t("accounting.openingSideHintCredit")
                    : t("accounting.openingSideHintAssets")}
                </p>
              </div>
            </div>
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                {t("common.cancel")}
              </Button>
              <Button onClick={() => void saveEdit()} disabled={saving}>
                {saving ? t("common.saving") : t("accounting.saveLedger")}
              </Button>
            </div>
          </div>
        )}
      </InfoModal>
      <ConfirmDialog />
    </>
  );
}
