"use client";

import { PageLoader } from "@/components/ui/loader";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR, StatusBadge } from "@/components/admin/admin-ui";
import { CreditCard, IndianRupee, AlertCircle, ExternalLink } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { GlobalDataTable } from "@/components/ui/global-data-table";

interface SchoolPay {
  id: string;
  name: string;
  code: string;
  subscription?: {
    totalAmount?: string | null;
    paidAmount?: string | null;
    paymentStatus?: string;
    nextDueDate?: string | null;
  } | null;
}

export default function PaymentsPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [schools, setSchools] = useState<SchoolPay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/admin/schools").then((r) => r.json()),
    ])
      .then(([s, d]) => {
        setStats(s);
        setSchools(d.schools || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const pending = schools.filter((s) => ["pending", "partial", "overdue"].includes(s.subscription?.paymentStatus || ""));

  const pendingColumns = useMemo<ColumnDef<SchoolPay>[]>(
    () => [
      {
        header: "School",
        accessorKey: "name",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-900">{row.original.name}</p>
            <p className="font-mono text-[11px] text-violet-600">{row.original.code}</p>
          </div>
        ),
      },
      {
        header: "Total",
        accessorFn: (s) => Number(s.subscription?.totalAmount || 0),
        cell: ({ row }) => <span className="text-right block">{formatINR(row.original.subscription?.totalAmount)}</span>,
      },
      {
        header: "Paid",
        accessorFn: (s) => Number(s.subscription?.paidAmount || 0),
        cell: ({ row }) => <span className="text-right block text-emerald-700">{formatINR(row.original.subscription?.paidAmount)}</span>,
      },
      {
        header: "Balance",
        accessorFn: (s) => Number(s.subscription?.totalAmount || 0) - Number(s.subscription?.paidAmount || 0),
        cell: ({ getValue }) => <span className="text-right block font-bold text-amber-700">{formatINR(Number(getValue()))}</span>,
      },
      {
        header: "Due Date",
        accessorFn: (s) => s.subscription?.nextDueDate || "",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.subscription?.nextDueDate
              ? new Date(row.original.subscription?.nextDueDate).toLocaleDateString("en-IN")
              : "—"}
          </span>
        ),
      },
      {
        header: "",
        id: "action",
        enableSorting: false,
        cell: ({ row }) => (
          <Link href={`/admin/schools/${row.original.id}`}>
            <Button size="sm" variant="outline"><ExternalLink className="h-3 w-3" /></Button>
          </Link>
        ),
      },
    ],
    [],
  );

  const allColumns = useMemo<ColumnDef<SchoolPay>[]>(
    () => [
      { header: "School", accessorKey: "name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      {
        header: "Total",
        accessorFn: (s) => Number(s.subscription?.totalAmount || 0),
        cell: ({ row }) => <span className="text-right block">{formatINR(row.original.subscription?.totalAmount)}</span>,
      },
      {
        header: "Paid",
        accessorFn: (s) => Number(s.subscription?.paidAmount || 0),
        cell: ({ row }) => <span className="text-right block text-emerald-700">{formatINR(row.original.subscription?.paidAmount)}</span>,
      },
      {
        header: "Status",
        accessorFn: (s) => s.subscription?.paymentStatus || "none",
        cell: ({ row }) => <StatusBadge status={row.original.subscription?.paymentStatus} />,
      },
      {
        header: "",
        id: "action",
        enableSorting: false,
        cell: ({ row }) => (
          <Link href={`/admin/schools/${row.original.id}`}>
            <Button size="sm" variant="outline"><ExternalLink className="h-3 w-3" /></Button>
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-sm text-slate-500">Revenue tracking & pending collections</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={formatINR(stats.totalRevenue)} icon={<IndianRupee className="h-5 w-5 text-white" />} gradient="bg-gradient-to-br from-emerald-600 to-teal-700" />
        <StatCard label="Contract Value" value={formatINR(stats.totalContractValue)} icon={<CreditCard className="h-5 w-5 text-white" />} gradient="bg-gradient-to-br from-violet-600 to-purple-700" />
        <StatCard label="Collected" value={formatINR(stats.totalPaid)} icon={<IndianRupee className="h-5 w-5 text-white" />} gradient="bg-gradient-to-br from-blue-600 to-blue-700" />
        <StatCard label="Pending Schools" value={stats.pendingPayments ?? 0} icon={<AlertCircle className="h-5 w-5 text-white" />} gradient="bg-gradient-to-br from-amber-500 to-orange-600" />
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <>
          {pending.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="text-amber-800 flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Pending Payments ({pending.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <GlobalDataTable data={pending} columns={pendingColumns} emptyText="No pending schools" pageSize={8} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>All Schools — Payment Status</CardTitle></CardHeader>
            <CardContent className="p-0">
              <GlobalDataTable data={schools} columns={allColumns} emptyText="No schools found" pageSize={12} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
