"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { GUJARAT_DISTRICTS } from "@/lib/constants";
import { ArrowLeft, Save } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function NewSchoolPage() {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    district: "",
    address: "",
    phone: "",
    email: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/admin/schools", {
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
    router.push("/admin");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">{t("admin.newSchool")}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("admin.schoolDetails")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={t("admin.schoolName")} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label={t("admin.schoolCode")} required placeholder="ABC001" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            <Select label={t("common.district")} options={GUJARAT_DISTRICTS} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
            <Input label={t("common.phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label={t("common.email")} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div className="md:col-span-2">
              <Input label={t("common.address")} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" variant="success" disabled={loading}>
                <Save className="h-4 w-4" /> {loading ? t("common.saving") : t("admin.createSchool")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
