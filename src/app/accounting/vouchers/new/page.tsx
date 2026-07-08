"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { VOUCHER_TYPES, PAYMENT_MODES } from "@/lib/accounting";
import { useT } from "@/i18n/locale-provider";

interface Account { id: string; code: string; name: string }
interface Line { accountId: string; debit: number; credit: number; description: string }

export default function NewVoucherPage() {
  const t = useT();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    voucherType: "receipt",
    voucherDate: new Date().toISOString().slice(0, 10),
    narration: "",
    partyName: "",
    paymentMode: "Cash",
    referenceNo: "",
    chequeNo: "",
    bankName: "",
    billNo: "",
    billDate: "",
    gstin: "",
  });
  const [lines, setLines] = useState<Line[]>([
    { accountId: "", debit: 0, credit: 0, description: "" },
    { accountId: "", debit: 0, credit: 0, description: "" },
  ]);

  useEffect(() => {
    fetch("/api/accounting/trial-balance").then((r) => r.json()).then((d) => setAccounts(d.accounts || []));
  }, []);

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

  const submit = async () => {
    if (!balanced) return;
    setLoading(true);
    const res = await fetch("/api/accounting/vouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, lines }),
    });
    if (res.ok) router.push("/accounting/vouchers");
    else setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/accounting/vouchers"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{t("accounting.createVoucherTitle")}</h1>
          <p className="text-slate-500">{t("accounting.doubleEntryNote")}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("accounting.voucherDetails")}</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">{t("accounting.voucherType")}</label>
            <Select
              value={form.voucherType}
              onChange={(e) => setForm({ ...form, voucherType: e.target.value })}
              options={VOUCHER_TYPES.map((v) => ({ value: v.value, label: voucherTypeLabel(v.value) }))}
              emptyLabel=""
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("accounting.date")}</label>
            <Input type="date" value={form.voucherDate} onChange={(e) => setForm({ ...form, voucherDate: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">{t("accounting.partyName")}</label>
            <Input value={form.partyName} onChange={(e) => setForm({ ...form, partyName: e.target.value })} placeholder={t("accounting.partyPlaceholder")} />
          </div>
          <div>
            <label className="text-sm font-medium">{t("accounting.paymentMode")}</label>
            <Select
              value={form.paymentMode}
              onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
              options={[...PAYMENT_MODES]}
              emptyLabel=""
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("accounting.billNo")}</label>
            <Input value={form.billNo} onChange={(e) => setForm({ ...form, billNo: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">{t("accounting.billDate")}</label>
            <Input type="date" value={form.billDate} onChange={(e) => setForm({ ...form, billDate: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">{t("accounting.chequeRefNo")}</label>
            <Input value={form.chequeNo || form.referenceNo} onChange={(e) => setForm({ ...form, chequeNo: e.target.value, referenceNo: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">{t("accounting.gstin")}</label>
            <Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">{t("accounting.narration")}</label>
            <Textarea value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })} placeholder={t("accounting.narrationPlaceholder")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("accounting.ledgerEntries")}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setLines([...lines, { accountId: "", debit: 0, credit: 0, description: "" }])}>
            <Plus className="h-4 w-4" /> {t("accounting.addLine")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <Select
                  value={line.accountId}
                  onChange={(e) => { const n = [...lines]; n[i].accountId = e.target.value; setLines(n); }}
                  options={accounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                  emptyLabel={t("accounting.selectAccount")}
                />
              </div>
              <div className="col-span-2">
                <Input type="number" placeholder={t("accounting.debit")} value={line.debit || ""} onChange={(e) => { const n = [...lines]; n[i].debit = Number(e.target.value); setLines(n); }} />
              </div>
              <div className="col-span-2">
                <Input type="number" placeholder={t("accounting.credit")} value={line.credit || ""} onChange={(e) => { const n = [...lines]; n[i].credit = Number(e.target.value); setLines(n); }} />
              </div>
              <div className="col-span-2">
                <Input placeholder={t("accounting.desc")} value={line.description} onChange={(e) => { const n = [...lines]; n[i].description = e.target.value; setLines(n); }} />
              </div>
              <div className="col-span-1">
                {lines.length > 2 && (
                  <Button variant="outline" size="sm" onClick={() => setLines(lines.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-between pt-4 border-t font-semibold">
            <span>{t("accounting.totalDebit")}: ₹{totalDebit.toFixed(2)}</span>
            <span>{t("accounting.totalCredit")}: ₹{totalCredit.toFixed(2)}</span>
            <span className={balanced ? "text-emerald-600" : "text-red-600"}>{balanced ? `✓ ${t("accounting.balanced")}` : `✗ ${t("accounting.notBalanced")}`}</span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={submit} disabled={!balanced || loading} className="w-full h-12">
        {loading ? t("accounting.saving") : t("accounting.postVoucher")}
      </Button>
    </div>
  );
}
