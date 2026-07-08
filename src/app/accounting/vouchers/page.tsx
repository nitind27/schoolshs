"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft } from "lucide-react";
import { formatIndianCurrency } from "@/lib/accounting";
import { useT } from "@/i18n/locale-provider";

export default function VouchersPage() {
  const t = useT();
  const [vouchers, setVouchers] = useState<Record<string, unknown>[]>([]);
  const [fy, setFy] = useState<{ label: string } | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const url = filter ? `/api/accounting/vouchers?type=${filter}` : "/api/accounting/vouchers";
    fetch(url).then((r) => r.json()).then((d) => { setVouchers(d.vouchers || []); setFy(d.financialYear); });
  }, [filter]);

  const voucherTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      receipt: t("accounting.voucherReceipt"),
      payment: t("accounting.voucherPayment"),
      journal: t("accounting.voucherJournal"),
      contra: t("accounting.voucherContra"),
    };
    return map[type] || type;
  };

  const filterTypes = ["", "receipt", "payment", "journal", "contra"] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/accounting"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{t("accounting.voucherRegister")}</h1>
            <p className="text-slate-500">FY {fy?.label} — {t("accounting.billBook")}</p>
          </div>
        </div>
        <Link href="/accounting/vouchers/new"><Button><Plus className="h-4 w-4" /> {t("accounting.newVoucher")}</Button></Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filterTypes.map((type) => (
          <button key={type} onClick={() => setFilter(type)} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === type ? "bg-blue-600 text-white" : "bg-white border"}`}>
            {type ? voucherTypeLabel(type) : t("common.all")}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>{t("accounting.allVouchers")}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="p-3">{t("accounting.voucherNo")}</th>
                <th className="p-3">{t("accounting.date")}</th>
                <th className="p-3">{t("accounting.type")}</th>
                <th className="p-3">{t("accounting.party")}</th>
                <th className="p-3">{t("accounting.narration")}</th>
                <th className="p-3 text-right">{t("accounting.amount")}</th>
                <th className="p-3">{t("accounting.audit")}</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id as string} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-mono font-medium">{v.voucherNo as string}</td>
                  <td className="p-3">{new Date(v.voucherDate as string).toLocaleDateString("en-IN")}</td>
                  <td className="p-3">{voucherTypeLabel(v.voucherType as string)}</td>
                  <td className="p-3">{(v.partyName as string) || "—"}</td>
                  <td className="p-3 max-w-xs truncate">{(v.narration as string)?.slice(0, 50)}</td>
                  <td className="p-3 text-right font-semibold">{formatIndianCurrency(v.totalAmount as number)}</td>
                  <td className="p-3"><Badge status={v.auditStatus === "verified" ? "approved" : "pending"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!vouchers.length && <p className="text-center py-8 text-slate-500">{t("accounting.noVouchersFound")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
