"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Languages, Plus, Trash2 } from "lucide-react";
import { VOUCHER_TYPES, PAYMENT_MODES } from "@/lib/accounting";
import { useT } from "@/i18n/locale-provider";
import { AddLedgerAccount } from "@/components/accounting/add-ledger-account";
import { toast } from "@/components/ui/toast";

interface Account {
  id: string;
  code: string;
  name: string;
}

interface Line {
  accountId: string;
  debit: number;
  credit: number;
  description: string;
}

export type VoucherFormValue = {
  voucherNo?: string;
  voucherType: string;
  voucherDate: string;
  narration: string;
  partyName: string;
  paymentMode: string;
  referenceNo: string;
  chequeNo: string;
  bankName: string;
  billNo: string;
  billDate: string;
  gstin: string;
  auditStatus?: string | null;
  lines: Line[];
};

function isoDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const raw = typeof value === "string" ? value : value.toISOString();
  return raw.slice(0, 10);
}

export function VoucherForm({
  mode,
  voucherId,
  initial,
  locked = false,
  fyLabel = "",
  readOnly = false,
}: {
  mode: "create" | "edit";
  voucherId?: string;
  initial?: Partial<VoucherFormValue>;
  locked?: boolean;
  fyLabel?: string;
  readOnly?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const disabled = locked || readOnly;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [form, setForm] = useState({
    voucherType: initial?.voucherType || "receipt",
    voucherDate: isoDate(initial?.voucherDate) || new Date().toISOString().slice(0, 10),
    narration: initial?.narration || "",
    partyName: initial?.partyName || "",
    paymentMode: initial?.paymentMode || "Cash",
    referenceNo: initial?.referenceNo || "",
    chequeNo: initial?.chequeNo || "",
    bankName: initial?.bankName || "",
    billNo: initial?.billNo || "",
    billDate: isoDate(initial?.billDate),
    gstin: initial?.gstin || "",
  });
  const [lines, setLines] = useState<Line[]>(
    initial?.lines?.length
      ? initial.lines.map((line) => ({
          accountId: line.accountId,
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          description: line.description || "",
        }))
      : [
          { accountId: "", debit: 0, credit: 0, description: "" },
          { accountId: "", debit: 0, credit: 0, description: "" },
        ],
  );

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = () => {
    fetch("/api/accounting/accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts || []));
  };

  const translatingRef = useRef(false);

  const translateNarration = async (opts?: { quiet?: boolean; text?: string }) => {
    const text = (opts?.text ?? form.narration).trim();
    if (!text || translatingRef.current) return;
    translatingRef.current = true;
    setTranslating(true);
    try {
      const res = await fetch("/api/gujarati/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode: "text" }),
      });
      const data = (await res.json()) as { gujarati?: string; error?: string };
      const gujarati = String(data.gujarati || "").trim();
      const unchanged = gujarati.toLowerCase() === text.toLowerCase();
      if (!res.ok || !gujarati || (unchanged && /[A-Za-z]/.test(text))) {
        throw new Error(data.error || t("accounting.translateFailed"));
      }
      if (!unchanged) {
        setForm((current) =>
          current.narration.trim() === text ? { ...current, narration: gujarati } : current,
        );
        if (!opts?.quiet) toast.success(t("accounting.translateDone"));
      }
    } catch (e) {
      if (!opts?.quiet) {
        toast.error(e instanceof Error ? e.message : t("accounting.translateFailed"));
      }
    } finally {
      translatingRef.current = false;
      setTranslating(false);
    }
  };

  const paymentModeOptions = PAYMENT_MODES.map((mode) => {
    const labels: Record<string, string> = {
      Cash: t("accounting.payCash"),
      Cheque: t("accounting.payCheque"),
      "NEFT/RTGS": t("accounting.payNeft"),
      UPI: t("accounting.payUpi"),
      DD: t("accounting.payDd"),
      Online: t("accounting.payOnline"),
    };
    return { value: mode, label: labels[mode] || mode };
  });

  const voucherTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      receipt: t("accounting.voucherReceipt"),
      payment: t("accounting.voucherPayment"),
      journal: t("accounting.voucherJournal"),
      contra: t("accounting.voucherContra"),
    };
    return map[type] || type;
  };

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;
  const linesValid = lines.every(
    (l) => l.accountId && ((l.debit > 0 && !l.credit) || (l.credit > 0 && !l.debit)),
  );

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => {
      const n = [...prev];
      n[i] = { ...n[i], ...patch };
      if (patch.debit != null && patch.debit > 0) n[i].credit = 0;
      if (patch.credit != null && patch.credit > 0) n[i].debit = 0;
      return n;
    });
  };

  const submit = async () => {
    setError(null);
    if (disabled) {
      setError(t("accounting.fyLockedNoVoucher"));
      return;
    }
    if (!balanced || !linesValid) {
      setError(t("accounting.voucherValidation"));
      return;
    }
    setLoading(true);
    try {
      const url =
        mode === "edit" && voucherId
          ? `/api/accounting/vouchers/${voucherId}`
          : "/api/accounting/vouchers";
      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, lines }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("accounting.voucherSaveFailed"));
        return;
      }
      toast.success(
        mode === "edit" ? t("accounting.voucherUpdated") : t("accounting.voucherCreated"),
      );
      router.push("/accounting/vouchers");
      router.refresh();
    } catch {
      setError(t("accounting.voucherSaveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/accounting/vouchers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {mode === "edit"
              ? t("accounting.editVoucherTitle", {
                  no: initial?.voucherNo || "",
                })
              : t("accounting.createVoucherTitle")}
          </h1>
          <p className="text-slate-500">
            {t("accounting.doubleEntryNote")}
            {fyLabel ? ` · FY ${fyLabel}` : ""}
            {initial?.voucherNo && mode === "edit" ? ` · ${initial.voucherNo}` : ""}
          </p>
        </div>
      </div>

      {locked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("accounting.fyLockedNoEdit")}
        </div>
      )}

      {mode === "edit" && initial?.auditStatus && initial.auditStatus !== "pending" && !disabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("accounting.editResetsAudit")}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("accounting.voucherDetails")}</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">{t("accounting.voucherType")}</label>
            <Select
              value={form.voucherType}
              onChange={(e) => setForm({ ...form, voucherType: e.target.value })}
              options={VOUCHER_TYPES.map((v) => ({
                value: v.value,
                label: voucherTypeLabel(v.value),
              }))}
              hideEmptyOption
              disabled={disabled}
            />
          </div>
          <DateField
            label={t("accounting.date")}
            value={form.voucherDate}
            onChange={(v) => setForm({ ...form, voucherDate: v })}
            outputFormat="iso"
            showHint={false}
            disabled={disabled}
          />
          <div>
            <label className="text-sm font-medium">{t("accounting.partyName")}</label>
            <Input
              value={form.partyName}
              onChange={(e) => setForm({ ...form, partyName: e.target.value })}
              placeholder={t("accounting.partyPlaceholder")}
              disabled={disabled}
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("accounting.paymentMode")}</label>
            <Select
              value={form.paymentMode}
              onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
              options={paymentModeOptions}
              hideEmptyOption
              disabled={disabled}
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("accounting.billNo")}</label>
            <Input
              value={form.billNo}
              onChange={(e) => setForm({ ...form, billNo: e.target.value })}
              disabled={disabled}
            />
          </div>
          <DateField
            label={t("accounting.billDate")}
            value={form.billDate}
            onChange={(v) => setForm({ ...form, billDate: v })}
            outputFormat="iso"
            showHint={false}
            disabled={disabled}
          />
          <div>
            <label className="text-sm font-medium">{t("accounting.chequeRefNo")}</label>
            <Input
              value={form.chequeNo || form.referenceNo}
              onChange={(e) =>
                setForm({
                  ...form,
                  chequeNo: e.target.value,
                  referenceNo: e.target.value,
                })
              }
              disabled={disabled}
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("accounting.gstin")}</label>
            <Input
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="sm:col-span-2">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium">{t("accounting.narration")}</label>
              {!disabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={translating || !form.narration.trim()}
                  onClick={() => void translateNarration()}
                >
                  <Languages className="h-3.5 w-3.5" />
                  {translating ? t("accounting.translating") : t("accounting.translateToGujarati")}
                </Button>
              )}
            </div>
            <Textarea
              value={form.narration}
              onChange={(e) => setForm({ ...form, narration: e.target.value })}
              onBlur={(e) => {
                const text = e.currentTarget.value;
                if (disabled || !/[A-Za-z]/.test(text)) return;
                void translateNarration({ quiet: true, text });
              }}
              placeholder={t("accounting.narrationPlaceholder")}
              disabled={disabled}
            />
            {!disabled && (
              <p className="mt-1 text-xs text-slate-500">{t("accounting.translateHint")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("accounting.ledgerEntries")}</CardTitle>
          {!disabled && (
            <div className="flex gap-2">
              <AddLedgerAccount size="sm" onAdded={loadAccounts} />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setLines([...lines, { accountId: "", debit: 0, credit: 0, description: "" }])
                }
              >
                <Plus className="h-4 w-4" /> {t("accounting.addLine")}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">
            <Link href="/accounting/ledgers" className="font-semibold text-blue-700 underline">
              {t("accounting.manageLedgersLink")}
            </Link>
            {" — "}
            {t("accounting.manageAccountsHint")}
          </p>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <Select
                  value={line.accountId}
                  onChange={(e) => updateLine(i, { accountId: e.target.value })}
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: `${a.code} — ${a.name}`,
                  }))}
                  emptyLabel={t("accounting.selectAccount")}
                  disabled={disabled}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder={t("accounting.debit")}
                  value={line.debit || ""}
                  onChange={(e) => updateLine(i, { debit: Number(e.target.value) || 0 })}
                  disabled={disabled}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder={t("accounting.credit")}
                  value={line.credit || ""}
                  onChange={(e) => updateLine(i, { credit: Number(e.target.value) || 0 })}
                  disabled={disabled}
                />
              </div>
              <div className="col-span-2">
                <Input
                  placeholder={t("accounting.desc")}
                  value={line.description}
                  onChange={(e) => updateLine(i, { description: e.target.value })}
                  disabled={disabled}
                />
              </div>
              <div className="col-span-1">
                {!disabled && lines.length > 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLines(lines.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap justify-between gap-2 pt-4 border-t font-semibold">
            <span>
              {t("accounting.totalDebit")}: ₹{totalDebit.toFixed(2)}
            </span>
            <span>
              {t("accounting.totalCredit")}: ₹{totalCredit.toFixed(2)}
            </span>
            <span className={balanced ? "text-emerald-600" : "text-red-600"}>
              {balanced ? `✓ ${t("accounting.balanced")}` : `✗ ${t("accounting.notBalanced")}`}
            </span>
          </div>
        </CardContent>
      </Card>

      {!disabled && (
        <Button
          onClick={() => void submit()}
          disabled={!balanced || !linesValid || loading}
          className="w-full h-12"
        >
          {loading
            ? t("accounting.saving")
            : mode === "edit"
              ? t("accounting.saveVoucherChanges")
              : t("accounting.postVoucher")}
        </Button>
      )}
    </div>
  );
}
