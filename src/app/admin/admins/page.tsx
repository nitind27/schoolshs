"use client";

import { PageLoader, Spinner } from "@/components/ui/loader";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/admin-ui";
import { Users, Plus, ExternalLink, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { InfoModal } from "@/components/ui/info-modal";
import { useConfirm } from "@/hooks/use-confirm";
import type { ColumnDef } from "@tanstack/react-table";
import { GlobalDataTable } from "@/components/ui/global-data-table";

interface AdminRow {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  emailVerified?: boolean;
  lastLoginAt?: string | null;
  school: { id: string; name: string; code: string };
}

export default function AdminsListPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => setAdmins(d.users || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (admin: AdminRow) => {
    const next = !admin.isActive;
    const label = next ? "activate" : "deactivate";

    await confirm({
      title: next ? "Activate Admin" : "Deactivate Admin",
      message: `${next ? "Activate" : "Deactivate"} ${admin.name}? ${
        next ? "They will be able to sign in again." : "They will not be able to sign in."
      }`,
      confirmLabel: next ? "Activate" : "Deactivate",
      variant: "warning",
      onConfirm: async () => {
        setBusyId(admin.id);
        try {
          const res = await fetch(`/api/admin/users/${admin.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: next }),
          });
          const data = await res.json();
          if (!res.ok) {
            setErrorMsg(data.error || `Failed to ${label}`);
            throw new Error(data.error || `Failed to ${label}`);
          }
          setAdmins((list) =>
            list.map((a) => (a.id === admin.id ? { ...a, isActive: data.isActive } : a)),
          );
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const deleteAdmin = async (admin: AdminRow) => {
    await confirm({
      title: "Delete Admin",
      message: `Delete admin "${admin.name}" (${admin.email})? This cannot be undone. The school account will remain.`,
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        setBusyId(admin.id);
        try {
          const res = await fetch(`/api/admin/users/${admin.id}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) {
            setErrorMsg(data.error || "Failed to delete");
            throw new Error(data.error || "Failed to delete");
          }
          setAdmins((list) => list.filter((a) => a.id !== admin.id));
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const columns = useMemo<ColumnDef<AdminRow>[]>(
    () => [
      {
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700 uppercase">
              {row.original.name.charAt(0)}
            </div>
            <span className="font-medium text-slate-900">{row.original.name}</span>
          </div>
        ),
      },
      { header: "Email", accessorKey: "email", cell: ({ row }) => <span className="font-mono text-xs">{row.original.email}</span> },
      {
        header: "Verified",
        accessorFn: (a) => (a.emailVerified ? "Verified" : "Pending"),
        cell: ({ row }) => (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
            row.original.emailVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
          }`}>
            {row.original.emailVerified ? "Verified" : "Pending"}
          </span>
        ),
      },
      {
        header: "School",
        accessorFn: (a) => a.school.name,
        cell: ({ row }) => (
          <div>
            <p className="text-xs font-medium">{row.original.school.name}</p>
            <p className="font-mono text-[11px] text-violet-600">{row.original.school.code}</p>
          </div>
        ),
      },
      {
        header: "Last Login",
        accessorFn: (a) => a.lastLoginAt || "Never",
        cell: ({ row }) => (
          <span className="text-xs text-slate-500">
            {row.original.lastLoginAt
              ? new Date(row.original.lastLoginAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "Never"}
          </span>
        ),
      },
      {
        header: "Status",
        accessorFn: (a) => (a.isActive ? "Active" : "Inactive"),
        cell: ({ row }) => <StatusBadge active={row.original.isActive} />,
      },
      {
        header: "Actions",
        id: "actions",
        enableSorting: false,
        cell: ({ row }) => {
          const a = row.original;
          const busy = busyId === a.id;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => toggleActive(a)}
                title={a.isActive ? "Deactivate" : "Activate"}
                className={
                  a.isActive
                    ? "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    : "text-slate-600"
                }
              >
                {busy ? (
                  <Spinner size="sm" />
                ) : a.isActive ? (
                  <ToggleRight className="h-3.5 w-3.5" />
                ) : (
                  <ToggleLeft className="h-3.5 w-3.5" />
                )}
              </Button>
              <Link href={`/admin/admins/${a.id}`}>
                <Button variant="outline" size="sm" title="Edit">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => deleteAdmin(a)}
                title="Delete"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">School Admins</h1>
          <p className="text-sm text-slate-500">{admins.length} admin accounts</p>
        </div>
        <Link href="/admin/admins/new">
          <Button className="bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4" /> Create Admin
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" /> All Admins
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && admins.length === 0 ? (
            <PageLoader />
          ) : (
            <GlobalDataTable
              data={admins}
              columns={columns}
              loading={loading}
              emptyText="No school admins yet."
              pageSize={10}
            />
          )}
        </CardContent>
      </Card>

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
