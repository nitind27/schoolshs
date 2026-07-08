"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentForm } from "@/components/forms/student-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";

function NewStudentContent() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId") || undefined;

  const handleSubmit = async (data: Record<string, unknown>) => {
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const student = await res.json();
      if (classId) router.push(`/classes/${classId}`);
      else router.push(`/students/${student.id}`);
    } else {
      const err = await res.json();
      alert(err.error || err.errors?.map((e: { message: string }) => e.message).join("\n") || t("students.saveFailed"));
    }
  };

  return (
    <PageShell
      title={t("students.newStudent")}
      subtitle={t("students.newStudentSubtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/" },
        { label: t("nav.classes"), href: "/classes" },
        { label: t("nav.students"), href: "/students" },
        { label: t("students.newStudent") },
      ]}
      actions={(
        <Link href={classId ? `/classes/${classId}` : "/students"}>
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </Link>
      )}
    >
      <StudentForm onSubmit={handleSubmit} initialClassId={classId} />
    </PageShell>
  );
}

export default function NewStudentPage() {
  return (
    <Suspense fallback={<div className="flex justify-center h-48 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
      <NewStudentContent />
    </Suspense>
  );
}
