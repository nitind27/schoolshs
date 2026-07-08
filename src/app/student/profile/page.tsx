"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/i18n/locale-provider";

export default function StudentProfilePage() {
  const t = useT();
  const [student, setStudent] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/student-portal").then((r) => r.json()).then((d) => setStudent(d.student));
  }, []);

  if (!student) return null;

  const fields: [string, unknown][] = [
    [t("studentPortal.fullName"), `${student.firstName} ${student.middleName || ""} ${student.surname}`],
    [t("studentPortal.aadhaarName"), student.aadhaarName],
    [t("studentPortal.dob"), student.dateOfBirth],
    [t("studentPortal.gender"), student.gender],
    [t("studentPortal.aadhaar"), student.aadhaarNumber],
    [t("studentPortal.mobile"), student.mobileNumber],
    [t("studentPortal.father"), student.fatherName],
    [t("studentPortal.mother"), student.motherName],
    [t("studentPortal.category"), student.category],
    [t("studentPortal.class"), `${student.standard}-${student.section}`],
    [t("studentPortal.rollNumber"), student.rollNumber],
    [t("studentPortal.grNumber"), student.grNumber],
    [t("studentPortal.bloodGroup"), student.bloodGroup],
    [t("studentPortal.address"), student.currentAddress],
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">{t("studentNav.myProfile")}</h1>
      <Card>
        <CardHeader><CardTitle>{t("studentPortal.personalInfo")}</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          {fields.map(([label, value]) => (
            <div key={label} className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="font-medium text-sm mt-1">{(value as string) || "—"}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
