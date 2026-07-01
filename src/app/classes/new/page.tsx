"use client";

import { useRouter } from "next/navigation";
import { ClassForm } from "@/components/forms/class-form";
import type { SchoolClass } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";

export default function NewClassPage() {
  const t = useT();
  const router = useRouter();

  const handleSubmit = async (data: Partial<SchoolClass>) => {
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      alert(result.error || t("classes.saveClassFailed"));
      return;
    }
    router.push(`/classes/${result.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("classes.addClass")}</h1>
        <p className="text-slate-500 mt-1">{t("classes.newClassSubtitle")}</p>
      </div>
      <ClassForm onSubmit={handleSubmit} />
    </div>
  );
}
