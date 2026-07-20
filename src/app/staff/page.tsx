"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { STAFF_DESIGNATIONS, getStaffRoleWork } from "@/lib/constants";
import { Plus, Edit, Search, Users, ClipboardList, IndianRupee } from "lucide-react";
import type { Staff } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";
import { TablePagination } from "@/components/ui/table-pagination";
import { PAGE_SIZE } from "@/lib/pagination";

export default function StaffPage() {
  const t = useT();
  const [staff, setStaff] = useState<(Staff & { _count?: { classes: number } })[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [designation, setDesignation] = useState("");
  const [dashHref, setDashHref] = useState("/dashboard");
  const [hrSummary, setHrSummary] = useState<{
    totalStaff: number; withSalary: number; attendanceMarked: number;
    payrollPending: number; totalNet: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.role === "clerk") setDashHref("/clerk");
      })
      .catch(() => {});
  }, []);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    if (designation) params.set("designation", designation);
    const res = await fetch(`/api/staff?${params}`);
    const data = await res.json();
    setStaff(data.staff || []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, designation, page]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  useEffect(() => {
    fetch("/api/staff-hr/summary").then((r) => r.json()).then(setHrSummary).catch(() => {});
  }, []);

  const teacherCount = staff.filter((s) => ["teacher", "head teacher"].includes(String(s.designation || "").toLowerCase())).length;
  const peonCount = staff.filter((s) => ["peon", "puen"].includes(String(s.designation || "").toLowerCase())).length;
  const supervisorCount = staff.filter((s) => String(s.designation || "").toLowerCase() === "supervisor").length;

  return (
    <PageShell
      title={t("staffPage.title")}
      subtitle={t("staffPage.staffCount", { count: total })}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: dashHref },
        { label: t("nav.staff") },
      ]}
      actions={(
        <>
          <Link href="/staff/register">
            <Button variant="outline"><ClipboardList className="h-4 w-4" /> {t("staffRegister.title")}</Button>
          </Link>
          <Link href="/staff/new">
            <Button><Plus className="h-4 w-4" /> {t("staffPage.addStaff")}</Button>
          </Link>
        </>
      )}
    >

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Teacher</p>
            <p className="text-2xl font-bold text-slate-900">{teacherCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Peon</p>
            <p className="text-2xl font-bold text-slate-900">{peonCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Supervisor</p>
            <p className="text-2xl font-bold text-slate-900">{supervisorCount}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/staff/attendance" className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 p-5 hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div>
              <ClipboardList className="h-8 w-8 text-violet-600 mb-2" />
              <p className="font-bold text-slate-900 text-lg">{t("staffHr.attendanceTitle")}</p>
              <p className="text-sm text-slate-600 mt-1">{t("staffHr.attendanceCardDesc")}</p>
            </div>
            <span className="text-2xl font-black text-violet-600">{hrSummary?.attendanceMarked ?? 0}/{hrSummary?.totalStaff ?? 0}</span>
          </div>
        </Link>
        <Link href="/staff/payroll" className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 p-5 hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div>
              <IndianRupee className="h-8 w-8 text-emerald-600 mb-2" />
              <p className="font-bold text-slate-900 text-lg">{t("staffHr.payrollTitle")}</p>
              <p className="text-sm text-slate-600 mt-1">{t("staffHr.payrollCardDesc")}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-emerald-700">₹{(hrSummary?.totalNet ?? 0).toLocaleString("en-IN")}</p>
              <p className="text-xs text-amber-600">{hrSummary?.payrollPending ?? 0} {t("staffHr.pending")}</p>
            </div>
          </div>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              placeholder={t("staffPage.searchPlaceholder")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <Select
            options={["", ...STAFF_DESIGNATIONS]}
            value={designation}
            onChange={(e) => { setDesignation(e.target.value); setPage(1); }}
            className="w-full sm:w-48"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center h-48 items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{t("staffPage.noStaff")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="p-3 text-left font-medium text-slate-600">{t("common.name")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("staffPage.employeeId")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("staffPage.designation")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">Main Work</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("fields.mobile")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("staffPage.classesColumn")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("common.status")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => {
                    const roleWork = getStaffRoleWork(s.designation);
                    return (
                      <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 font-medium">{s.firstName} {s.lastName}</td>
                        <td className="p-3 font-mono text-xs">{s.employeeId || "—"}</td>
                        <td className="p-3">{s.designation}</td>
                        <td className="p-3 text-xs text-slate-600">
                          {roleWork.length > 0 ? roleWork[0] : "General school operations"}
                        </td>
                        <td className="p-3">{s.mobileNumber}</td>
                        <td className="p-3">{s._count?.classes ?? 0}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {s.isActive ? t("common.active") : t("common.inactive")}
                          </span>
                        </td>
                        <td className="p-3">
                          <Link href={`/staff/${s.id}/edit`}>
                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <TablePagination page={page} total={total} onPageChange={setPage} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
