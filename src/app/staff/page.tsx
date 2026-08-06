"use client";

import { PageLoader } from "@/components/ui/loader";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { STAFF_DESIGNATIONS, getStaffRoleWork } from "@/lib/constants";
import { Plus, Edit, Search, Users, ClipboardList, IndianRupee, KeyRound } from "lucide-react";
import type { Staff } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";
import { PAGE_SIZE } from "@/lib/pagination";
import type { ColumnDef } from "@tanstack/react-table";
import { GlobalDataTable } from "@/components/ui/global-data-table";

type StaffRow = Staff & { _count?: { classes: number } };

export default function StaffPage() {
  const t = useT();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [designation, setDesignation] = useState("");
  const [dashHref, setDashHref] = useState("/dashboard");
  const [isAdmin, setIsAdmin] = useState(false);
  const [hrSummary, setHrSummary] = useState<{
    totalStaff: number;
    withSalary: number;
    attendanceMarked: number;
    payrollPending: number;
    totalNet: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.role === "clerk") setDashHref("/clerk");
        setIsAdmin(d?.user?.role === "school_admin");
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

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    fetch("/api/staff-hr/summary").then((r) => r.json()).then(setHrSummary).catch(() => {});
  }, []);

  const teacherCount = staff.filter((s) => ["teacher", "head teacher"].includes(String(s.designation || "").toLowerCase())).length;
  const peonCount = staff.filter((s) => ["peon", "puen"].includes(String(s.designation || "").toLowerCase())).length;
  const supervisorCount = staff.filter((s) => String(s.designation || "").toLowerCase() === "supervisor").length;

  const columns = useMemo<ColumnDef<StaffRow>[]>(
    () => [
      {
        header: t("common.name"),
        accessorFn: (s) => `${s.firstName || ""} ${s.lastName || ""}`.trim(),
        cell: ({ row }) => <p className="font-semibold text-slate-900">{row.original.firstName} {row.original.lastName}</p>,
      },
      {
        header: t("staffPage.teacherCode"),
        accessorKey: "employeeId",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.employeeId || "—"}</span>,
      },
      {
        header: t("staffPage.designation"),
        accessorKey: "designation",
      },
      {
        header: "Main Work",
        accessorFn: (s) => {
          const roleWork = getStaffRoleWork(s.designation);
          return roleWork.length > 0 ? roleWork[0] : "General school operations";
        },
        cell: ({ getValue }) => <span className="text-xs text-slate-600">{String(getValue())}</span>,
      },
      {
        header: t("fields.mobile"),
        accessorKey: "mobileNumber",
        cell: ({ row }) => row.original.mobileNumber || "—",
      },
      {
        header: t("staffPage.classesColumn"),
        accessorFn: (s) => s._count?.classes ?? 0,
        cell: ({ getValue }) => <span className="font-semibold">{String(getValue())}</span>,
      },
      {
        header: t("common.status"),
        accessorFn: (s) => (s.isActive ? t("common.active") : t("common.inactive")),
        cell: ({ row }) => (
          <span className={`rounded-full px-2 py-0.5 text-xs ${row.original.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {row.original.isActive ? t("common.active") : t("common.inactive")}
          </span>
        ),
      },
      {
        header: t("common.actions"),
        id: "actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-0.5">
            {isAdmin && (
              <Link href={`/staff/${row.original.id}/account`} title={t("accountSettings.loginPasswordAction")}>
                <Button variant="ghost" size="icon" className="text-teal-700 hover:bg-teal-50 hover:text-teal-800">
                  <KeyRound className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Link href={`/staff/${row.original.id}/edit`} title={t("common.edit")}>
              <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
            </Link>
          </div>
        ),
      },
    ],
    [isAdmin, t],
  );

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
          <Link href="/staff/register" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto"><ClipboardList className="h-4 w-4" /> {t("staffRegister.title")}</Button>
          </Link>
          <Link href="/staff/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto"><Plus className="h-4 w-4" /> {t("staffPage.addStaff")}</Button>
          </Link>
        </>
      )}
    >
      <Card>
        <CardContent className="p-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Teacher</p><p className="text-xl sm:text-2xl font-bold text-slate-900">{teacherCount}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Peon</p><p className="text-xl sm:text-2xl font-bold text-slate-900">{peonCount}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Supervisor</p><p className="text-xl sm:text-2xl font-bold text-slate-900">{supervisorCount}</p></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/staff/attendance" className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 p-4 sm:p-5 hover:shadow-md transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><ClipboardList className="h-7 w-7 sm:h-8 sm:w-8 text-violet-600 mb-2" /><p className="font-bold text-slate-900 text-base sm:text-lg">{t("staffHr.attendanceTitle")}</p><p className="text-sm text-slate-600 mt-1">{t("staffHr.attendanceCardDesc")}</p></div>
            <span className="text-xl sm:text-2xl font-black text-violet-600 shrink-0">{hrSummary?.attendanceMarked ?? 0}/{hrSummary?.totalStaff ?? 0}</span>
          </div>
        </Link>
        <Link href="/staff/payroll" className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 p-4 sm:p-5 hover:shadow-md transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><IndianRupee className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600 mb-2" /><p className="font-bold text-slate-900 text-base sm:text-lg">{t("staffHr.payrollTitle")}</p><p className="text-sm text-slate-600 mt-1">{t("staffHr.payrollCardDesc")}</p></div>
            <div className="text-right shrink-0"><p className="text-base sm:text-lg font-black text-emerald-700">₹{(hrSummary?.totalNet ?? 0).toLocaleString("en-IN")}</p><p className="text-xs text-amber-600">{hrSummary?.payrollPending ?? 0} {t("staffHr.pending")}</p></div>
          </div>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col gap-3">
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
            options={[...STAFF_DESIGNATIONS]}
            emptyLabel={t("staffPage.allDesignations")}
            value={designation}
            onChange={(e) => { setDesignation(e.target.value); setPage(1); }}
            className="w-full sm:w-48"
          />
        </CardContent>
      </Card>

      {loading && staff.length === 0 ? (
        <PageLoader />
      ) : (
        <GlobalDataTable
          data={staff}
          columns={columns}
          loading={loading}
          emptyText={t("staffPage.noStaff")}
          manualPagination
          totalRows={total}
          pageSize={PAGE_SIZE}
          pageIndex={Math.max(page - 1, 0)}
          onPageChange={(idx) => setPage(idx + 1)}
        />
      )}
    </PageShell>
  );
}
