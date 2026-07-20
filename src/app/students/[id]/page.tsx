"use client";

import { useEffect, useState, use } from "react";
import { User } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";
import { StudentDetailView } from "@/components/students/student-detail-view";
import type { Student } from "@/generated/prisma/client";

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useT();
  const { id } = use(params);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/students/${id}`)
      .then((r) => r.json())
      .then(setStudent)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!student?.id) {
    return (
      <PageShell
        title={t("students.studentDetails")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.students"), href: "/students" },
        ]}
        icon={<User className="h-5 w-5" />}
      >
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <User className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-slate-500">{t("students.notFound")}</p>
        </div>
      </PageShell>
    );
  }

  return <StudentDetailView student={student} id={id} />;
}
