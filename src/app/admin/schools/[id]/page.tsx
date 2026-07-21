"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FeatureToggleGrid } from "@/components/admin/feature-toggle-grid";
import { FileUploadField } from "@/components/admin/file-upload-field";
import { SchoolLocationFields } from "@/components/admin/school-location-fields";
import { formatINR, StatusBadge } from "@/components/admin/admin-ui";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { InfoModal } from "@/components/ui/info-modal";
import { BOARDS } from "@/lib/constants";
import {
  SCHOOL_TYPES,
  PAYMENT_METHODS,
  normalizeFeatureList,
  type SchoolFeatureKey,
} from "@/lib/school-features";
import {
  ArrowLeft,
  School,
  Save,
  ToggleLeft,
  ToggleRight,
  FileText,
  CreditCard,
  LayoutGrid,
  Users,
  MapPin,
  Phone,
  Mail,
  Globe,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";

type Tab = "overview" | "edit" | "contract" | "payments" | "features" | "admins";

type EditForm = {
  name: string;
  code: string;
  district: string;
  taluka: string;
  city: string;
  pincode: string;
  address: string;
  phone: string;
  alternatePhone: string;
  email: string;
  website: string;
  principalName: string;
  schoolType: string;
  boardAffiliation: string;
  udiseCode: string;
  isActive: boolean;
  planName: string;
  contractNumber: string;
  contractValue: string;
  contractStartDate: string;
  contractEndDate: string;
  contractNotes: string;
  totalAmount: string;
  paymentStatus: string;
  nextDueDate: string;
};

function toDateInput(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function emptyEditForm(): EditForm {
  return {
    name: "",
    code: "",
    district: "",
    taluka: "",
    city: "",
    pincode: "",
    address: "",
    phone: "",
    alternatePhone: "",
    email: "",
    website: "",
    principalName: "",
    schoolType: "",
    boardAffiliation: "",
    udiseCode: "",
    isActive: true,
    planName: "standard",
    contractNumber: "",
    contractValue: "",
    contractStartDate: "",
    contractEndDate: "",
    contractNotes: "",
    totalAmount: "",
    paymentStatus: "pending",
    nextDueDate: "",
  };
}

function schoolToEditForm(school: Record<string, unknown>): EditForm {
  const sub = (school.subscription as Record<string, unknown> | null) || {};
  return {
    name: String(school.name || ""),
    code: String(school.code || ""),
    district: String(school.district || ""),
    taluka: String(school.taluka || ""),
    city: String(school.city || ""),
    pincode: String(school.pincode || ""),
    address: String(school.address || ""),
    phone: String(school.phone || ""),
    alternatePhone: String(school.alternatePhone || ""),
    email: String(school.email || ""),
    website: String(school.website || ""),
    principalName: String(school.principalName || ""),
    schoolType: String(school.schoolType || ""),
    boardAffiliation: String(school.boardAffiliation || ""),
    udiseCode: String(school.udiseCode || ""),
    isActive: Boolean(school.isActive),
    planName: String(sub.planName || "standard"),
    contractNumber: String(sub.contractNumber || ""),
    contractValue: sub.contractValue != null ? String(sub.contractValue) : "",
    contractStartDate: toDateInput(sub.contractStartDate),
    contractEndDate: toDateInput(sub.contractEndDate),
    contractNotes: String(sub.contractNotes || ""),
    totalAmount: sub.totalAmount != null ? String(sub.totalAmount) : "",
    paymentStatus: String(sub.paymentStatus || "pending"),
    nextDueDate: toDateInput(sub.nextDueDate),
  };
}

export default function SchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab | null) || "overview";
  const [school, setSchool] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState<Tab>(
    ["overview", "edit", "contract", "payments", "features", "admins"].includes(initialTab)
      ? initialTab
      : "overview",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [features, setFeatures] = useState<SchoolFeatureKey[]>([]);
  const [planName, setPlanName] = useState("standard");
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm());
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "bank_transfer",
    referenceNo: "",
    notes: "",
  });
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/admin/schools/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setSchool(null);
          return;
        }
        setSchool(d);
        setEditForm(schoolToEditForm(d));
        const sub = d.subscription as { enabledFeatures?: unknown; planName?: string } | null;
        if (sub) {
          setFeatures(normalizeFeatureList(sub.enabledFeatures));
          setPlanName(sub.planName || "standard");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const setEdit = (k: keyof EditForm, v: string | boolean) =>
    setEditForm((f) => ({ ...f, [k]: v }));

  const toggleActive = async () => {
    if (!school) return;
    setToggling(true);
    setConfirmDeactivate(false);
    try {
      const res = await fetch(`/api/admin/schools/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !school.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Failed to update status");
        return;
      }
      setMsg(school.isActive ? "School deactivated." : "School activated.");
      load();
    } finally {
      setToggling(false);
    }
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) {
      setErr("School name is required");
      return;
    }
    if (!editForm.code.trim()) {
      setErr("School code is required");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/schools/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          planName: editForm.planName || planName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Failed to save school");
        return;
      }
      setMsg("School details saved successfully.");
      setSchool(data);
      setEditForm(schoolToEditForm(data));
      setTab("overview");
    } finally {
      setSaving(false);
    }
  };

  const saveFeatures = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/schools/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledFeatures: features, planName }),
      });
      if (!res.ok) {
        const d = await res.json();
        setErr(d.error || "Failed to save features");
        return;
      }
      setMsg("Panel access saved.");
      load();
    } finally {
      setSaving(false);
    }
  };

  const deleteSchool = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/schools/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setConfirmDelete(false);
        setErr(data.error || "Failed to delete school");
        return;
      }
      router.push("/admin/schools");
    } finally {
      setDeleting(false);
    }
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
      setMsg("Payment recorded.");
      load();
    } else {
      const d = await res.json();
      setErr(d.error || "Failed to add payment");
    }
  };

  const uploadLogo = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`/api/admin/schools/${id}/logo`, { method: "POST", body: fd });
    setMsg("Logo updated.");
    load();
  };

  const uploadContract = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`/api/admin/schools/${id}/contract`, { method: "POST", body: fd });
    setMsg("Contract document uploaded.");
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
    { id: "edit", label: "Edit School", icon: Pencil },
    { id: "contract", label: "Contract", icon: FileText },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "features", label: "Panel Access", icon: LayoutGrid },
    { id: "admins", label: "Admins", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/schools">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          {settings?.logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/uploads/${settings.logoPath}`}
              alt=""
              className="h-14 w-14 rounded-2xl object-cover border-2 border-white shadow"
            />
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-violet-600 flex items-center justify-center">
              <School className="h-7 w-7 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{String(school.name)}</h1>
            <p className="text-sm font-mono text-violet-600">{String(school.code)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge active={Boolean(school.isActive)} />
          <Button
            variant="outline"
            size="sm"
            disabled={toggling}
            onClick={() => {
              if (school.isActive) setConfirmDeactivate(true);
              else void toggleActive();
            }}
          >
            {toggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : school.isActive ? (
              <>
                <ToggleRight className="h-4 w-4 text-emerald-600" /> Deactivate
              </>
            ) : (
              <>
                <ToggleLeft className="h-4 w-4" /> Activate
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTab("edit")}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete
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
              tab === t.id
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contact & Location</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setTab("edit")}>
                <Pencil className="h-3.5 w-3.5" /> Edit details
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                {
                  icon: MapPin,
                  label: "Address",
                  value: [school.address, school.taluka, school.city, school.district, school.pincode]
                    .filter(Boolean)
                    .join(", "),
                },
                { icon: Phone, label: "Phone", value: school.phone },
                { icon: Phone, label: "Alt. Phone", value: school.alternatePhone },
                { icon: Mail, label: "Email", value: school.email },
                { icon: Globe, label: "Website", value: school.website },
              ].map((row) =>
                row.value ? (
                  <div key={row.label} className="flex gap-2">
                    <row.icon className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400">{row.label}</p>
                      <p className="text-slate-800">{String(row.value)}</p>
                    </div>
                  </div>
                ) : null,
              )}
              {school.principalName ? (
                <p>
                  <span className="text-slate-400">Principal:</span> {String(school.principalName)}
                </p>
              ) : null}
              {school.schoolType ? (
                <p>
                  <span className="text-slate-400">Type:</span> {String(school.schoolType)}
                </p>
              ) : null}
              {school.boardAffiliation ? (
                <p>
                  <span className="text-slate-400">Board:</span> {String(school.boardAffiliation)}
                </p>
              ) : null}
              {school.udiseCode ? (
                <p>
                  <span className="text-slate-400">UDISE:</span>{" "}
                  <span className="font-mono">{String(school.udiseCode)}</span>
                </p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>School Logo</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploadField
                label="Update Logo"
                previewUrl={settings?.logoPath ? `/api/uploads/${settings.logoPath}` : undefined}
                onFile={uploadLogo}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "edit" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Edit School</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Update school profile, location & contract fields</p>
            </div>
            <Button onClick={saveEdit} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save changes
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="School Name"
                required
                value={editForm.name}
                onChange={(e) => setEdit("name", e.target.value)}
              />
              <Input
                label="School Code (unique)"
                required
                value={editForm.code}
                onChange={(e) => setEdit("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
              />

              <SchoolLocationFields
                values={{
                  pincode: editForm.pincode,
                  district: editForm.district,
                  taluka: editForm.taluka,
                  city: editForm.city,
                  address: editForm.address,
                }}
                onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
              />

              <Input label="Phone" value={editForm.phone} onChange={(e) => setEdit("phone", e.target.value)} />
              <Input
                label="Alternate Phone"
                value={editForm.alternatePhone}
                onChange={(e) => setEdit("alternatePhone", e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEdit("email", e.target.value)}
              />
              <Input label="Website" value={editForm.website} onChange={(e) => setEdit("website", e.target.value)} />
              <Input
                label="Principal Name"
                value={editForm.principalName}
                onChange={(e) => setEdit("principalName", e.target.value)}
              />
              <Select
                label="School Type"
                options={["", ...SCHOOL_TYPES]}
                value={editForm.schoolType}
                onChange={(e) => setEdit("schoolType", e.target.value)}
              />
              <Select
                label="Board Affiliation"
                options={["", ...BOARDS]}
                value={editForm.boardAffiliation}
                onChange={(e) => setEdit("boardAffiliation", e.target.value)}
              />
              <Input
                label="UDISE Code"
                value={editForm.udiseCode}
                onChange={(e) => setEdit("udiseCode", e.target.value)}
              />
              <Select
                label="Status"
                options={[
                  { value: "true", label: "Active" },
                  { value: "false", label: "Inactive" },
                ]}
                value={editForm.isActive ? "true" : "false"}
                onChange={(e) => setEdit("isActive", e.target.value === "true")}
              />
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Contract & billing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Contract Number"
                  value={editForm.contractNumber}
                  onChange={(e) => setEdit("contractNumber", e.target.value)}
                />
                <Input
                  label="System Price (₹)"
                  type="number"
                  value={editForm.contractValue}
                  onChange={(e) => {
                    setEdit("contractValue", e.target.value);
                    setEdit("totalAmount", e.target.value);
                  }}
                />
                <Input
                  label="Contract Start"
                  type="date"
                  value={editForm.contractStartDate}
                  onChange={(e) => setEdit("contractStartDate", e.target.value)}
                />
                <Input
                  label="Contract End"
                  type="date"
                  value={editForm.contractEndDate}
                  onChange={(e) => setEdit("contractEndDate", e.target.value)}
                />
                <Input
                  label="Total Amount (₹)"
                  type="number"
                  value={editForm.totalAmount}
                  onChange={(e) => setEdit("totalAmount", e.target.value)}
                />
                <Select
                  label="Payment Status"
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "partial", label: "Partial" },
                    { value: "paid", label: "Paid" },
                    { value: "overdue", label: "Overdue" },
                  ]}
                  value={editForm.paymentStatus}
                  onChange={(e) => setEdit("paymentStatus", e.target.value)}
                />
                <Input
                  label="Next Due Date"
                  type="date"
                  value={editForm.nextDueDate}
                  onChange={(e) => setEdit("nextDueDate", e.target.value)}
                />
                <div className="md:col-span-2">
                  <Textarea
                    label="Contract Notes"
                    rows={3}
                    value={editForm.contractNotes}
                    onChange={(e) => setEdit("contractNotes", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTab("overview")}>
                Cancel
              </Button>
              <Button onClick={saveEdit} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "contract" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contract Details</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setTab("edit")}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400">Contract No.</p>
                  <p className="font-medium">{String(sub?.contractNumber || "—")}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">System Price</p>
                  <p className="font-bold text-emerald-700">{formatINR(sub?.contractValue as string)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Start Date</p>
                  <p>
                    {sub?.contractStartDate
                      ? new Date(String(sub.contractStartDate)).toLocaleDateString("en-IN")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">End Date</p>
                  <p>
                    {sub?.contractEndDate
                      ? new Date(String(sub.contractEndDate)).toLocaleDateString("en-IN")
                      : "—"}
                  </p>
                </div>
              </div>
              {sub?.contractNotes ? (
                <p className="text-slate-600 bg-slate-50 rounded-lg p-3">{String(sub.contractNotes)}</p>
              ) : null}
              {sub?.contractDocumentPath ? (
                <a
                  href={`/api/uploads/${sub.contractDocumentPath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-violet-600 hover:underline text-sm font-medium"
                >
                  <FileText className="h-4 w-4" /> View Contract Document
                </a>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Upload Contract</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploadField
                label="Contract Document"
                accept=".pdf,.png,.jpg,.jpeg"
                isImage={false}
                hint="Signed agreement PDF"
                onFile={uploadContract}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "payments" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-slate-400">Total Amount</p>
                <p className="text-2xl font-bold">{formatINR(sub?.totalAmount as string)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Paid</p>
                <p className="text-2xl font-bold text-emerald-700">{formatINR(sub?.paidAmount as string)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Balance</p>
                <p className="text-xl font-bold text-amber-700">
                  {formatINR(Number(sub?.totalAmount || 0) - Number(sub?.paidAmount || 0))}
                </p>
              </div>
              <StatusBadge status={String(sub?.paymentStatus || "pending")} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Record Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addPayment} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                <Input
                  label="Amount (₹)"
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
                <Select
                  label="Method"
                  options={PAYMENT_METHODS.map((m) => ({ value: m, label: m.replace("_", " ") }))}
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                />
                <Input
                  label="Reference No."
                  value={paymentForm.referenceNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                />
                <Input
                  label="Notes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
                <div className="md:col-span-2">
                  <Button type="submit" variant="success">
                    <CreditCard className="h-4 w-4" /> Add Payment
                  </Button>
                </div>
              </form>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase">Payment History</p>
                {payments.length === 0 ? (
                  <p className="text-sm text-slate-400">No payments recorded</p>
                ) : (
                  payments.map((p) => (
                    <div
                      key={String(p.id)}
                      className="flex justify-between items-center rounded-lg border border-slate-100 p-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-emerald-700">{formatINR(p.amount as string)}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(String(p.paymentDate)).toLocaleDateString("en-IN")} ·{" "}
                          {String(p.paymentMethod || "—")}
                        </p>
                      </div>
                      {p.referenceNo ? (
                        <span className="font-mono text-xs text-slate-400">{String(p.referenceNo)}</span>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "features" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Panel & Feature Access</CardTitle>
            <Button onClick={saveFeatures} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Features"}
            </Button>
          </CardHeader>
          <CardContent>
            <FeatureToggleGrid
              planName={planName}
              selected={features}
              onPlanChange={setPlanName}
              onChange={setFeatures}
            />
          </CardContent>
        </Card>
      )}

      {tab === "admins" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>School Admins</CardTitle>
            <Link href={`/admin/admins/new?schoolId=${id}`}>
              <Button size="sm">
                <Users className="h-4 w-4" /> Add Admin
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {admins.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">No admins assigned</p>
            ) : (
              <div className="space-y-2">
                {admins.map((a) => (
                  <Link
                    key={String(a.id)}
                    href={`/admin/admins/${a.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors"
                  >
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

      <ConfirmModal
        isOpen={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        onConfirm={() => void toggleActive()}
        title="Deactivate school?"
        message={`${String(school.name)} (${String(school.code)}) will be deactivated. School staff will not be able to sign in until you activate it again.`}
        confirmLabel="Deactivate"
        variant="warning"
        loading={toggling}
      />

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void deleteSchool()}
        title="Delete school permanently?"
        message={`This will permanently delete ${String(school.name)} (${String(school.code)}) and all related students, users, and school data. This cannot be undone.`}
        confirmLabel="Delete forever"
        variant="destructive"
        loading={deleting}
      />

      <InfoModal isOpen={!!msg} onClose={() => setMsg(null)} title="Success">
        <p className="text-sm text-slate-600">{msg}</p>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setMsg(null)}>OK</Button>
        </div>
      </InfoModal>

      <InfoModal isOpen={!!err} onClose={() => setErr(null)} title="Error">
        <p className="text-sm text-slate-600">{err}</p>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setErr(null)}>OK</Button>
        </div>
      </InfoModal>
    </div>
  );
}
