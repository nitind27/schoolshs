"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BOARDS } from "@/lib/constants";
import { SCHOOL_TYPES, PAYMENT_METHODS, defaultFeaturesForPlan, type SchoolFeatureKey } from "@/lib/school-features";
import { FeatureToggleGrid } from "@/components/admin/feature-toggle-grid";
import { FileUploadField } from "@/components/admin/file-upload-field";
import { SchoolLocationFields } from "@/components/admin/school-location-fields";
import { StepWizard } from "@/components/admin/admin-ui";
import { ArrowLeft, ArrowRight, Save, School, User, FileText, LayoutGrid, Loader2, ShieldCheck, Mail } from "lucide-react";
import { InfoModal } from "@/components/ui/info-modal";
import { OtpInput } from "@/components/ui/otp-input";

const INITIAL_FORM = {
  name: "", code: "", district: "", taluka: "", city: "", pincode: "",
  address: "", phone: "", alternatePhone: "", email: "", website: "",
  principalName: "", schoolType: "", boardAffiliation: "", udiseCode: "",
  adminName: "", adminEmail: "", adminPassword: "",
  planName: "standard",
  contractNumber: "", contractValue: "", contractStartDate: "", contractEndDate: "",
  contractNotes: "", totalAmount: "", initialPayment: "", initialPaymentMethod: "bank_transfer",
  initialPaymentRef: "", nextDueDate: "",
  enabledFeatures: defaultFeaturesForPlan("standard") as SchoolFeatureKey[],
};

type FormState = typeof INITIAL_FORM;

type DraftSummary = {
  code: string;
  schoolName: string;
  savedAt: string;
  step: number;
  fieldCount: number;
};

function normalizeForm(raw: Record<string, unknown>): FormState {
  const out = { ...INITIAL_FORM };
  for (const key of Object.keys(INITIAL_FORM) as (keyof FormState)[]) {
    const v = raw[key];
    if (v === undefined || v === null) continue;
    if (key === "enabledFeatures") {
      out.enabledFeatures = Array.isArray(v) ? (v as SchoolFeatureKey[]) : out.enabledFeatures;
      continue;
    }
    out[key] = String(v);
  }
  return out;
}

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s/g, "");
}

const STEPS = [
  { id: "school", label: "School Details", description: "Name, logo, location" },
  { id: "admin", label: "School Admin", description: "Login credentials" },
  { id: "contract", label: "Contract & Payment", description: "Deal & amount" },
  { id: "features", label: "Panel Access", description: "Enable features" },
];

