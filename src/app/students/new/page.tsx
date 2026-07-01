"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentForm } from "@/components/forms/student-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useT } from "@/i18n/locale-provider";

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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={classId ? `/classes/${classId}` : "/students"}>
          <button className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("students.newStudent")}</h1>
          <p className="text-slate-500 mt-1">{t("students.newStudentSubtitle")}</p>
        </div>
      </div>
      <StudentForm onSubmit={handleSubmit} initialClassId={classId} />
    </div>
  );
}

export default function NewStudentPage() {
  return (
    <Suspense fallback={<div className="flex justify-center h-48 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
      <NewStudentContent />
    </Suspense>
  );
}
