"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft } from "lucide-react";
import { formatIndianCurrency } from "@/lib/accounting";
import { useT } from "@/i18n/locale-provider";
import { PAGE_SIZE } from "@/lib/pagination";
import type { ColumnDef } from "@tanstack/react-table";
import { GlobalDataTable } from "@/components/ui/global-data-table";

type VoucherRow = {
  id: string;
  voucherNo: string;
  voucherDate: string;
  voucherType: string;
  partyName?: string | null;
  narration?: string | null;
  totalAmount: number;
  auditStatus?: string | null;
};

export default function VouchersPage() {
  const t = useT();
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fy, setFy] = useState<{ label: string } | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (filter) params.set("type", filter);
    fetch(`/api/accounting/vouchers?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setVouchers(d.vouchers || []);
        setTotal(d.total ?? 0);
        setFy(d.financialYear);
      })
      .finally(() => setLoading(false));
  }, [filter, page]);

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

  const columns = useMemo<ColumnDef<VoucherRow>[]>(
    () => [
      {
        header: t("accounting.voucherNo"),
        accessorKey: "voucherNo",
        cell: ({ row }) => (
          <span className="font-mono font-medium">{row.original.voucherNo}</span>
        ),
      },
      {
        header: t("accounting.date"),
        accessorKey: "voucherDate",
        cell: ({ row }) =>
          new Date(row.original.voucherDate).toLocaleDateString("en-IN"),
      },
      {
        header: t("accounting.type"),
        accessorKey: "voucherType",
        cell: ({ row }) => voucherTypeLabel(row.original.voucherType),
      },
      {
        header: t("accounting.party"),
        accessorKey: "partyName",
        cell: ({ row }) => row.original.partyName || "—",
      },
      {
        header: t("accounting.narration"),
        accessorKey: "narration",
        cell: ({ row }) => (
          <span className="max-w-xs truncate block">
            {(row.original.narration || "").slice(0, 50)}
          </span>
        ),
      },
      {
        header: t("accounting.amount"),
        accessorKey: "totalAmount",
        cell: ({ row }) => (
          <span className="block text-right font-semibold">
            {formatIndianCurrency(row.original.totalAmount)}
          </span>
        ),
      },
      {
        header: t("accounting.audit"),
        accessorKey: "auditStatus",
        cell: ({ row }) => (
          <Badge status={row.original.auditStatus === "verified" ? "approved" : "pending"} />
        ),
      },
    ],
    [t],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link href="/accounting"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{t("accounting.voucherRegister")}</h1>
            <p className="text-slate-500">FY {fy?.label} — {t("accounting.billBook")}</p>
          </div>
        </div>
        <Link href="/accounting/vouchers/new" className="self-start"><Button><Plus className="h-4 w-4" /> {t("accounting.newVoucher")}</Button></Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filterTypes.map((type) => (
          <button key={type} onClick={() => { setFilter(type); setPage(1); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === type ? "bg-blue-600 text-white" : "bg-white border"}`}>
            {type ? voucherTypeLabel(type) : t("common.all")}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>{t("accounting.allVouchers")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <GlobalDataTable
            data={vouchers}
            columns={columns}
            loading={loading}
            emptyText={t("accounting.noVouchersFound")}
            manualPagination
            totalRows={total}
            pageSize={PAGE_SIZE}
            pageIndex={Math.max(page - 1, 0)}
            onPageChange={(idx) => setPage(idx + 1)}
            className="rounded-none border-0 shadow-none"
          />
        </CardContent>
      </Card>
    </div>
  );
}
