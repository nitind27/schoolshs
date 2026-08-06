"use client";

import { PageLoader } from "@/components/ui/loader";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { StudentForm } from "@/components/forms/student-form";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import type { Student } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";

export default function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useT();
  const { id } = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashHref, setDashHref] = useState("/dashboard");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.role === "clerk") setDashHref("/clerk");
      })
      .catch(() => {});
  }, []);

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

  const handleSubmit = async (data: Record<string, unknown>) => {
    const res = await fetch(`/api/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) return id;
    const err = await res.json();
    alert(err.error || t("students.updateFailed"));
    return undefined;
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!student) {
    return <p className="py-16 text-center text-slate-500">{t("students.notFound")}</p>;
  }

  const displayName = `${student.firstName || ""} ${student.surname || ""}`.trim() || t("students.editStudent");

  return (
    <PageShell
      title={t("students.editTitle", { name: displayName })}
      subtitle={t("students.editSubtitle")}
      icon={<Pencil className="h-5 w-5 text-teal-700" />}
      accentColor="border-teal-500"
      breadcrumbs={[
        { label: t("nav.dashboard"), href: dashHref },
        { label: t("nav.students"), href: "/students" },
        { label: t("students.editStudent") },
      ]}
      actions={(
        <Link href={`/students/${id}`} className="w-full sm:w-auto">
          <button
            type="button"
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" /> {t("common.back")}
          </button>
        </Link>
      )}
    >
      <StudentForm
        initialData={student}
        studentId={id}
        onSubmit={handleSubmit}
        onFinish={() => router.push(`/students/${id}`)}
        submitLabel={t("students.updateStudent")}
      />
    </PageShell>
  );
}
