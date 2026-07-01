"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { STAFF_DESIGNATIONS } from "@/lib/constants";
import { Plus, Edit, Search, Users } from "lucide-react";
import type { Staff } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";

export default function StaffPage() {
  const t = useT();
  const [staff, setStaff] = useState<(Staff & { _count?: { classes: number } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [designation, setDesignation] = useState("");

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (designation) params.set("designation", designation);
    const res = await fetch(`/api/staff?${params}`);
    const data = await res.json();
    setStaff(data.staff || []);
    setLoading(false);
  }, [search, designation]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("staffPage.title")}</h1>
          <p className="text-slate-500 mt-1">{t("staffPage.staffCount", { count: staff.length })}</p>
        </div>
        <Link href="/staff/new">
          <Button><Plus className="h-4 w-4" /> {t("staffPage.addStaff")}</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              placeholder={t("staffPage.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <Select
            options={["", ...STAFF_DESIGNATIONS]}
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
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
                    <th className="p-3 text-left font-medium text-slate-600">{t("fields.mobile")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("staffPage.classesColumn")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("common.status")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium">{s.firstName} {s.lastName}</td>
                      <td className="p-3 font-mono text-xs">{s.employeeId || "—"}</td>
                      <td className="p-3">{s.designation}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
