"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Flag } from "lucide-react";
import { formatIndianCurrency } from "@/lib/accounting";
import { useT } from "@/i18n/locale-provider";

export default function CaVerifyPage() {
  const t = useT();
  const [vouchers, setVouchers] = useState<Record<string, unknown>[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  const load = () => {
    fetch("/api/accounting/vouchers?auditStatus=pending").then((r) => r.json()).then((d) => setVouchers(d.vouchers || []));
  };

  useEffect(load, []);

  const voucherTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      receipt: t("accounting.voucherReceipt"),
      payment: t("accounting.voucherPayment"),
      journal: t("accounting.voucherJournal"),
      contra: t("accounting.voucherContra"),
    };
    return map[type] || type;
  };

  const audit = async (voucherId: string, auditStatus: string) => {
    await fetch("/api/accounting/audit", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voucherId, auditStatus, auditRemarks: remarks[voucherId] || "" }),
    });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("caPortal.voucherVerification")}</h1>
        <p className="text-slate-500">{t("caPortal.voucherVerificationDesc")}</p>
      </div>

      <div className="space-y-4">
        {vouchers.map((v) => (
          <Card key={v.id as string} className="border-l-4 border-l-amber-400">
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <CardTitle className="text-lg">{v.voucherNo as string}</CardTitle>
                <Badge status="pending" />
              </div>
              <p className="text-sm text-slate-500">{voucherTypeLabel(v.voucherType as string)} • {new Date(v.voucherDate as string).toLocaleDateString("en-IN")} • {formatIndianCurrency(v.totalAmount as number)}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p><strong>{t("accounting.party")}:</strong> {(v.partyName as string) || "—"} | <strong>{t("accounting.paymentMode")}:</strong> {(v.paymentMode as string) || "—"}</p>
              <p><strong>{t("accounting.narration")}:</strong> {v.narration as string}</p>
              {(v.billNo as string) && <p><strong>{t("accounting.billNo")}:</strong> {v.billNo as string} {v.billDate ? `(${new Date(v.billDate as string).toLocaleDateString("en-IN")})` : ""}</p>}
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                {((v.lines as { account: { name: string }; debit: number; credit: number }[]) || []).map((l, i) => (
                  <div key={i} className="flex justify-between"><span>{l.account.name}</span><span>{t("accounting.debit")} {l.debit} | {t("accounting.credit")} {l.credit}</span></div>
                ))}
              </div>
              <textarea
                className="w-full border rounded-lg p-2 text-sm"
                placeholder={t("caPortal.auditRemarks")}
                value={remarks[v.id as string] || ""}
                onChange={(e) => setRemarks({ ...remarks, [v.id as string]: e.target.value })}
              />
              <div className="flex gap-2">
                <Button onClick={() => audit(v.id as string, "verified")} className="bg-emerald-600"><CheckCircle className="h-4 w-4" /> {t("caPortal.verify")}</Button>
                <Button variant="outline" onClick={() => audit(v.id as string, "query")}><Flag className="h-4 w-4" /> {t("caPortal.query")}</Button>
                <Button variant="outline" onClick={() => audit(v.id as string, "flagged")} className="text-red-600"><XCircle className="h-4 w-4" /> {t("caPortal.flag")}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!vouchers.length && <Card><CardContent className="p-12 text-center text-slate-500">{t("caPortal.allVerified")}</CardContent></Card>}
      </div>
    </div>
  );
}
