"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n/locale-provider";
import { Edit, UserPlus, CreditCard, Users, ClipboardList } from "lucide-react";
import type { SchoolClass, Student, Staff } from "@/generated/prisma/client";

type ClassDetail = SchoolClass & {
  classTeacher: Staff | null;
  students: Student[];
  _count: { students: number };
};

export default function ClassDetailPage() {
  const t = useT();
  const params = useParams();
  const id = params.id as string;
  const [schoolClass, setSchoolClass] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/classes/${id}`)
      .then((r) => r.json())
      .then((d) => { setSchoolClass(d); setLoading(false); });
  }, [id]);

  if (loading || !schoolClass) {
    return (
      <div className="flex justify-center h-48 items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const teacherName = schoolClass.classTeacher
    ? `${schoolClass.classTeacher.firstName} ${schoolClass.classTeacher.lastName}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{schoolClass.name}</h1>
          <p className="text-slate-500 mt-1">
            {schoolClass.academicYear} · {t("classes.studentsCount", { count: schoolClass._count.students })}
            {teacherName && (
              <> · {t("classes.teacherPrefix", { name: teacherName })}</>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/attendance?classId=${id}&month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`}>
            <Button variant="outline"><ClipboardList className="h-4 w-4" /> {t("navExt.attendance")}</Button>
          </Link>
          <Link href={`/id-cards?classId=${id}`}>
            <Button variant="outline"><CreditCard className="h-4 w-4" /> {t("nav.idCards")}</Button>
          </Link>
          <Link href={`/students/new?classId=${id}`}>
            <Button><UserPlus className="h-4 w-4" /> {t("students.addStudent")}</Button>
          </Link>
        </div>
      </div>

      {schoolClass.institutionName && (
        <Card>
          <CardContent className="p-4 text-sm text-slate-600">
            <strong>{t("idCard.school")}:</strong> {schoolClass.institutionName}
            {schoolClass.institutionDistrict && ` · ${schoolClass.institutionDistrict}`}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {schoolClass.students.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{t("classes.noStudentsInClass")}</p>
              <Link href={`/students/new?classId=${id}`} className="inline-block mt-4">
                <Button>{t("classes.addFirstStudent")}</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="p-3 text-left font-medium text-slate-600">{t("fields.roll")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("common.name")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("fields.aadhaar")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("fields.mobile")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("common.status")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolClass.students.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-mono">{s.rollNumber || "—"}</td>
                      <td className="p-3 font-medium">{s.firstName} {s.surname}</td>
                      <td className="p-3 font-mono text-xs">{s.aadhaarNumber}</td>
                      <td className="p-3">{s.mobileNumber}</td>
                      <td className="p-3"><Badge status={s.status} /></td>
                      <td className="p-3">
                        <Link href={`/students/${s.id}/edit`}>
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
