"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, ArrowLeft, Pencil, Trash2, Search } from "lucide-react";
import { formatIndianCurrency } from "@/lib/accounting";
import { AccountingNav } from "@/components/accounting/accounting-nav";
import { useT } from "@/i18n/locale-provider";
import { PAGE_SIZE } from "@/lib/pagination";
import type { ColumnDef } from "@tanstack/react-table";
import { GlobalDataTable } from "@/components/ui/global-data-table";
import { useConfirm } from "@/hooks/use-confirm";
import { toast } from "@/components/ui/toast";

type VoucherLine = {
  debit: number;
  credit: number;
  account?: { code?: string; name?: string } | null;
};

type VoucherRow = {
  id: string;
  voucherNo: string;
  voucherDate: string;
  voucherType: string;
  partyName?: string | null;
  narration?: string | null;
  totalAmount: number;
  auditStatus?: string | null;
  lines?: VoucherLine[];
};

function linesBalanced(lines?: VoucherLine[]) {
  if (!lines?.length) return true;
  const debit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const credit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  return Math.abs(debit - credit) < 0.01 && debit > 0;
}

export default function VouchersPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, ConfirmDialog } = useConfirm();
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fy, setFy] = useState<{ label: string; isLocked?: boolean } | null>(null);
  const [filter, setFilter] = useState("");
  const [auditStatus, setAuditStatus] = useState(() => searchParams.get("auditStatus") || "");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [canWrite, setCanWrite] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (filter) params.set("type", filter);
    if (auditStatus) params.set("auditStatus", auditStatus);
    if (q) params.set("q", q);
    fetch(`/api/accounting/vouchers?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setVouchers(d.vouchers || []);
        setTotal(d.total ?? 0);
        setFy(d.financialYear);
        setCanWrite(Boolean(d.canWrite));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page, q, auditStatus]);

  const voucherTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      receipt: t("accounting.voucherReceipt"),
      payment: t("accounting.voucherPayment"),
      journal: t("accounting.voucherJournal"),
      contra: t("accounting.voucherContra"),
    };
    return map[type] || type;
  };

  const deleteVoucher = async (row: VoucherRow) => {
    const ok = await confirm({
      title: t("accounting.deleteVoucherTitle"),
      message: t("accounting.deleteVoucherMessage", { no: row.voucherNo }),
      confirmLabel: t("common.delete"),
      variant: "destructive",
      onConfirm: async () => {
        setDeletingId(row.id);
        const res = await fetch(`/api/accounting/vouchers/${row.id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || t("accounting.voucherDeleteFailed"));
      },
    });
    setDeletingId(null);
    if (!ok) return;
    toast.success(t("accounting.voucherDeleted"));
    load();
  };

  const filterTypes = ["", "receipt", "payment", "journal", "contra"] as const;

  const columns = useMemo<ColumnDef<VoucherRow>[]>(
    () => [
      {
        header: t("accounting.voucherNo"),
        accessorKey: "voucherNo",
        cell: ({ row }) => (
          <Link
            href={`/accounting/vouchers/${row.original.id}`}
            className="font-mono font-medium text-blue-700 hover:underline"
          >
            {row.original.voucherNo}
          </Link>
        ),
      },
      {
        header: t("accounting.date"),
        accessorKey: "voucherDate",
        cell: ({ row }) => new Date(row.original.voucherDate).toLocaleDateString("en-IN"),
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
          <span className="max-w-xs truncate block">{(row.original.narration || "").slice(0, 50)}</span>
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
        cell: ({ row }) => {
          const balanced = linesBalanced(row.original.lines);
          return (
            <div className="flex flex-col items-start gap-1">
              <Badge status={row.original.auditStatus === "verified" ? "approved" : "pending"} />
              {!balanced && (
                <span className="text-[11px] font-medium text-red-600">
                  {t("accounting.notBalanced")}
                </span>
              )}
            </div>
          );
        },
      },
      {
        header: t("common.actions"),
        id: "actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/accounting/vouchers/${row.original.id}`)}
              title={canWrite ? t("common.edit") : t("common.view")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {canWrite && (
              <Button
                variant="outline"
                size="sm"
                disabled={deletingId === row.original.id}
                onClick={() => void deleteVoucher(row.original)}
                title={t("common.delete")}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t, canWrite, deletingId, router],
  );

  return (
    <div className="space-y-6">
      <ConfirmDialog />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link href="/accounting">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t("accounting.voucherRegister")}</h1>
            <p className="text-slate-500">
              FY {fy?.label} — {t("accounting.billBook")}
            </p>
          </div>
        </div>
        {canWrite && (
          <Link href="/accounting/vouchers/new" className="self-start">
            <Button>
              <Plus className="h-4 w-4" /> {t("accounting.newVoucher")}
            </Button>
          </Link>
        )}
      </div>

      <AccountingNav current="vouchers" />

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          {filterTypes.map((type) => (
            <button
              key={type}
              onClick={() => {
                setFilter(type);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === type ? "bg-blue-600 text-white" : "bg-white border"
              }`}
            >
              {type ? voucherTypeLabel(type) : t("common.all")}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "", label: t("accounting.auditFilterAll") },
            { value: "pending", label: t("accounting.filterPending") },
            { value: "verified", label: t("accounting.filterVerified") },
            { value: "flagged", label: t("accounting.filterFlagged") },
          ].map((item) => (
            <button
              key={item.value || "all-audit"}
              type="button"
              onClick={() => {
                setAuditStatus(item.value);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                auditStatus === item.value ? "bg-amber-600 text-white" : "border bg-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("accounting.voucherSearchPlaceholder")}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("accounting.allVouchers")}</CardTitle>
        </CardHeader>
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
