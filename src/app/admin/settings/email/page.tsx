"use client";

import { PageLoader } from "@/components/ui/loader";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ArrowLeft,
  Mail,
  Save,
  Send,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from "lucide-react";

type SmtpSettings = {
  emailEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpFromName: string | null;
  smtpFromEmail: string | null;
  smtpReplyTo: string | null;
  hasPassword: boolean;
  passwordDecryptOk?: boolean;
  passwordMasked: string;
  configReady?: boolean;
  configIssue?: string | null;
  smtpLastTestAt: string | null;
  smtpLastTestOk: boolean | null;
  smtpLastTestError: string | null;
};

const SMTP_PRESETS = [
  { label: "Gmail (App Password)", host: "smtp.gmail.com", port: 587, secure: false },
  { label: "Outlook / Office 365", host: "smtp.office365.com", port: 587, secure: false },
  { label: "Zoho Mail", host: "smtp.zoho.in", port: 587, secure: false },
  { label: "Custom", host: "", port: 587, secure: false },
];

export default function AdminEmailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [preset, setPreset] = useState("Gmail (App Password)");
  const [testTo, setTestTo] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    emailEnabled: false,
    smtpHost: "",
    smtpPort: "587",
    smtpSecure: false,
    smtpUser: "",
    smtpFromName: "Codeat Education",
    smtpFromEmail: "",
    smtpReplyTo: "",
  });
  const [meta, setMeta] = useState<
    Pick<
      SmtpSettings,
      | "hasPassword"
      | "passwordDecryptOk"
      | "passwordMasked"
      | "configReady"
      | "configIssue"
      | "smtpLastTestAt"
      | "smtpLastTestOk"
      | "smtpLastTestError"
    >
  >({
    hasPassword: false,
    passwordDecryptOk: false,
    passwordMasked: "",
    configReady: false,
    configIssue: null,
    smtpLastTestAt: null,
    smtpLastTestOk: null,
    smtpLastTestError: null,
  });

  const applyLoaded = (d: SmtpSettings) => {
    setForm({
      emailEnabled: Boolean(d.emailEnabled),
      smtpHost: d.smtpHost || "",
      smtpPort: String(d.smtpPort || 587),
      smtpSecure: Boolean(d.smtpSecure),
      smtpUser: d.smtpUser || "",
      smtpFromName: d.smtpFromName || "Codeat Education",
      smtpFromEmail: d.smtpFromEmail || "",
      smtpReplyTo: d.smtpReplyTo || "",
    });
    setMeta({
      hasPassword: d.hasPassword,
      passwordDecryptOk: d.passwordDecryptOk ?? false,
      passwordMasked: d.passwordMasked,
      configReady: d.configReady ?? false,
      configIssue: d.configIssue ?? null,
      smtpLastTestAt: d.smtpLastTestAt,
      smtpLastTestOk: d.smtpLastTestOk,
      smtpLastTestError: d.smtpLastTestError,
    });
    const match = SMTP_PRESETS.find((p) => p.host && p.host === d.smtpHost);
    if (match) setPreset(match.label);
    else if (d.smtpHost) setPreset("Custom");
  };

  const load = () => {
    setLoading(true);
    fetch("/api/admin/platform-settings/email", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: SmtpSettings) => {
        if (d && !("error" in d)) applyLoaded(d);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.email) setTestTo(d.user.email);
      });
  }, []);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const applyPreset = (label: string) => {
    setPreset(label);
    const p = SMTP_PRESETS.find((x) => x.label === label);
    if (!p || label === "Custom") return;
    setForm((f) => ({
      ...f,
      smtpHost: p.host,
      smtpPort: String(p.port),
      smtpSecure: p.secure,
    }));
  };

  const payload = () => {
    const user = form.smtpUser.trim().toLowerCase();
    const from = form.smtpFromEmail.trim().toLowerCase() || user;
    return {
      emailEnabled: form.emailEnabled,
      smtpHost: form.smtpHost.trim(),
      smtpPort: Number(form.smtpPort) || 587,
      smtpSecure: form.smtpSecure,
      smtpUser: user || from,
      smtpFromName: form.smtpFromName.trim() || "Codeat Education",
      smtpFromEmail: from,
      smtpReplyTo: form.smtpReplyTo.trim().toLowerCase() || null,
      smtpPassword: smtpPassword.replace(/\s+/g, "") || undefined,
      requireComplete: form.emailEnabled,
    };
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const body = payload();
      if (body.emailEnabled) {
        if (!body.smtpHost) {
          setErr("SMTP host required (e.g. smtp.gmail.com)");
          return;
        }
        if (!body.smtpFromEmail) {
          setErr("From Email required — Gmail address jisse App Password banaya ho");
          return;
        }
        if (!body.smtpPassword && !meta.hasPassword) {
          setErr("App Password required — Google Account → App passwords se 16-char password paste karo");
          return;
        }
      }

      const res = await fetch("/api/admin/platform-settings/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Failed to save");
        return;
      }
      setSmtpPassword("");
      applyLoaded(data);
      setMsg(
        data.configReady
          ? "SMTP saved permanently. Admin email verification ready."
          : `Saved, but not ready yet: ${data.configIssue || "complete missing fields"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const testSmtp = async () => {
    setTesting(true);
    setMsg(null);
    setErr(null);
    try {
      // Always save first so credentials stay permanent
      const saveRes = await fetch("/api/admin/platform-settings/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload(), emailEnabled: true, requireComplete: true }),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) {
        setErr(saved.error || "Save failed before test");
        return;
      }
      applyLoaded(saved);

      const res = await fetch("/api/admin/platform-settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testTo,
          ...payload(),
          emailEnabled: true,
          smtpPassword: smtpPassword.replace(/\s+/g, "") || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "SMTP test failed");
        load();
        return;
      }
      setSmtpPassword("");
      setMsg(`Test email sent to ${data.sentTo}. Credentials stored permanently.`);
      load();
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Email & SMTP Settings</h1>
          <p className="text-sm text-slate-500">
            Credentials DB me permanent store hote hain — har baar email verify / OTP isi se chalega
          </p>
        </div>
      </div>

      <Card
        className={
          meta.configReady
            ? "border-emerald-200 bg-emerald-50/60"
            : "border-amber-200 bg-amber-50/60"
        }
      >
        <CardContent className="p-4 text-sm flex gap-3">
          {meta.configReady ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold text-slate-900">
              {meta.configReady ? "SMTP ready — permanent" : "SMTP not ready yet"}
            </p>
            <p className="mt-1 text-slate-700 leading-relaxed">
              {meta.configReady
                ? "Host, From email, aur App Password save ho chuke hain. School admin OTP emails ab is account se jayenge."
                : meta.configIssue ||
                  "Enable email, From Email, aur Google App Password bhar ke Save karo."}
            </p>
            {meta.hasPassword ? (
              <p className="mt-2 text-xs text-slate-600 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                Saved password: {meta.passwordMasked || "••••"}
                {meta.passwordDecryptOk === false ? " (re-enter needed)" : ""}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="p-4 text-sm text-slate-700 flex gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-900">Gmail setup (recommended)</p>
            <ol className="mt-1 list-decimal pl-4 space-y-1 leading-relaxed">
              <li>Google Account → Security → 2-Step Verification ON</li>
              <li>App passwords → Mail → generate 16-character password</li>
              <li>Neeche From Email = wahi Gmail, App Password paste, Enable ON, Save</li>
              <li>Send Test — success aaye to OTP permanently kaam karega</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {(msg || err) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            err
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {err || msg}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-violet-600" />
            SMTP Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.emailEnabled}
              onChange={(e) => set("emailEnabled", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Enable email sending & verification
              </div>
              <div className="text-xs text-slate-500">
                Required for school admin email OTP verification
              </div>
            </div>
          </label>

          <Select
            label="Email provider preset"
            options={SMTP_PRESETS.map((p) => p.label)}
            value={preset}
            onChange={(e) => applyPreset(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="SMTP Host *"
              value={form.smtpHost}
              onChange={(e) => set("smtpHost", e.target.value)}
              placeholder="smtp.gmail.com"
            />
            <Input
              label="SMTP Port *"
              value={form.smtpPort}
              onChange={(e) => set("smtpPort", e.target.value)}
              placeholder="587"
            />
            <Input
              label="SMTP Username / Gmail *"
              value={form.smtpUser}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({
                  ...f,
                  smtpUser: v,
                  smtpFromEmail: f.smtpFromEmail || v,
                }));
              }}
              placeholder="yourname@gmail.com"
            />
            <div>
              <Input
                label="SMTP App Password *"
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder={
                  meta.hasPassword
                    ? "Blank = keep DB password (safe)"
                    : "xxxx xxxx xxxx xxxx"
                }
                autoComplete="new-password"
              />
              {meta.hasPassword ? (
                <div className="mt-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-800 space-y-0.5">
                  <p className="font-semibold flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    Password database me permanent hai {meta.passwordMasked}
                  </p>
                  <p className="text-emerald-700/90">
                    Field khali dikhega security ke liye — save delete nahi hota. Sirf naya App Password
                    paste karoge tab replace hoga.
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-xs text-amber-700">
                  App Password abhi DB me nahi — ek baar paste karke Save karo (permanent store)
                </p>
              )}
            </div>
            <Input
              label="From Name"
              value={form.smtpFromName}
              onChange={(e) => set("smtpFromName", e.target.value)}
            />
            <Input
              label="From Email *"
              type="email"
              value={form.smtpFromEmail}
              onChange={(e) => set("smtpFromEmail", e.target.value)}
              placeholder="yourname@gmail.com"
            />
            <Input
              label="Reply-To (optional)"
              type="email"
              value={form.smtpReplyTo}
              onChange={(e) => set("smtpReplyTo", e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm text-slate-700 pt-7">
              <input
                type="checkbox"
                checked={form.smtpSecure}
                onChange={(e) => set("smtpSecure", e.target.checked)}
                className="h-4 w-4"
              />
              Use SSL/TLS (port 465)
            </label>
          </div>

          {meta.smtpLastTestAt && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm flex gap-2 ${
                meta.smtpLastTestOk
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {meta.smtpLastTestOk ? (
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold">
                  Last test: {meta.smtpLastTestOk ? "Success" : "Failed"} —{" "}
                  {new Date(meta.smtpLastTestAt).toLocaleString()}
                </div>
                {!meta.smtpLastTestOk && meta.smtpLastTestError && (
                  <div className="mt-1 text-xs opacity-90">{meta.smtpLastTestError}</div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="success" onClick={save} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save permanently"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send test email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">
            Test pehle settings save karta hai, phir email bhejta hai — success ke baad credentials permanent rehte hain.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              label="Send test to"
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
            <div className="flex items-end">
              <Button onClick={testSmtp} disabled={testing || !testTo}>
                <Send className="h-4 w-4" />
                {testing ? "Saving & sending…" : "Save & Send Test"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
