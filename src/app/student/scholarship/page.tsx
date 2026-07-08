"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n/locale-provider";

export default function StudentScholarshipPage() {
  const t = useT();
  const [student, setStudent] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/student-portal").then((r) => r.json()).then((d) => setStudent(d.student));
  }, []);

  if (!student) return null;

  const admissionStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: t("admissionStatus.pending"),
      verified: t("admissionStatus.verified"),
      rejected: t("admissionStatus.rejected"),
    };
    return map[status] || status;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">{t("studentPortal.scholarshipStatus")}</h1>
      <Card>
        <CardContent className="p-8 text-center">
          <Badge status={student.status as string} />
          <h2 className="text-xl font-bold mt-4">{student.scholarshipScheme as string}</h2>
          <p className="text-slate-500 mt-2">{t("fields.financialYear")}: {student.financialYear as string}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("studentPortal.applicationDetails")}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-slate-50 rounded-lg"><p className="text-slate-500">{t("studentPortal.category")}</p><p className="font-medium">{student.category as string}</p></div>
          <div className="p-3 bg-slate-50 rounded-lg"><p className="text-slate-500">{t("fields.course")}</p><p className="font-medium">{student.courseName as string}</p></div>
          <div className="p-3 bg-slate-50 rounded-lg"><p className="text-slate-500">{t("studentPortal.annualIncome")}</p><p className="font-medium">₹{student.annualFamilyIncome as number}</p></div>
          <div className="p-3 bg-slate-50 rounded-lg"><p className="text-slate-500">{t("studentPortal.admission")}</p><p className="font-medium">{admissionStatusLabel(student.admissionStatus as string)}</p></div>
          <div className="p-3 bg-slate-50 rounded-lg col-span-2"><p className="text-slate-500">{t("studentPortal.bank")}</p><p className="font-medium">{student.bankName as string} — {student.accountNumber as string}</p></div>
        </CardContent>
      </Card>
    </div>
  );
}