export default function NewSchoolPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [codeSuggesting, setCodeSuggesting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>();
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
  const [adminOtpVerified, setAdminOtpVerified] = useState(false);
  const [adminOtp, setAdminOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpMsg, setOtpMsg] = useState("");
  const [otpError, setOtpError] = useState("");
  const [stepError, setStepError] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSummaries, setDraftSummaries] = useState<DraftSummary[]>([]);
  const [draftLoadHint, setDraftLoadHint] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [dbSaving, setDbSaving] = useState(false);

  const draftCodeRef = useRef("");
  const skipCodeSuggestRef = useRef(false);
  const isApplyingDraftRef = useRef(false);
  const skipDraftLoadRef = useRef(false);
  const prevAdminEmailRef = useRef("");
  const formRef = useRef<FormState>({ ...INITIAL_FORM });
  const stepRef = useRef(0);
  const codeManualRef = useRef(false);

  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM });

  formRef.current = form;
  stepRef.current = step;
  codeManualRef.current = codeManuallyEdited;

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const refreshDraftSummaries = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/schools/registration-draft");
      if (!res.ok) return;
      const data = (await res.json()) as { drafts?: DraftSummary[] };
      setDraftSummaries(Array.isArray(data.drafts) ? data.drafts : []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshDraftSummaries();
  }, [refreshDraftSummaries]);

  /** Database-only auto-save — no localStorage */
  const persistToDb = useCallback(async () => {
    const f = formRef.current;
    const code = normalizeCode(f.code);
    if (code.length < 3) return;

    setDbSaving(true);
    try {
      const res = await fetch("/api/admin/schools/registration-draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          previousCode: draftCodeRef.current || undefined,
          step: stepRef.current,
          form: f,
          codeManuallyEdited: codeManualRef.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDraftLoadHint(data.error || "Could not save draft to database.");
        return;
      }
      draftCodeRef.current = code;
      setDraftSavedAt(data.draft?.savedAt || new Date().toISOString());
      if (!isApplyingDraftRef.current) {
        setDraftLoadHint(`Saved to database under code ${code}`);
        setDraftRestored(false);
      }
      void refreshDraftSummaries();
    } catch {
      setDraftLoadHint("Network error while saving draft to database.");
    } finally {
      setDbSaving(false);
    }
  }, [refreshDraftSummaries]);

  const applyLoadedDraft = useCallback((code: string, draft: {
    form: Record<string, unknown>;
    step: number;
    savedAt: string;
    codeManuallyEdited?: boolean;
  }) => {
    isApplyingDraftRef.current = true;
    skipCodeSuggestRef.current = true;
    skipDraftLoadRef.current = true;
    const normalized = normalizeCode(code);
    const merged = normalizeForm(draft.form);
    merged.code = normalized;
    setForm(merged);
    setStep(Math.min(Math.max(0, draft.step), STEPS.length - 1));
    setCodeManuallyEdited(Boolean(draft.codeManuallyEdited));
    draftCodeRef.current = normalized;
    setDraftRestored(true);
    setDraftSavedAt(draft.savedAt);
    setDraftLoadHint(
      `Loaded from database: ${normalized}${merged.name.trim() ? ` — ${merged.name}` : ""}`,
    );
    setLogoFile(null);
    setContractFile(null);
    setLogoPreview(undefined);
    window.setTimeout(() => {
      isApplyingDraftRef.current = false;
    }, 400);
  }, []);

  const loadDraftByCode = useCallback(
    async (rawCode: string, opts?: { quiet?: boolean }) => {
      const normalized = normalizeCode(rawCode);
      if (normalized.length < 3) {
        if (!opts?.quiet) setDraftLoadHint("School code needs at least 3 characters.");
        return false;
      }
      setDraftLoading(true);
      try {
        const res = await fetch(
          `/api/admin/schools/registration-draft?code=${encodeURIComponent(normalized)}`,
        );
        if (!res.ok) {
          if (!opts?.quiet) setDraftLoadHint("Failed to load draft from database.");
          return false;
        }
        const data = (await res.json()) as {
          draft?: {
            form: Record<string, unknown>;
            step: number;
            savedAt: string;
            codeManuallyEdited?: boolean;
          } | null;
        };
        if (data.draft?.form) {
          applyLoadedDraft(normalized, data.draft);
          return true;
        }
        draftCodeRef.current = normalized;
        setDraftRestored(false);
        if (!opts?.quiet) {
          setDraftLoadHint(`No database draft for ${normalized}. Fill form — it auto-saves to DB.`);
        }
        return false;
      } catch {
        if (!opts?.quiet) setDraftLoadHint("Network error loading draft.");
        return false;
      } finally {
        setDraftLoading(false);
      }
    },
    [applyLoadedDraft],
  );

  /** Auto-save every form change → database */
  useEffect(() => {
    if (isApplyingDraftRef.current) return;
    const code = normalizeCode(form.code);
    if (code.length < 3) return;
    const t = window.setTimeout(() => {
      void persistToDb();
    }, 250);
    return () => window.clearTimeout(t);
  }, [form, step, codeManuallyEdited, persistToDb]);

  /** Load draft only when user typed/pasted a code (not auto-generated) */
  const codeLoadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!codeManuallyEdited) return;
    if (skipDraftLoadRef.current) {
      skipDraftLoadRef.current = false;
      return;
    }
    const code = normalizeCode(form.code);
    if (code.length < 3) return;
    if (codeLoadTimer.current) clearTimeout(codeLoadTimer.current);
    codeLoadTimer.current = setTimeout(() => {
      void loadDraftByCode(code, { quiet: true });
    }, 600);
    return () => {
      if (codeLoadTimer.current) clearTimeout(codeLoadTimer.current);
    };
  }, [form.code, codeManuallyEdited, loadDraftByCode]);

  const suggestCode = useCallback(async (name: string, city: string, taluka: string, district: string) => {
    if (!name.trim() || name.trim().length < 2) return;
    setCodeSuggesting(true);
    try {
      const params = new URLSearchParams({ name: name.trim() });
      if (city) params.set("city", city);
      if (taluka) params.set("taluka", taluka);
      if (district) params.set("district", district);
      const res = await fetch(`/api/admin/schools/suggest-code?${params}`);
      const data = await res.json();
      if (res.ok && data.code) {
        skipCodeSuggestRef.current = true;
        skipDraftLoadRef.current = true;
        setForm((f) => ({ ...f, code: String(data.code) }));
        draftCodeRef.current = normalizeCode(String(data.code));
      }
    } finally {
      setCodeSuggesting(false);
    }
  }, []);

  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (skipCodeSuggestRef.current) {
      skipCodeSuggestRef.current = false;
      return;
    }
    if (codeManuallyEdited) return;
    if (!form.name.trim() || form.name.trim().length < 2) return;
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(() => {
      void suggestCode(form.name, form.city, form.taluka, form.district);
    }, 400);
    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, [form.name, form.city, form.taluka, form.district, codeManuallyEdited, suggestCode]);

  useEffect(() => {
    fetch("/api/admin/schools/admin-email-otp")
      .then((r) => r.json())
      .then((d) => setEmailVerificationRequired(Boolean(d.required)))
      .catch(() => setEmailVerificationRequired(false));
  }, []);

  useEffect(() => {
    const email = form.adminEmail.trim().toLowerCase();
    const emailChanged = email !== prevAdminEmailRef.current;
    prevAdminEmailRef.current = email;

    if (!email || !emailVerificationRequired) {
      if (emailChanged) {
        setAdminOtpVerified(false);
        setAdminOtp("");
        setOtpMsg("");
        setOtpError("");
      }
      return;
    }

    if (emailChanged) {
      setAdminOtpVerified(false);
      setAdminOtp("");
      setOtpMsg("");
      setOtpError("");
    }

    fetch(`/api/admin/schools/admin-email-otp?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.verified) setAdminOtpVerified(true);
      })
      .catch(() => {});
  }, [form.adminEmail, emailVerificationRequired]);

  const adminCredentialsComplete = Boolean(
    form.adminEmail.trim() && form.adminName.trim() && form.adminPassword.length >= 8,
  );

  const sendAdminOtp = async () => {
    if (!form.adminName.trim()) {
      setOtpError("Admin name is required before sending OTP.");
      return;
    }
    if (!form.adminEmail.trim()) {
      setOtpError("Admin email is required.");
      return;
    }
    if (form.adminPassword.length < 8) {
      setOtpError("Password must be at least 8 characters.");
      return;
    }

    setOtpSending(true);
    setOtpError("");
    setOtpMsg("");
    try {
      const res = await fetch("/api/admin/schools/admin-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          email: form.adminEmail.trim().toLowerCase(),
          adminName: form.adminName.trim(),
          schoolName: form.name.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "Failed to send OTP");
        return;
      }
      setAdminOtpVerified(false);
      setAdminOtp("");
      setOtpMsg(data.message || "OTP sent. Check admin inbox.");
    } catch {
      setOtpError("Network error while sending OTP.");
    } finally {
      setOtpSending(false);
    }
  };

  const verifyAdminOtp = async () => {
    if (adminOtp.replace(/\D/g, "").length !== 6) {
      setOtpError("Enter the 6-digit OTP from email.");
      return;
    }

    setOtpVerifying(true);
    setOtpError("");
    setOtpMsg("");
    try {
      const res = await fetch("/api/admin/schools/admin-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          email: form.adminEmail.trim().toLowerCase(),
          otp: adminOtp.replace(/\D/g, ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "OTP verification failed");
        return;
      }
      setAdminOtpVerified(true);
      setOtpMsg(data.message || "Email verified successfully.");
    } catch {
      setOtpError("Network error while verifying OTP.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    try {
      await persistToDb();
      const res = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to create school");
        return;
      }

      const schoolId = data.id;
      if (logoFile && schoolId) {
        const fd = new FormData();
        fd.append("file", logoFile);
        await fetch(`/api/admin/schools/${schoolId}/logo`, { method: "POST", body: fd });
      }
      if (contractFile && schoolId) {
        const fd = new FormData();
        fd.append("file", contractFile);
        await fetch(`/api/admin/schools/${schoolId}/contract`, { method: "POST", body: fd });
      }

      const code = normalizeCode(form.code) || draftCodeRef.current;
      if (code) {
        await fetch(`/api/admin/schools/registration-draft?code=${encodeURIComponent(code)}`, {
          method: "DELETE",
        }).catch(() => undefined);
      }
      router.push(`/admin/schools/${schoolId}`);
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    setStepError("");
    if (step === 0 && !form.name.trim()) {
      setStepError("School name is required");
      return;
    }
    if (step === 0 && !form.code.trim()) {
      setStepError("School code is required — wait for auto-generate or enter manually");
      return;
    }
    if (step === 1) {
      if (form.adminEmail && (!form.adminName || !form.adminPassword)) {
        setStepError("Admin name and password required when email is provided");
        return;
      }
      if (form.adminEmail && form.adminPassword.length < 8) {
        setStepError("Admin password must be at least 8 characters");
        return;
      }
      if (emailVerificationRequired && adminCredentialsComplete && !adminOtpVerified) {
        setStepError("Verify admin email with OTP before continuing to contract step.");
        return;
      }
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      void persistToDb();
    } else void submit();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/schools"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Register New School</h1>
          <p className="text-sm text-slate-500">Complete onboarding — school, admin, contract & panels</p>
          <p className="text-xs text-slate-500 mt-1">
            School code auto-generates from name. Every field saves to the <span className="font-semibold">database</span> under that code.
          </p>
          {(draftLoadHint || dbSaving) && (
            <p
              className={`text-xs mt-2 rounded-lg px-3 py-2 ${
                draftRestored
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                  : "bg-slate-50 text-slate-700 border border-slate-200"
              }`}
            >
              {dbSaving ? "Saving to database…" : draftLoadHint}
              {!dbSaving && draftSavedAt
                ? ` · ${new Date(draftSavedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}`
                : null}
            </p>
          )}
        </div>
      </div>

      {draftSummaries.length > 0 && (
        <Card className="border-violet-200 bg-violet-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-violet-900">Saved drafts (database)</CardTitle>
            <p className="text-xs text-violet-800/80 font-normal">
              Click a row to load all saved fields for that school code.
            </p>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {draftSummaries.map((d) => (
              <button
                key={d.code}
                type="button"
                onClick={() => {
                  setCodeManuallyEdited(true);
                  skipDraftLoadRef.current = true;
                  setForm((f) => ({ ...f, code: d.code }));
                  void loadDraftByCode(d.code);
                }}
                className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                  form.code === d.code
                    ? "border-violet-400 bg-white shadow-sm"
                    : "border-violet-100 bg-white/80 hover:border-violet-300"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-violet-800">{d.code}</span>
                  <span className="text-[11px] text-slate-500">
                    Step {d.step + 1}/{STEPS.length} · {d.fieldCount} fields ·{" "}
                    {new Date(d.savedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <p className="text-sm text-slate-700 mt-0.5 truncate">{d.schoolName}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-violet-100">
        <CardContent className="p-5">
          <StepWizard steps={STEPS} current={step} onStepClick={(i) => i <= step && setStep(i)} />
        </CardContent>
      </Card>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><School className="h-5 w-5 text-violet-600" /> School Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="School Name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />

            <div>
              <Input
                label="School Code (unique)"
                required
                placeholder="Auto e.g. SONGADH001"
                value={form.code}
                onChange={(e) => {
                  setCodeManuallyEdited(true);
                  setDraftRestored(false);
                  set("code", e.target.value.toUpperCase().replace(/\s/g, ""));
                }}
                onBlur={() => {
                  if (codeManuallyEdited && form.code.trim().length >= 3) {
                    void loadDraftByCode(form.code);
                  }
                }}
              />
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {codeSuggesting ? (
                  <span className="text-violet-600 inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Auto-generating unique code…
                  </span>
                ) : codeManuallyEdited ? (
                  <span>Custom code — you can edit anytime</span>
                ) : form.code ? (
                  <span>
                    Auto-generated:{" "}
                    <span className="font-mono font-semibold text-violet-700">{form.code}</span>
                  </span>
                ) : (
                  <span>Type school name to auto-generate code</span>
                )}
                {codeManuallyEdited && form.name.trim().length >= 2 && (
                  <button
                    type="button"
                    className="text-violet-600 hover:underline font-medium"
                    onClick={() => {
                      setCodeManuallyEdited(false);
                      void suggestCode(form.name, form.city, form.taluka, form.district);
                    }}
                  >
                    Regenerate
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={form.code.trim().length < 3 || draftLoading}
                  onClick={() => void loadDraftByCode(form.code)}
                >
                  {draftLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                    </>
                  ) : (
                    "Load from database"
                  )}
                </Button>
              </div>
            </div>

            <SchoolLocationFields
              values={{
                pincode: form.pincode,
                district: form.district,
                taluka: form.taluka,
                city: form.city,
                address: form.address,
              }}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            />

            <Input label="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            <Input label="Alternate Phone" value={form.alternatePhone} onChange={(e) => set("alternatePhone", e.target.value)} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            <Input label="Website" value={form.website} onChange={(e) => set("website", e.target.value)} />
            <Input label="Principal Name" value={form.principalName} onChange={(e) => set("principalName", e.target.value)} />
            <Select label="School Type" options={["", ...SCHOOL_TYPES]} value={form.schoolType} onChange={(e) => set("schoolType", e.target.value)} />
            <Select label="Board Affiliation" options={["", ...BOARDS]} value={form.boardAffiliation} onChange={(e) => set("boardAffiliation", e.target.value)} />
            <Input label="UDISE Code" value={form.udiseCode} onChange={(e) => set("udiseCode", e.target.value)} />
            <div className="md:col-span-2">
              <FileUploadField
                label="School Logo"
                hint="PNG/JPG — used on ID cards & portal"
                previewUrl={logoPreview}
                onFile={(f) => { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-blue-600" /> School Admin Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500 bg-blue-50 border border-blue-100 rounded-xl p-3">
              Create the primary school admin login. This admin will manage only their school&apos;s data.
            </p>
            <Input label="Admin Full Name" value={form.adminName} onChange={(e) => set("adminName", e.target.value)} />
            <Input label="Admin Email (Login ID)" type="email" value={form.adminEmail} onChange={(e) => set("adminEmail", e.target.value)} />
            <Input label="Password (min 8 characters)" type="password" value={form.adminPassword} onChange={(e) => set("adminPassword", e.target.value)} />

            {emailVerificationRequired && form.adminEmail.trim() && (
              <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100">
                    <Mail className="h-5 w-5 text-violet-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Email OTP Verification</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Send OTP to admin email and verify before proceeding. Required when SMTP is enabled.
                    </p>
                  </div>
                  {adminOtpVerified && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>

                {!adminOtpVerified && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={otpSending || !adminCredentialsComplete}
                        onClick={sendAdminOtp}
                      >
                        {otpSending ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…
                          </>
                        ) : (
                          "Send OTP"
                        )}
                      </Button>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-700">Enter OTP</label>
                      <OtpInput
                        value={adminOtp}
                        onChange={setAdminOtp}
                        disabled={otpVerifying}
                        boxClassName="border-violet-200 focus:border-violet-500 focus:ring-violet-200"
                      />
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      disabled={otpVerifying || adminOtp.replace(/\D/g, "").length !== 6}
                      onClick={verifyAdminOtp}
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      {otpVerifying ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying…
                        </>
                      ) : (
                        "Verify OTP"
                      )}
                    </Button>
                  </>
                )}

                {otpError && <p className="text-xs font-medium text-red-600">{otpError}</p>}
                {otpMsg && <p className="text-xs font-medium text-emerald-700">{otpMsg}</p>}
              </div>
            )}

            {emailVerificationRequired && !form.adminEmail.trim() && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Enter admin email above to send and verify OTP before the next step.
              </p>
            )}

            {!emailVerificationRequired && form.adminEmail.trim() && (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                SMTP email verification is off — admin can sign in immediately after school is created.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-600" /> Contract & Payment</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Contract Number" value={form.contractNumber} onChange={(e) => set("contractNumber", e.target.value)} />
            <Input label="System Price (₹)" type="number" value={form.contractValue} onChange={(e) => { set("contractValue", e.target.value); set("totalAmount", e.target.value); }} />
            <Input label="Contract Start Date" type="date" value={form.contractStartDate} onChange={(e) => set("contractStartDate", e.target.value)} />
            <Input label="Contract End Date" type="date" value={form.contractEndDate} onChange={(e) => set("contractEndDate", e.target.value)} />
            <Input label="Total Amount (₹)" type="number" value={form.totalAmount} onChange={(e) => set("totalAmount", e.target.value)} />
            <Input label="Initial Payment (₹)" type="number" value={form.initialPayment} onChange={(e) => set("initialPayment", e.target.value)} />
            <Select label="Payment Method" options={PAYMENT_METHODS.map((m) => ({ value: m, label: m.replace("_", " ") }))} value={form.initialPaymentMethod} onChange={(e) => set("initialPaymentMethod", e.target.value)} />
            <Input label="Payment Reference No." value={form.initialPaymentRef} onChange={(e) => set("initialPaymentRef", e.target.value)} />
            <Input label="Next Due Date" type="date" value={form.nextDueDate} onChange={(e) => set("nextDueDate", e.target.value)} />
            <div className="md:col-span-2">
              <Textarea label="Contract Notes" value={form.contractNotes} onChange={(e) => set("contractNotes", e.target.value)} rows={3} />
            </div>
            <div className="md:col-span-2">
              <FileUploadField
                label="Contract Document"
                accept=".pdf,.png,.jpg,.jpeg"
                isImage={false}
                hint="PDF or image — signed agreement"
                onFile={setContractFile}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LayoutGrid className="h-5 w-5 text-violet-600" /> Panel & Feature Access</CardTitle>
          </CardHeader>
          <CardContent>
            <FeatureToggleGrid
              planName={form.planName}
              selected={form.enabledFeatures}
              onPlanChange={(p) => set("planName", p)}
              onChange={(features) => setForm((f) => ({ ...f, enabledFeatures: features }))}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center gap-4">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex flex-col items-end gap-2">
          {stepError && <p className="text-sm text-red-600">{stepError}</p>}
          <Button
            variant="success"
            onClick={next}
            disabled={
              loading ||
              (step === 1 &&
                emailVerificationRequired &&
                adminCredentialsComplete &&
                !adminOtpVerified)
            }
          >
            {step === STEPS.length - 1 ? (
              <><Save className="h-4 w-4" /> {loading ? "Creating..." : "Create School"}</>
            ) : (
              <>Next <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>

      <InfoModal isOpen={!!errorMsg} onClose={() => setErrorMsg(null)} title="Error">
        <p className="text-sm text-slate-600">{errorMsg}</p>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setErrorMsg(null)}>OK</Button>
        </div>
      </InfoModal>
    </div>
  );
}
