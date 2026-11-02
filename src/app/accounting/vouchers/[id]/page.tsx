"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PageLoader } from "@/components/ui/loader";
import { VoucherForm } from "@/components/accounting/voucher-form";
import { useT } from "@/i18n/locale-provider";

type VoucherPayload = {
  id: string;
  voucherNo: string;
  voucherType: string;
  voucherDate: string;
  narration: string;
  partyName?: string | null;
  paymentMode?: string | null;
  referenceNo?: string | null;
  chequeNo?: string | null;
  bankName?: string | null;
  billNo?: string | null;
  billDate?: string | null;
  gstin?: string | null;
  auditStatus?: string | null;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    description?: string | null;
  }>;
};

export default function EditVoucherPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<VoucherPayload | null>(null);
  const [locked, setLocked] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [fyLabel, setFyLabel] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/accounting/vouchers/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || t("accounting.voucherNotFound"));
        setVoucher(data.voucher);
        setLocked(Boolean(data.isLocked));
        setCanWrite(Boolean(data.canWrite));
        setFyLabel(data.financialYear?.label || "");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t("accounting.voucherNotFound"));
      })
      .finally(() => setLoading(false));
  }, [id, t]);

  if (loading) return <PageLoader />;

  if (error || !voucher) {
    return (
      <div className="space-y-4">
        <Link href="/accounting/vouchers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" /> {t("common.back")}
          </Button>
        </Link>
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error || t("accounting.voucherNotFound")}
        </p>
      </div>
    );
  }

  return (
    <VoucherForm
      mode="edit"
      voucherId={voucher.id}
      locked={locked}
      readOnly={!canWrite}
      fyLabel={fyLabel}
      initial={{
        voucherNo: voucher.voucherNo,
        voucherType: voucher.voucherType,
        voucherDate: voucher.voucherDate,
        narration: voucher.narration || "",
        partyName: voucher.partyName || "",
        paymentMode: voucher.paymentMode || "Cash",
        referenceNo: voucher.referenceNo || "",
        chequeNo: voucher.chequeNo || "",
        bankName: voucher.bankName || "",
        billNo: voucher.billNo || "",
        billDate: voucher.billDate || "",
        gstin: voucher.gstin || "",
        auditStatus: voucher.auditStatus,
        lines: voucher.lines.map((line) => ({
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          description: line.description || "",
        })),
      }}
    />
  );
}
