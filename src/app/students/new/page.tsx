"use client";

import { PageLoader } from "@/components/ui/loader";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentForm } from "@/components/forms/student-form";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";

function NewStudentContent() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId") || undefined;
  const standard = searchParams.get("standard") || undefined;
  const [dashHref, setDashHref] = useState("/dashboard");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.role === "clerk") setDashHref("/clerk");
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (data: Record<string, unknown>) => {
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const student = await res.json();
      return student.id as string;
    }
    const err = await res.json();
    alert(err.error || err.errors?.map((e: { message: string }) => e.message).join("\n") || t("students.saveFailed"));
    return undefined;
  };

  const handleFinish = (finishClassId?: string) => {
    if (finishClassId) router.push(`/classes/${finishClassId}`);
    else router.push("/students");
  };

  return (
    <PageShell
      title={t("students.newStudent")}
      subtitle={t("students.newStudentSubtitle")}
      icon={<UserPlus className="h-5 w-5 text-teal-700" />}
      accentColor="border-teal-500"
      breadcrumbs={[
        { label: t("nav.dashboard"), href: dashHref },
        { label: t("nav.students"), href: "/students" },
        { label: t("students.newStudent") },
      ]}
      actions={(
        <Link
          href={classId ? `/classes/${classId}` : "/students"}
          className="w-full sm:w-auto"
        >
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
        onSubmit={handleSubmit}
        onFinish={() => handleFinish(classId)}
        initialClassId={classId}
        initialStandard={standard}
      />
    </PageShell>
  );
}

export default function NewStudentPage() {
  return (
    <Suspense
      fallback={
        <PageLoader />
      }
    >
      <NewStudentContent />
    </Suspense>
  );
}
