"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function NewAdminPage() {
  return (
    <Suspense>
      <NewAdminForm />
    </Suspense>
  );
}

function NewAdminForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSchool = searchParams.get("schoolId") || "";
  const [schools, setSchools] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", schoolId: preselectedSchool });

  useEffect(() => {
    fetch("/api/admin/schools")
      .then((r) => r.json())
      .then((d) => setSchools(d.schools || []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      alert(data.error || t("common.error"));
      return;
    }
    alert(t("admin.adminCreated", { email: data.email }));
    router.push("/admin");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">{t("admin.createSchoolAdmin")}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("admin.adminCredentials")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Select
              label={t("admin.selectSchool")}
              required
              options={[{ value: "", label: t("admin.selectSchoolPlaceholder") }, ...schools.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))]}
              value={form.schoolId}
              onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
            />
            <Input label={t("admin.adminName")} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label={t("admin.emailLogin")} required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label={t("admin.passwordMin")} required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <p className="text-xs text-slate-500">{t("admin.adminIsolationNote")}</p>
            <Button type="submit" variant="success" disabled={loading}>
              <Save className="h-4 w-4" /> {loading ? t("common.creating") : t("admin.createAdmin")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
