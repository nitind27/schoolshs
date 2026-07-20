"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InfoModal } from "@/components/ui/info-modal";
import { formatINR, StatusBadge } from "@/components/admin/admin-ui";
import { FileText, School, ExternalLink, Trash2, Loader2, Search } from "lucide-react";
import { hasContractData } from "@/lib/contract-utils";
import { useConfirm } from "@/hooks/use-confirm";
import { TablePagination } from "@/components/ui/table-pagination";
import { PAGE_SIZE, paginateSlice } from "@/lib/pagination";

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
  const [page, setPage] = useState(1);
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

  useEffect(() => {
    setPage(1);
  }, [search]);

  const paged = useMemo(() => paginateSlice(filtered, page, PAGE_SIZE), [filtered, page]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contracts</h1>
        <p className="text-sm text-slate-500">All school agreements & system pricing</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-200 border-t-violet-600" /></div>
      ) : withContract.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-slate-500">No contracts yet.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3 flex-wrap">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-violet-600" /> {filtered.length} Contracts
              </span>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search school / code / contract / plan…"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">School</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Contract #</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Plan</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Value</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Period</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Doc</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paged.map((s) => {
                    const sub = s.subscription!;
                    const busy = busyId === s.id;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <School className="h-4 w-4 text-violet-500" />
                            <div>
                              <p className="font-medium">{s.name}</p>
                              <p className="font-mono text-[11px] text-violet-600">{s.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs">{sub.contractNumber || "—"}</td>
                        <td className="px-5 py-3.5 capitalize">{sub.planName}</td>
                        <td className="px-5 py-3.5 text-right font-semibold">{formatINR(sub.contractValue)}</td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {sub.contractStartDate ? new Date(sub.contractStartDate).toLocaleDateString("en-IN") : "—"}
                          {" → "}
                          {sub.contractEndDate ? new Date(sub.contractEndDate).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={sub.paymentStatus} /></td>
                        <td className="px-5 py-3.5">
                          {sub.contractDocumentPath ? (
                            <a href={`/api/uploads/${sub.contractDocumentPath}`} target="_blank" rel="noreferrer" className="text-violet-600 hover:underline text-xs">View</a>
                          ) : "—"}
                        </td>
                        <td className="px-5 py-3.5">
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
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} total={filtered.length} onPageChange={setPage} />
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
