"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import { teacherTheme as tp } from "@/components/teacher/teacher-theme";
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
    <div className="space-y-3">
      <h1 className="text-lg font-bold md:text-xl">{t("teacherPortal.myClasses")}</h1>
      <div className="grid gap-2">
        {classes.map((cls) => (
          <Card key={cls.id} className={tp.cardHover}>
            <CardContent className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <Link href={`/classes/${cls.id}`} className="flex-1">
                <h3 className="text-base font-semibold">{cls.name}</h3>
                <p className="text-sm text-slate-500">{t("results.classLabel", { standard: cls.standard })}-{cls.section}</p>
                <p className="mt-0.5 text-xs text-slate-500">{t("teacherPortal.studentsEnrolled", { count: cls.students?.length || 0 })}</p>
              </Link>
              <Link href={`/teacher/attendance?classId=${cls.id}&month=${now.getMonth() + 1}&year=${now.getFullYear()}`}>
                <Button size="sm" className={tp.btn}>
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
