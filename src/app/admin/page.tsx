"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { School, Users, GraduationCap, Plus, Shield, BookOpen, Activity } from "lucide-react";
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
    (a, s) => ({ schools: a.schools + 1, students: a.students + s._count.students, admins: a.admins + s._count.users }),
    { schools: 0, students: 0, admins: 0 }
  );
  const activeSchools = schools.filter((s) => s.isActive).length;
  const activeAdmins = admins.filter((a) => a.isActive).length;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 md:p-8"
        style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #6d28d9 100%)" }}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }} />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.2)" }}>
              <Shield className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{t("admin.title")}</h1>
              <p className="text-sm text-violet-200 mt-0.5">{t("admin.subtitle")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/schools/new">
              <Button className="bg-white text-violet-900 hover:bg-violet-50 shadow-md font-semibold">
                <Plus className="h-4 w-4" /> {t("admin.newSchool")}
              </Button>
            </Link>
            <Link href="/admin/admins/new">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Users className="h-4 w-4" /> {t("admin.newAdmin")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label={t("admin.totalSchools")}
          value={totals.schools}
          icon={<School className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-violet-600 to-purple-700"
        />
        <StatCard
          label={t("admin.totalStudents")}
          value={totals.students.toLocaleString("en-IN")}
          icon={<GraduationCap className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-blue-600 to-blue-700"
        />
        <StatCard
          label={t("admin.schoolAdmins")}
          value={totals.admins}
          icon={<Users className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-emerald-600 to-teal-700"
        />
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Active Schools</p>
          <p className="text-3xl font-bold text-emerald-700">{activeSchools}</p>
          <p className="text-xs text-slate-400 mt-1">Inactive: {totals.schools - activeSchools}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Active Admins</p>
          <p className="text-3xl font-bold text-blue-700">{activeAdmins}</p>
          <p className="text-xs text-slate-400 mt-1">Inactive: {totals.admins - activeAdmins}</p>
        </div>
      </div>

      {/* Schools table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-violet-600" />
              </div>
              <CardTitle>{t("admin.allSchools")}</CardTitle>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">{schools.length} schools</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center h-32 items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-200 border-t-violet-600" />
            </div>
          ) : schools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <School className="h-10 w-10 mb-3 opacity-40" />
              <p>{t("admin.noSchools")}</p>
              <Link href="/admin/schools/new" className="mt-3">
                <Button size="sm"><Plus className="h-3.5 w-3.5" /> Register School</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("common.code")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("admin.schoolName")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("common.district")}</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("admin.students")}</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("nav.classes")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("admin.admins")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {schools.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-violet-700 bg-violet-50/30">{s.code}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{s.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{s.district || "—"}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-semibold text-slate-800">{s._count.students.toLocaleString("en-IN")}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-600">{s._count.classes}</td>
                      <td className="px-5 py-3.5">
                        {s.users.slice(0, 2).map((u) => (
                          <span key={u.id} className="block text-xs text-slate-500 font-mono truncate max-w-[160px]">{u.email}</span>
                        ))}
                        {s.users.length > 2 && <span className="text-xs text-slate-400">+{s.users.length - 2} more</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
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

      {/* Admins table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle>{t("admin.allAdmins")}</CardTitle>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">{admins.length} admins</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center h-24 items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-600" />
            </div>
          ) : admins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Users className="h-8 w-8 mb-2 opacity-40" />
              <p>{t("admin.noAdmins")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("common.name")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("admin.emailLoginHeader")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("admin.selectSchool")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("admin.lastLogin")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {admins.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700 uppercase">
                            {a.name.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-800">{a.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{a.email}</td>
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-medium text-slate-800 text-xs">{a.school.name}</p>
                          <p className="font-mono text-[11px] text-violet-600">{a.school.code}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : <span className="text-slate-300">{t("common.never")}</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${a.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${a.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
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
