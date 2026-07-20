"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { StudentForm } from "@/components/forms/student-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Student } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";

export default function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useT();
  const { id } = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/students/${id}`)
      .then((r) => r.json())
      .then(setStudent)
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!student) {
    return <p className="text-center text-slate-500 py-16">{t("students.notFound")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/students">
          <button className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("students.editTitle", { name: `${student.firstName} ${student.surname}` })}
          </h1>
          <p className="text-slate-500 mt-1">{t("students.editSubtitle")}</p>
        </div>
      </div>
      <StudentForm
        initialData={student}
        studentId={id}
        onSubmit={handleSubmit}
        onFinish={() => router.push(`/students/${id}`)}
        submitLabel={t("students.updateStudent")}
      />
    </div>
  );
}
