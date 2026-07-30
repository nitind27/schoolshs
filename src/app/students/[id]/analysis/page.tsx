"use client";

import { Spinner } from "@/components/ui/loader";
import { useEffect, useState, use } from "react";
import { FileBadge, User } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";
import { StudentAnalysisView } from "@/components/students/student-analysis-view";
import type { Student } from "@/generated/prisma/client";

export default function StudentAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useT();
  const { id } = use(params);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/students/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error || !data?.id) {
          setStudent(null);
          return;
        }
        setStudent(data);
      })
      .catch(() => setStudent(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!student?.id) {
    return (
      <PageShell
        title={t("studentAnalysis.title")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.students"), href: "/students" },
        ]}
        icon={<FileBadge className="h-5 w-5" />}
      >
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <User className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-slate-500">{t("students.notFound")}</p>
        </div>
      </PageShell>
    );
  }

  return <StudentAnalysisView student={student} id={id} />;
}
