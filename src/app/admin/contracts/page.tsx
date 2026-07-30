"use client";

import { PageLoader, Spinner } from "@/components/ui/loader";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InfoModal } from "@/components/ui/info-modal";
import { formatINR, StatusBadge } from "@/components/admin/admin-ui";
import { FileText, School, ExternalLink, Trash2, Search } from "lucide-react";
import { hasContractData } from "@/lib/contract-utils";
import { useConfirm } from "@/hooks/use-confirm";
import { PAGE_SIZE } from "@/lib/pagination";
import type { ColumnDef } from "@tanstack/react-table";
import { GlobalDataTable } from "@/components/ui/global-data-table";

interface SchoolContract {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  subscription?: {
    contractNumber?: string | null;
    contractValue?: string | null;
    contractStartDate?: string | null;
    contractEndDate?: string | null;
    contractDocumentPath?: string | null;
    contractNotes?: string | null;
    planName?: string;
    paymentStatus?: string;
    totalAmount?: string | null;
    paidAmount?: string | null;
  } | null;
}

export default function ContractsPage() {
  const [schools, setSchools] = useState<SchoolContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/schools")
      .then((r) => r.json())
      .then((d) => setSchools(d.schools || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const withContract = useMemo(
    () => schools.filter((s) => hasContractData(s.subscription)),
    [schools],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return withContract;
    return withContract.filter((s) => {
      const sub = s.subscription;
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (sub?.contractNumber || "").toLowerCase().includes(q) ||
        (sub?.planName || "").toLowerCase().includes(q) ||
        (sub?.paymentStatus || "").toLowerCase().includes(q)
      );
    });
  }, [withContract, search]);

  const deleteContract = async (school: SchoolContract) => {
    await confirm({
      title: "Delete Contract",
      message: `Remove contract for "${school.name}" (${school.code})? Contract details and uploaded document will be deleted. Payment records and panel access will remain.`,
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        setBusyId(school.id);
        try {
          const res = await fetch(`/api/admin/schools/${school.id}/contract`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) {
            setErrorMsg(data.error || "Failed to delete contract");
            throw new Error(data.error || "Failed to delete contract");
          }
          load();
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const columns = useMemo<ColumnDef<SchoolContract>[]>(
    () => [
      {
        header: "School",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <School className="h-4 w-4 text-violet-500" />
            <div>
              <p className="font-medium">{row.original.name}</p>
              <p className="font-mono text-[11px] text-violet-600">{row.original.code}</p>
            </div>
          </div>
        ),
      },
      {
        header: "Contract #",
        accessorFn: (s) => s.subscription?.contractNumber || "",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.subscription?.contractNumber || "—"}</span>
        ),
      },
      {
        header: "Plan",
        accessorFn: (s) => s.subscription?.planName || "",
        cell: ({ row }) => (
          <span className="capitalize">{row.original.subscription?.planName}</span>
        ),
      },
      {
        header: "Value",
        accessorFn: (s) => s.subscription?.contractValue || "",
        cell: ({ row }) => (
          <span className="block text-right font-semibold">
            {formatINR(row.original.subscription?.contractValue)}
          </span>
        ),
      },
      {
        header: "Period",
        id: "period",
        enableSorting: false,
        cell: ({ row }) => {
          const sub = row.original.subscription;
          return (
            <span className="text-xs text-slate-500">
              {sub?.contractStartDate ? new Date(sub.contractStartDate).toLocaleDateString("en-IN") : "—"}
              {" → "}
              {sub?.contractEndDate ? new Date(sub.contractEndDate).toLocaleDateString("en-IN") : "—"}
            </span>
          );
        },
      },
      {
        header: "Status",
        accessorFn: (s) => s.subscription?.paymentStatus || "",
        cell: ({ row }) => <StatusBadge status={row.original.subscription?.paymentStatus} />,
      },
      {
        header: "Doc",
        id: "doc",
        enableSorting: false,
        cell: ({ row }) => {
          const path = row.original.subscription?.contractDocumentPath;
          return path ? (
            <a
              href={`/api/uploads/${path}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-violet-600 hover:underline"
            >
              View
            </a>
          ) : (
            "—"
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="block text-right">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const s = row.original;
          const busy = busyId === s.id;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Link href={`/admin/schools/${s.id}`}>
                <Button variant="outline" size="sm" title="View school">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => deleteContract(s)}
                title="Delete contract"
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                {busy ? <Spinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          );
        },
      },
    ],
    [busyId],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contracts</h1>
        <p className="text-sm text-slate-500">All school agreements & system pricing</p>
      </div>

      {loading ? (
        <PageLoader />
      ) : withContract.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-slate-500">No contracts yet.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-violet-600" /> {filtered.length} Contracts
              </span>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search school / code / contract / plan…"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <GlobalDataTable
              data={filtered}
              columns={columns}
              emptyText="No contracts match your search."
              pageSize={PAGE_SIZE}
              className="rounded-none border-0 shadow-none"
            />
          </CardContent>
        </Card>
      )}

      <ConfirmDialog />

      <InfoModal isOpen={!!errorMsg} onClose={() => setErrorMsg(null)} title="Error">
        <p className="text-sm text-slate-600">{errorMsg}</p>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setErrorMsg(null)}>OK</Button>
        </div>
      </InfoModal>
    </div>
  );
}
