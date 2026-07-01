"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { School, Users, GraduationCap, Plus, Shield } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

interface SchoolRow {
  id: string;
  name: string;
  code: string;
  district?: string | null;
  isActive: boolean;
  _count: { students: number; users: number; classes: number; staff: number };
  users: { id: string; email: string; name: string; isActive: boolean }[];
}

interface AdminRow {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  school: { id: string; name: string; code: string };
}

export default function AdminDashboardPage() {
  const t = useT();
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/schools").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
    ])
      .then(([schoolData, adminData]) => {
        setSchools(schoolData.schools || []);
        setAdmins(adminData.users || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const totals = schools.reduce(
    (a, s) => ({
      schools: a.schools + 1,
      students: a.students + s._count.students,
      admins: a.admins + s._count.users,
    }),
    { schools: 0, students: 0, admins: 0 }
  );

  const statCards = [
    { label: t("admin.totalSchools"), value: totals.schools, icon: School, color: "bg-violet-500" },
    { label: t("admin.totalStudents"), value: totals.students, icon: GraduationCap, color: "bg-blue-500" },
    { label: t("admin.schoolAdmins"), value: totals.admins, icon: Users, color: "bg-emerald-500" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-7 w-7 text-violet-600" />
            {t("admin.title")}
          </h1>
          <p className="text-slate-500 mt-1">{t("admin.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/schools/new"><Button><Plus className="h-4 w-4" /> {t("admin.newSchool")}</Button></Link>
          <Link href="/admin/admins/new"><Button variant="outline"><Users className="h-4 w-4" /> {t("admin.newAdmin")}</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{c.label}</p>
                <p className="text-3xl font-bold mt-1">{c.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${c.color}`}>
                <c.icon className="h-6 w-6 text-white" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.allSchools")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center h-32 items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
          ) : schools.length === 0 ? (
            <p className="text-center py-12 text-slate-500">{t("admin.noSchools")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="p-3 text-left font-medium">{t("common.code")}</th>
                    <th className="p-3 text-left font-medium">{t("admin.schoolName")}</th>
                    <th className="p-3 text-left font-medium">{t("common.district")}</th>
                    <th className="p-3 text-left font-medium">{t("admin.students")}</th>
                    <th className="p-3 text-left font-medium">{t("nav.classes")}</th>
                    <th className="p-3 text-left font-medium">{t("admin.admins")}</th>
                    <th className="p-3 text-left font-medium">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-violet-700">{s.code}</td>
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3">{s.district || "—"}</td>
                      <td className="p-3">{s._count.students}</td>
                      <td className="p-3">{s._count.classes}</td>
                      <td className="p-3">
                        {s.users.map((u) => (
                          <span key={u.id} className="block text-xs text-slate-600">{u.email}</span>
                        ))}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${s.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {s.isActive ? t("common.active") : t("common.inactive")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.allAdmins")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center h-24 items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600" />
            </div>
          ) : admins.length === 0 ? (
            <p className="text-center py-8 text-slate-500">{t("admin.noAdmins")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="p-3 text-left font-medium">{t("common.name")}</th>
                    <th className="p-3 text-left font-medium">{t("admin.emailLoginHeader")}</th>
                    <th className="p-3 text-left font-medium">{t("admin.selectSchool")}</th>
                    <th className="p-3 text-left font-medium">{t("common.code")}</th>
                    <th className="p-3 text-left font-medium">{t("admin.lastLogin")}</th>
                    <th className="p-3 text-left font-medium">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-medium">{a.name}</td>
                      <td className="p-3 font-mono text-xs">{a.email}</td>
                      <td className="p-3">{a.school.name}</td>
                      <td className="p-3 font-mono text-violet-700">{a.school.code}</td>
                      <td className="p-3 text-slate-500 text-xs">
                        {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString("en-IN") : t("common.never")}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${a.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {a.isActive ? t("common.active") : t("common.inactive")}
                        </span>
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
