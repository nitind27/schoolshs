"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  clearSchoolRegistrationDraft,
  loadLatestSchoolRegistrationDraft,
  saveSchoolRegistrationDraft,
} from "@/lib/school-registration-draft";

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

  const draftCodeRef = useRef("");
  const prevAdminEmailRef = useRef("");
  const draftHydratedRef = useRef(false);
  const skipCodeSuggestRef = useRef(false);

  const [form, setForm] = useState({ ...INITIAL_FORM });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const latest = loadLatestSchoolRegistrationDraft();
    if (!latest) {
      draftHydratedRef.current = true;
      return;
    }
    const { draft } = latest;
    skipCodeSuggestRef.current = true;
    setForm((f) => ({ ...f, ...(draft.form as typeof INITIAL_FORM) }));
    setStep(Math.min(Math.max(0, draft.step), STEPS.length - 1));
    setCodeManuallyEdited(draft.codeManuallyEdited);
    draftCodeRef.current = latest.code === "__PENDING__" ? "" : latest.code;
    setDraftRestored(true);
    setDraftSavedAt(draft.savedAt);
    draftHydratedRef.current = true;
  }, []);

  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!draftHydratedRef.current) return;
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      const previousCode = draftCodeRef.current;
      const nextCode = saveSchoolRegistrationDraft({
        code: form.code,
        previousCode: previousCode,
        step,
        codeManuallyEdited,
        form: { ...form },
      });
      draftCodeRef.current = nextCode === "__PENDING__" ? "" : nextCode;
      setDraftSavedAt(new Date().toISOString());
    }, 400);
    return () => {
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    };
  }, [form, step, codeManuallyEdited]);

  const suggestCode = async (name: string, city: string, taluka: string, district: string) => {
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
        setForm((f) => ({ ...f, code: data.code }));
      }
    } finally {
      setCodeSuggesting(false);
    }
  };

  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (skipCodeSuggestRef.current) {
      skipCodeSuggestRef.current = false;
      return;
    }
    if (codeManuallyEdited) return;
    if (!form.name.trim() || form.name.trim().length < 2) {
      setForm((f) => (f.code ? { ...f, code: "" } : f));
      return;
    }
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(() => {
      suggestCode(form.name, form.city, form.taluka, form.district);
    }, 400);
    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, [form.name, form.city, form.taluka, form.district, codeManuallyEdited]);

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

      router.push(`/admin/schools/${schoolId}`);
      clearSchoolRegistrationDraft(form.code || draftCodeRef.current);
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
    if (step < STEPS.length - 1) setStep(step + 1);
    else submit();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/schools"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Register New School</h1>
          <p className="text-sm text-slate-500">Complete onboarding — school, admin, contract & panels</p>
          {(draftRestored || draftSavedAt) && (
            <p className="text-xs text-emerald-700 mt-1">
              {draftRestored ? "Draft restored — " : "Auto-saved "}
              {form.code ? (
                <>for code <span className="font-mono font-semibold">{form.code}</span></>
              ) : (
                "— assign school code to pin draft"
              )}
              {draftSavedAt
                ? ` · ${new Date(draftSavedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}`
                : null}
            </p>
          )}
        </div>
      </div>

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
            <Input label="School Name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
            <div>
              <Input
                label="School Code (unique)"
                required
                placeholder="Auto-generated e.g. SONGADH001"
                value={form.code}
                onChange={(e) => {
                  setCodeManuallyEdited(true);
                  set("code", e.target.value.toUpperCase().replace(/\s/g, ""));
                }}
              />
              <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-2">
                {codeSuggesting ? (
                  <span className="text-violet-600">Generating code from school name…</span>
                ) : codeManuallyEdited ? (
                  <span>Custom code — edit anytime</span>
                ) : form.code ? (
                  <span>
                    Auto-generated from name
                    {form.city || form.district ? " & location" : ""}:{" "}
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
                      suggestCode(form.name, form.city, form.taluka, form.district);
                    }}
                  >
                    Regenerate
                  </button>
                )}
              </p>
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
