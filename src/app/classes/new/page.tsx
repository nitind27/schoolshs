"use client";

import { useRouter } from "next/navigation";
import { ClassForm } from "@/components/forms/class-form";
import type { SchoolClass } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";

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
    <PageShell
      title={t("classes.addClass")}
      subtitle={t("classes.newClassSubtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/" },
        { label: t("nav.classes"), href: "/classes" },
        { label: t("classes.addClass") },
      ]}
    >
      <ClassForm onSubmit={handleSubmit} />
    </PageShell>
  );
}
