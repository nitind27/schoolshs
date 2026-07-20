"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FeatureToggleGrid } from "@/components/admin/feature-toggle-grid";
import { FileUploadField } from "@/components/admin/file-upload-field";
import { formatINR, StatusBadge } from "@/components/admin/admin-ui";
import { PAYMENT_METHODS, normalizeFeatureList, type SchoolFeatureKey } from "@/lib/school-features";
import {
  ArrowLeft, School, Save, ToggleLeft, ToggleRight, FileText,
  CreditCard, LayoutGrid, Users, MapPin, Phone, Mail, Globe,
} from "lucide-react";

type Tab = "overview" | "contract" | "payments" | "features" | "admins";

export default function SchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [school, setSchool] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [features, setFeatures] = useState<SchoolFeatureKey[]>([]);
  const [planName, setPlanName] = useState("standard");
  const [paymentForm, setPaymentForm] = useState({ amount: "", paymentMethod: "bank_transfer", referenceNo: "", notes: "" });

  const load = useCallback(() => {
    fetch(`/api/admin/schools/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setSchool(d);
        const sub = d.subscription as { enabledFeatures?: unknown; planName?: string } | null;
        if (sub) {
          setFeatures(normalizeFeatureList(sub.enabledFeatures));
          setPlanName(sub.planName || "standard");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async () => {
    if (!school) return;
    await fetch(`/api/admin/schools/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !school.isActive }),
    });
    load();
  };

  const saveFeatures = async () => {
    setSaving(true);
    await fetch(`/api/admin/schools/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabledFeatures: features, planName }),
    });
    setSaving(false);
    load();
  };

  const addPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/admin/schools/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentForm),
    });
    if (res.ok) {
      setPaymentForm({ amount: "", paymentMethod: "bank_transfer", referenceNo: "", notes: "" });
      load();
    } else {
      const d = await res.json();
      alert(d.error || "Failed");
    }
  };

  const uploadLogo = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`/api/admin/schools/${id}/logo`, { method: "POST", body: fd });
    load();
  };

  const uploadContract = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`/api/admin/schools/${id}/contract`, { method: "POST", body: fd });
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  if (!school) return <p className="text-center py-20 text-slate-500">School not found</p>;

  const sub = school.subscription as Record<string, unknown> | null;
  const settings = school.settings as { logoPath?: string } | null;
  const payments = (school.payments as Array<Record<string, unknown>>) || [];
  const admins = (school.users as Array<Record<string, unknown>>) || [];
  const counts = school._count as { students: number; classes: number; staff: number };

  const tabs: { id: Tab; label: string; icon: typeof School }[] = [
    { id: "overview", label: "Overview", icon: School },
    { id: "contract", label: "Contract", icon: FileText },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "features", label: "Panel Access", icon: LayoutGrid },
    { id: "admins", label: "Admins", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/schools"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          {settings?.logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/uploads/${settings.logoPath}`} alt="" className="h-14 w-14 rounded-2xl object-cover border-2 border-white shadow" />
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-violet-600 flex items-center justify-center"><School className="h-7 w-7 text-white" /></div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{String(school.name)}</h1>
            <p className="text-sm font-mono text-violet-600">{String(school.code)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge active={Boolean(school.isActive)} />
          <Button variant="outline" size="sm" onClick={toggleActive}>
            {school.isActive ? <><ToggleRight className="h-4 w-4 text-emerald-600" /> Deactivate</> : <><ToggleLeft className="h-4 w-4" /> Activate</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Students", value: counts.students },
          { label: "Classes", value: counts.classes },
          { label: "Staff", value: counts.staff },
          { label: "Plan", value: String(sub?.planName || "—") },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-xl font-bold text-slate-900 capitalize">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Contact & Location</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { icon: MapPin, label: "Address", value: [school.address, school.taluka, school.city, school.district, school.pincode].filter(Boolean).join(", ") },
                { icon: Phone, label: "Phone", value: school.phone },
                { icon: Phone, label: "Alt. Phone", value: school.alternatePhone },
                { icon: Mail, label: "Email", value: school.email },
                { icon: Globe, label: "Website", value: school.website },
              ].map((row) => row.value ? (
                <div key={row.label} className="flex gap-2">
                  <row.icon className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div><p className="text-xs text-slate-400">{row.label}</p><p className="text-slate-800">{String(row.value)}</p></div>
                </div>
              ) : null)}
              {school.principalName ? <p><span className="text-slate-400">Principal:</span> {String(school.principalName)}</p> : null}
              {school.schoolType ? <p><span className="text-slate-400">Type:</span> {String(school.schoolType)}</p> : null}
              {school.boardAffiliation ? <p><span className="text-slate-400">Board:</span> {String(school.boardAffiliation)}</p> : null}
              {school.udiseCode ? <p><span className="text-slate-400">UDISE:</span> <span className="font-mono">{String(school.udiseCode)}</span></p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>School Logo</CardTitle></CardHeader>
            <CardContent>
              <FileUploadField label="Update Logo" previewUrl={settings?.logoPath ? `/api/uploads/${settings.logoPath}` : undefined} onFile={uploadLogo} />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "contract" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Contract Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-slate-400">Contract No.</p><p className="font-medium">{String(sub?.contractNumber || "—")}</p></div>
                <div><p className="text-xs text-slate-400">System Price</p><p className="font-bold text-emerald-700">{formatINR(sub?.contractValue as string)}</p></div>
                <div><p className="text-xs text-slate-400">Start Date</p><p>{sub?.contractStartDate ? new Date(String(sub.contractStartDate)).toLocaleDateString("en-IN") : "—"}</p></div>
                <div><p className="text-xs text-slate-400">End Date</p><p>{sub?.contractEndDate ? new Date(String(sub.contractEndDate)).toLocaleDateString("en-IN") : "—"}</p></div>
              </div>
              {sub?.contractNotes ? <p className="text-slate-600 bg-slate-50 rounded-lg p-3">{String(sub.contractNotes)}</p> : null}
              {sub?.contractDocumentPath ? (
                <a href={`/api/uploads/${sub.contractDocumentPath}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-violet-600 hover:underline text-sm font-medium">
                  <FileText className="h-4 w-4" /> View Contract Document
                </a>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Upload Contract</CardTitle></CardHeader>
            <CardContent>
              <FileUploadField label="Contract Document" accept=".pdf,.png,.jpg,.jpeg" isImage={false} hint="Signed agreement PDF" onFile={uploadContract} />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "payments" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle>Payment Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><p className="text-xs text-slate-400">Total Amount</p><p className="text-2xl font-bold">{formatINR(sub?.totalAmount as string)}</p></div>
              <div><p className="text-xs text-slate-400">Paid</p><p className="text-2xl font-bold text-emerald-700">{formatINR(sub?.paidAmount as string)}</p></div>
              <div><p className="text-xs text-slate-400">Balance</p><p className="text-xl font-bold text-amber-700">
                {formatINR(Number(sub?.totalAmount || 0) - Number(sub?.paidAmount || 0))}
              </p></div>
              <StatusBadge status={String(sub?.paymentStatus || "pending")} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Record Payment</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={addPayment} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                <Input label="Amount (₹)" type="number" required value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                <Select label="Method" options={PAYMENT_METHODS.map((m) => ({ value: m, label: m.replace("_", " ") }))} value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })} />
                <Input label="Reference No." value={paymentForm.referenceNo} onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })} />
                <Input label="Notes" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
                <div className="md:col-span-2"><Button type="submit" variant="success"><CreditCard className="h-4 w-4" /> Add Payment</Button></div>
              </form>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase">Payment History</p>
                {payments.length === 0 ? <p className="text-sm text-slate-400">No payments recorded</p> : payments.map((p) => (
                  <div key={String(p.id)} className="flex justify-between items-center rounded-lg border border-slate-100 p-3 text-sm">
                    <div>
                      <p className="font-semibold text-emerald-700">{formatINR(p.amount as string)}</p>
                      <p className="text-xs text-slate-500">{new Date(String(p.paymentDate)).toLocaleDateString("en-IN")} · {String(p.paymentMethod || "—")}</p>
                    </div>
                    {p.referenceNo ? <span className="font-mono text-xs text-slate-400">{String(p.referenceNo)}</span> : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "features" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Panel & Feature Access</CardTitle>
            <Button onClick={saveFeatures} disabled={saving}><Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Features"}</Button>
          </CardHeader>
          <CardContent>
            <FeatureToggleGrid planName={planName} selected={features} onPlanChange={setPlanName} onChange={setFeatures} />
          </CardContent>
        </Card>
      )}

      {tab === "admins" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>School Admins</CardTitle>
            <Link href={`/admin/admins/new?schoolId=${id}`}><Button size="sm"><Users className="h-4 w-4" /> Add Admin</Button></Link>
          </CardHeader>
          <CardContent>
            {admins.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">No admins assigned</p>
            ) : (
              <div className="space-y-2">
                {admins.map((a) => (
                  <Link key={String(a.id)} href={`/admin/admins/${a.id}`} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-medium text-slate-800">{String(a.name)}</p>
                      <p className="text-xs font-mono text-slate-500">{String(a.email)}</p>
                    </div>
                    <StatusBadge active={Boolean(a.isActive)} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
