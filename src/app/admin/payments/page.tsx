"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR, StatusBadge } from "@/components/admin/admin-ui";
import { CreditCard, IndianRupee, AlertCircle, ExternalLink } from "lucide-react";

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
    ]).then(([s, d]) => {
      setStats(s);
      setSchools(d.schools || []);
    }).finally(() => setLoading(false));
  }, []);

  const pending = schools.filter((s) => ["pending", "partial", "overdue"].includes(s.subscription?.paymentStatus || ""));

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
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-200 border-t-violet-600" /></div>
      ) : (
        <>
          {pending.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader><CardTitle className="text-amber-800 flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Pending Payments ({pending.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-amber-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">School</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Total</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Paid</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Balance</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Due Date</th>
                    <th className="px-5 py-3" />
                  </tr></thead>
                  <tbody className="divide-y">
                    {pending.map((s) => {
                      const sub = s.subscription!;
                      const balance = Number(sub.totalAmount || 0) - Number(sub.paidAmount || 0);
                      return (
                        <tr key={s.id} className="hover:bg-amber-50/30">
                          <td className="px-5 py-3.5"><p className="font-medium">{s.name}</p><p className="font-mono text-[11px] text-violet-600">{s.code}</p></td>
                          <td className="px-5 py-3.5 text-right">{formatINR(sub.totalAmount)}</td>
                          <td className="px-5 py-3.5 text-right text-emerald-700">{formatINR(sub.paidAmount)}</td>
                          <td className="px-5 py-3.5 text-right font-bold text-amber-700">{formatINR(balance)}</td>
                          <td className="px-5 py-3.5 text-xs">{sub.nextDueDate ? new Date(sub.nextDueDate).toLocaleDateString("en-IN") : "—"}</td>
                          <td className="px-5 py-3.5"><Link href={`/admin/schools/${s.id}`}><Button size="sm" variant="outline"><ExternalLink className="h-3 w-3" /></Button></Link></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>All Schools — Payment Status</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">School</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Total</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Paid</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-5 py-3" />
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {schools.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-medium">{s.name}</td>
                      <td className="px-5 py-3.5 text-right">{formatINR(s.subscription?.totalAmount)}</td>
                      <td className="px-5 py-3.5 text-right text-emerald-700">{formatINR(s.subscription?.paidAmount)}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={s.subscription?.paymentStatus} /></td>
                      <td className="px-5 py-3.5"><Link href={`/admin/schools/${s.id}`}><Button size="sm" variant="outline"><ExternalLink className="h-3 w-3" /></Button></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
