"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/i18n/locale-provider";

export default function TeacherMyClassPage() {
  const t = useT();
  const [classes, setClasses] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    fetch("/api/teacher").then((r) => r.json()).then((d) => setClasses(d.classes || []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("teacherPortal.myClasses")}</h1>
      <div className="grid gap-4">
        {classes.map((cls) => (
          <Link key={cls.id as string} href={`/classes/${cls.id}`}>
            <Card className="hover:border-emerald-300">
              <CardContent className="p-6">
                <h3 className="font-semibold">{cls.name as string}</h3>
                <p className="text-slate-500">{t("teacherPortal.studentsEnrolled", { count: (cls.students as unknown[])?.length || 0 })}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {!classes.length && <p className="text-slate-500">{t("teacherPortal.noClassAssigned")}</p>}
      </div>
    </div>
  );
}
