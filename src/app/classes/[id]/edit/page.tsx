"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClassForm } from "@/components/forms/class-form";
import type { SchoolClass } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";
import { canManageClasses } from "@/lib/roles";

export default function EditClassPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [homeHref, setHomeHref] = useState("/dashboard");
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const role = d.user?.role as string | undefined;
        setHomeHref(role === "clerk" ? "/clerk" : "/dashboard");
        if (!role || !canManageClasses(role)) setForbidden(true);
      });
  }, []);

  useEffect(() => {
    fetch(`/api/classes/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setSchoolClass(null);
        else setSchoolClass(d);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: Partial<SchoolClass>) => {
    const res = await fetch(`/api/classes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      alert(result.error || t("classes.updateClassFailed"));
      return;
    }
    router.push(`/classes/${id}`);
  };

  if (forbidden) {
    return <p className="text-center text-slate-500 py-16">{t("common.error")}</p>;
  }

  if (loading) {
    return (
      <div className="flex justify-center h-48 items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!schoolClass) {
    return <p className="text-center text-slate-500 py-16">{t("classes.noClasses")}</p>;
  }

  return (
    <PageShell
      title={t("classes.editClass")}
      subtitle={t("classes.editClassSubtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: homeHref },
        { label: t("nav.classes"), href: "/classes" },
        { label: schoolClass.name, href: `/classes/${id}` },
        { label: t("classes.editClass") },
      ]}
    >
      <ClassForm
        initialData={schoolClass}
        onSubmit={handleSubmit}
        submitLabel={t("classes.updateClass")}
        onCancel={() => router.push(`/classes/${id}`)}
      />
    </PageShell>
  );
}
