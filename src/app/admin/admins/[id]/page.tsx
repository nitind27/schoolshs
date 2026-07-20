"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/admin/admin-ui";
import { ArrowLeft, Save, ToggleLeft, ToggleRight, Trash2, ShieldAlert } from "lucide-react";
import { InfoModal } from "@/components/ui/info-modal";
import { useConfirm } from "@/hooks/use-confirm";

export default function EditAdminPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [schools, setSchools] = useState<{ id: string; name: string; code: string }[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    schoolId: "",
    isActive: true,
    emailVerified: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/schools").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
    ])
      .then(([schoolData, userData]) => {
        setSchools(schoolData.schools || []);
        const admin = (userData.users || []).find((u: { id: string }) => u.id === id);
        if (admin) {
          setForm({
            name: admin.name,
            email: admin.email,
            password: "",
            schoolId: admin.school.id,
            isActive: admin.isActive,
            emailVerified: admin.emailVerified ?? false,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      schoolId: form.schoolId,
      isActive: form.isActive,
    };
    if (form.password) body.password = form.password;

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) router.push("/admin/admins");
    else {
      const d = await res.json();
      setErrorMsg(d.error || "Failed");
    }
  };

  const toggleActive = async () => {
    const next = !form.isActive;

    await confirm({
      title: next ? "Activate Admin" : "Deactivate Admin",
      message: `${next ? "Activate" : "Deactivate"} this admin account? ${
        next ? "They will be able to sign in again." : "They will not be able to sign in."
      }`,
      confirmLabel: next ? "Activate" : "Deactivate",
      variant: "warning",
      onConfirm: async () => {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: next }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Failed");
          throw new Error(data.error || "Failed");
        }
        setForm((f) => ({ ...f, isActive: data.isActive }));
      },
    });
  };

  const remove = async () => {
    await confirm({
      title: "Delete Admin",
      message: `Permanently delete admin "${form.name}" (${form.email})? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        setDeleting(true);
        try {
          const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
          if (res.ok) {
            router.push("/admin/admins");
            return;
          }
          const d = await res.json();
          setErrorMsg(d.error || "Failed to delete");
          throw new Error(d.error || "Failed to delete");
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/admins">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Admin</h1>
          <p className="text-sm text-slate-500">Update credentials, school & account status</p>
        </div>
      </div>

      <Card className={form.isActive ? "border-emerald-100" : "border-red-100"}>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                form.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}
            >
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Account Status</p>
              <p className="text-xs text-slate-500">
                {form.isActive
                  ? "Admin can sign in to the school portal"
                  : "Login blocked — inactive accounts cannot sign in"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge active={form.isActive} />
            <Button type="button" variant="outline" size="sm" onClick={toggleActive}>
              {form.isActive ? (
                <>
                  <ToggleRight className="h-4 w-4 text-emerald-600" /> Deactivate
                </>
              ) : (
                <>
                  <ToggleLeft className="h-4 w-4" /> Activate
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Admin Details</CardTitle>
          <span
            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
              form.emailVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
            }`}
          >
            Email {form.emailVerified ? "verified" : "pending"}
          </span>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <Select
              label="School"
              required
              options={schools.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
              value={form.schoolId}
              onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
            />
            <Input
              label="Admin Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Email (Login)"
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="New Password (leave blank to keep)"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" variant="success" disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={remove}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" /> {deleting ? "Deleting..." : "Delete Admin"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog />

      <InfoModal
        isOpen={!!errorMsg}
        onClose={() => setErrorMsg(null)}
        title="Error"
      >
        <p className="text-sm text-slate-600">{errorMsg}</p>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setErrorMsg(null)}>OK</Button>
        </div>
      </InfoModal>
    </div>
  );
}
