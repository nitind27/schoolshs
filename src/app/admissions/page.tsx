"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, CheckCircle, XCircle, Eye } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

interface Student {
  id: string;
  firstName: string;
  surname: string;
  standard: string | null;
  section: string | null;
  grNumber: string | null;
  admissionStatus: string;
  category: string;
  mobileNumber: string;
  createdAt: string;
}

export default function AdmissionsPage() {
  const t = useT();
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<{ admissionStatus: string; _count: number }[]>([]);
  const [status, setStatus] = useState("pending");

  const statusLabel = (s: string) => {
    const key = t(`admissionStatus.${s}`);
    return key === `admissionStatus.${s}` ? s : key;
  };

  const load = () => {
    fetch(`/api/admissions?status=${status}`)
      .then((r) => r.json())
      .then((d) => { setStudents(d.students || []); setStats(d.stats || []); });
  };

  useEffect(load, [status]);

  const verify = async (studentId: string, admissionStatus: string) => {
    await fetch("/api/admissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, admissionStatus }),
    });
    load();
  };

  const pending = stats.find((s) => s.admissionStatus === "pending")?._count || 0;
  const verified = stats.find((s) => s.admissionStatus === "verified")?._count || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admissions.title")}</h1>
        <p className="text-slate-500">{t("admissions.subtitle")}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><p className="text-sm text-slate-500">{t("admissions.pending")}</p><p className="text-3xl font-bold text-amber-600">{pending}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-slate-500">{t("admissions.verified")}</p><p className="text-3xl font-bold text-emerald-600">{verified}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-slate-500">{t("admissions.total")}</p><p className="text-3xl font-bold">{stats.reduce((s, x) => s + x._count, 0)}</p></CardContent></Card>
      </div>

      <div className="flex gap-2">
        {["pending", "verified", "rejected"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-4 py-2 rounded-lg text-sm font-medium ${status === s ? "bg-blue-600 text-white" : "bg-white border"}`}>
            {statusLabel(s)}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            {t("admissions.applications")} — {statusLabel(status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="p-3">{t("admissions.name")}</th>
                <th className="p-3">{t("admissions.class")}</th>
                <th className="p-3">{t("admissions.grNo")}</th>
                <th className="p-3">{t("admissions.category")}</th>
                <th className="p-3">{t("admissions.mobile")}</th>
                <th className="p-3">{t("admissions.date")}</th>
                <th className="p-3">{t("admissions.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-medium">{s.firstName} {s.surname}</td>
                  <td className="p-3">{s.standard}-{s.section}</td>
                  <td className="p-3">{s.grNumber || "—"}</td>
                  <td className="p-3"><Badge status={s.category === "SC" || s.category === "ST" ? "submitted" : "draft"} /></td>
                  <td className="p-3">{s.mobileNumber}</td>
                  <td className="p-3">{new Date(s.createdAt).toLocaleDateString("en-IN")}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link href={`/students/${s.id}`}><Button variant="outline" size="sm"><Eye className="h-4 w-4" /></Button></Link>
                      {status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => verify(s.id, "verified")}><CheckCircle className="h-4 w-4 text-emerald-600" /></Button>
                          <Button variant="outline" size="sm" onClick={() => verify(s.id, "rejected")}><XCircle className="h-4 w-4 text-red-600" /></Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!students.length && <p className="text-center py-8 text-slate-500">{t("admissions.noApplications", { status: statusLabel(status) })}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
