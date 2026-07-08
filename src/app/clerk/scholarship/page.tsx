"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

const STATUS_FILTERS = ["draft", "ready", "submitted", "approved", "rejected"] as const;

export default function ClerkScholarshipPage() {
  const t = useT();
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);
  const [status, setStatus] = useState("ready");

  useEffect(() => {
    fetch(`/api/students?status=${status}`)
      .then((r) => r.json())
      .then((d) => setStudents(d.students || []));
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t("clerkPortal.scholarshipMgmt")}</h1>
          <p className="text-slate-500">{t("clerkPortal.scholarshipSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/bulk-submit"><Button><Send className="h-4 w-4" /> {t("clerkNav.bulkSubmit")}</Button></Link>
        </div>
      </div>

      <div className="flex gap-2">
        {STATUS_FILTERS.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-4 py-2 rounded-lg text-sm capitalize ${status === s ? "bg-amber-600 text-white" : "bg-white border"}`}>{t(`status.${s}`)}</button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>{t("students.title")} — {t(`status.${status}`)}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-slate-500"><th className="p-3">{t("common.name")}</th><th className="p-3">{t("admissions.class")}</th><th className="p-3">{t("fields.category")}</th><th className="p-3">{t("fields.scheme")}</th><th className="p-3">{t("common.status")}</th><th className="p-3">{t("common.actions")}</th></tr></thead>
            <tbody>
              {(Array.isArray(students) ? students : []).map((s) => (
                <tr key={s.id as string} className="border-b">
                  <td className="p-3 font-medium">{s.firstName as string} {s.surname as string}</td>
                  <td className="p-3">{s.standard as string}-{s.section as string}</td>
                  <td className="p-3">{s.category as string}</td>
                  <td className="p-3">{s.scholarshipScheme as string}</td>
                  <td className="p-3"><Badge status={s.status as string} /></td>
                  <td className="p-3"><Link href={`/students/${s.id}`}><Button variant="outline" size="sm">{t("common.view")}</Button></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
