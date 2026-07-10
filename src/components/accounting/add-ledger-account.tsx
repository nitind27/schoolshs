"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { InfoModal } from "@/components/ui/info-modal";
import { Plus, Building2, Receipt, BookOpen } from "lucide-react";
import {
  ACCOUNT_GROUPS,
  INDIAN_BANK_TEMPLATES,
  COMMON_SCHOOL_EXPENSE_TEMPLATES,
} from "@/lib/accounting";
import { useT } from "@/i18n/locale-provider";

interface AddLedgerAccountProps {
  onAdded?: () => void;
  /** sm = voucher header; default = accounting pages */
  size?: "sm" | "default";
}

const EMPTY_FORM = { groupType: "expenses", name: "", code: "", template: "" };

export function AddLedgerAccount({ onAdded, size = "default" }: AddLedgerAccountProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const groupOptions = ACCOUNT_GROUPS.map((g) => {
    const keyMap: Record<string, string> = {
      assets: t("accounting.groupAssets"),
      liabilities: t("accounting.groupLiabilities"),
      income: t("accounting.groupIncome"),
      expenses: t("accounting.groupExpenses"),
      capital: t("accounting.groupCapital"),
    };
    return { value: g.value, label: keyMap[g.value] || g.label };
  });

  const bankOptions = INDIAN_BANK_TEMPLATES.map((b) => ({ value: b, label: b }));
  const expenseOptions = COMMON_SCHOOL_EXPENSE_TEMPLATES.map((e) => ({ value: e, label: e }));

  const close = () => {
    setOpen(false);
    setError("");
    setForm(EMPTY_FORM);
  };

  const applyTemplate = (name: string, groupType: string) => {
    setForm((f) => ({ ...f, name, groupType, template: name, code: "" }));
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setError(t("accounting.accountNameRequired"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/accounting/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          groupType: form.groupType,
          code: form.code.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.error"));
      close();
      onAdded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size === "sm" ? "sm" : "default"}
        onClick={() => setOpen(true)}
        className={size === "sm" ? "shrink-0" : ""}
      >
        <Plus className="h-3.5 w-3.5" />
        {t("accounting.addLedgerAccount")}
      </Button>

      <InfoModal
        isOpen={open}
        onClose={close}
        title={t("accounting.addLedgerAccount")}
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600 -mt-1">{t("accounting.addLedgerAccountDesc")}</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                {t("accounting.indianBanks")}
              </p>
              <Select
                value={form.groupType === "assets" ? form.template : ""}
                onChange={(e) => applyTemplate(e.target.value, "assets")}
                options={bankOptions}
                emptyLabel={t("accounting.pickBank")}
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                {t("accounting.smallExpenses")}
              </p>
              <Select
                value={form.groupType === "expenses" ? form.template : ""}
                onChange={(e) => applyTemplate(e.target.value, "expenses")}
                options={expenseOptions}
                emptyLabel={t("accounting.pickExpense")}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-4 bg-white">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              {t("accounting.customLedgerDetails")}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">{t("accounting.group")}</label>
                <Select
                  value={form.groupType}
                  onChange={(e) => setForm({ ...form, groupType: e.target.value, template: "" })}
                  options={groupOptions}
                  emptyLabel=""
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {t("accounting.code")} <span className="text-slate-400 font-normal">({t("common.optional")})</span>
                </label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder={t("accounting.autoCodeHint")}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">{t("accounting.accountName")} *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, template: "" })}
                placeholder={t("accounting.customAccountPlaceholder")}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1.5">{t("accounting.customAccountHint")}</p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={close} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={submit} disabled={loading}>
              {loading ? t("accounting.saving") : t("accounting.addAccountBtn")}
            </Button>
          </div>
        </div>
      </InfoModal>
    </>
  );
}
