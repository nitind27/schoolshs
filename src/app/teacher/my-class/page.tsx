"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import { ClipboardList } from "lucide-react";

type TeacherClass = {
  id: string;
  name: string;
  standard: string;
  section: string;
  students?: unknown[];
};

export default function TeacherMyClassPage() {
  const t = useT();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const now = new Date();

  useEffect(() => {
    fetch("/api/teacher").then((r) => r.json()).then((d) => setClasses(d.classes || []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("teacherPortal.myClasses")}</h1>
      <div className="grid gap-4">
        {classes.map((cls) => (
          <Card key={cls.id} className="hover:border-emerald-300">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <Link href={`/classes/${cls.id}`} className="flex-1">
                <h3 className="font-semibold text-lg">{cls.name}</h3>
                <p className="text-slate-500">{t("results.classLabel", { standard: cls.standard })}-{cls.section}</p>
                <p className="text-sm text-slate-500 mt-1">{t("teacherPortal.studentsEnrolled", { count: cls.students?.length || 0 })}</p>
              </Link>
              <Link href={`/teacher/attendance?classId=${cls.id}&month=${now.getMonth() + 1}&year=${now.getFullYear()}`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <ClipboardList className="h-4 w-4" />
                  {t("teacherPortal.markAttendanceBtn")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
        {!classes.length && <p className="text-slate-500">{t("teacherPortal.noClassAssigned")}</p>}
      </div>
    </div>
  );
}
