"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Mail, Save, Send, ShieldCheck, AlertCircle } from "lucide-react";

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
  passwordMasked: string;
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
  const [form, setForm] = useState({
    emailEnabled: false,
    smtpHost: "smtp.gmail.com",
    smtpPort: "587",
    smtpSecure: false,
    smtpUser: "",
    smtpFromName: "SHS Education Portal",
    smtpFromEmail: "",
    smtpReplyTo: "",
  });
  const [meta, setMeta] = useState<Pick<SmtpSettings, "hasPassword" | "passwordMasked" | "smtpLastTestAt" | "smtpLastTestOk" | "smtpLastTestError">>({
    hasPassword: false,
    passwordMasked: "",
    smtpLastTestAt: null,
    smtpLastTestOk: null,
    smtpLastTestError: null,
  });

  const load = () => {
    setLoading(true);
    fetch("/api/admin/platform-settings/email")
      .then((r) => r.json())
      .then((d: SmtpSettings) => {
        setForm({
          emailEnabled: d.emailEnabled,
          smtpHost: d.smtpHost || "smtp.gmail.com",
          smtpPort: String(d.smtpPort || 587),
          smtpSecure: d.smtpSecure,
          smtpUser: d.smtpUser || "",
          smtpFromName: d.smtpFromName || "SHS Education Portal",
          smtpFromEmail: d.smtpFromEmail || "",
          smtpReplyTo: d.smtpReplyTo || "",
        });
        setMeta({
          hasPassword: d.hasPassword,
          passwordMasked: d.passwordMasked,
          smtpLastTestAt: d.smtpLastTestAt,
          smtpLastTestOk: d.smtpLastTestOk,
          smtpLastTestError: d.smtpLastTestError,
        });
        const match = SMTP_PRESETS.find((p) => p.host === d.smtpHost);
        if (match) setPreset(match.label);
        else if (d.smtpHost) setPreset("Custom");
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

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/platform-settings/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          smtpPort: Number(form.smtpPort),
          smtpPassword: smtpPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save");
        return;
      }
      setSmtpPassword("");
      load();
      alert("Email settings saved");
    } finally {
      setSaving(false);
    }
  };

  const testSmtp = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/platform-settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testTo,
          smtpPassword: smtpPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "SMTP test failed");
        load();
        return;
      }
      alert(`Test email sent to ${data.sentTo}`);
      load();
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-200 border-t-violet-600" />
      </div>
    );
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
          <p className="text-sm text-slate-500">Configure Gmail/Outlook app password — school admin verification emails</p>
        </div>
      </div>

      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="p-4 text-sm text-slate-700 flex gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-900">School Admin email verification</p>
            <p className="mt-1 leading-relaxed">
              When enabled, new school admins receive a formatted OTP email (6-digit code). Login is blocked until they enter the OTP on the login page.
              Use Gmail <strong>App Password</strong> (not regular password) if 2FA is on.
            </p>
          </div>
        </CardContent>
      </Card>

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
              <div className="text-sm font-semibold text-slate-900">Enable email sending & verification</div>
              <div className="text-xs text-slate-500">Required for school admin email verification</div>
            </div>
          </label>

          <Select
            label="Email provider preset"
            options={SMTP_PRESETS.map((p) => p.label)}
            value={preset}
            onChange={(e) => applyPreset(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="SMTP Host" value={form.smtpHost} onChange={(e) => set("smtpHost", e.target.value)} placeholder="smtp.gmail.com" />
            <Input label="SMTP Port" value={form.smtpPort} onChange={(e) => set("smtpPort", e.target.value)} placeholder="587" />
            <Input label="SMTP Username / Email" value={form.smtpUser} onChange={(e) => set("smtpUser", e.target.value)} placeholder="noreply@school.com" />
            <div>
              <Input
                label="SMTP App Password"
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder={meta.hasPassword ? "Leave blank to keep saved password" : "16-character app password"}
              />
              {meta.hasPassword && (
                <p className="mt-1 text-xs text-slate-500">Saved: {meta.passwordMasked}</p>
              )}
            </div>
            <Input label="From Name" value={form.smtpFromName} onChange={(e) => set("smtpFromName", e.target.value)} />
            <Input label="From Email" type="email" value={form.smtpFromEmail} onChange={(e) => set("smtpFromEmail", e.target.value)} />
            <Input label="Reply-To (optional)" type="email" value={form.smtpReplyTo} onChange={(e) => set("smtpReplyTo", e.target.value)} />
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
              {saving ? "Saving…" : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send test email</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Input label="Send test to" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          <div className="flex items-end">
            <Button onClick={testSmtp} disabled={testing || !testTo}>
              <Send className="h-4 w-4" />
              {testing ? "Sending…" : "Send Test"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
