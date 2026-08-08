"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/loader";
import {
  ArrowLeft,
  KeyRound,
  Mail,
  Save,
  ShieldCheck,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
} from "lucide-react";

type AccountUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lastLoginCity: string | null;
  lastLoginRegion: string | null;
  lastLoginCountry: string | null;
  createdAt: string;
  passwordChangedAt: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminAccountSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    fetch("/api/admin/account", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load");
        const u = d.user as AccountUser;
        setUser(u);
        setName(u.name || "");
        setEmail(u.email || "");
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const emailChanged = Boolean(user && email.trim().toLowerCase() !== user.email.toLowerCase());
  const nameChanged = Boolean(user && name.trim() !== user.name);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (!name.trim() || name.trim().length < 2) {
      setErr("Name must be at least 2 characters");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErr("Enter a valid login email");
      return;
    }
    if (emailChanged && !profileCurrentPassword) {
      setErr("Current password required to change login email");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          ...(emailChanged ? { currentPassword: profileCurrentPassword } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Failed to save profile");
        return;
      }
      setProfileCurrentPassword("");
      setMsg(data.message || "Profile saved");
      if (data.user) {
        setUser((prev) => (prev ? { ...prev, ...data.user } : data.user));
        setName(data.user.name);
        setEmail(data.user.email);
      } else {
        load();
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (!currentPassword || !newPassword) {
      setErr("Current and new password are required");
      return;
    }
    if (newPassword.length < 8) {
      setErr("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr("New passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Failed to change password");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMsg(data.message || "Password updated");
      if (data.user?.passwordChangedAt) {
        setUser((prev) =>
          prev ? { ...prev, passwordChangedAt: data.user.passwordChangedAt } : prev,
        );
      }
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <PageLoader label="Loading account…" />;

  const place = [user?.lastLoginCity, user?.lastLoginRegion, user?.lastLoginCountry]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Account</h1>
          <p className="text-sm text-slate-500">
            Super Admin login name, email aur password yahan se change karo
          </p>
        </div>
      </div>

      {(msg || err) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm flex gap-2 ${
            err
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {err ? (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span>{err || msg}</span>
        </div>
      )}

      <Card className="border-violet-100 bg-violet-50/40">
        <CardContent className="p-4 flex gap-3 text-sm text-slate-700">
          <ShieldCheck className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-900">Security</p>
            <p className="mt-1 text-slate-600 leading-relaxed">
              Email ya password change karne ke liye current password chahiye. Naya password kam se
              kam 8 characters ka hona chahiye.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-violet-600" />
            Profile & login email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <Input
              label="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
            <Input
              label="Login email (ID)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="username"
              required
            />
            {emailChanged ? (
              <Input
                label="Current password (required to change email)"
                type="password"
                value={profileCurrentPassword}
                onChange={(e) => setProfileCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            ) : null}
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span className="rounded-md bg-slate-100 px-2 py-1">Role: Super Admin</span>
              {user?.emailVerified ? (
                <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1">
                  Email verified
                </span>
              ) : null}
            </div>
            <Button type="submit" disabled={savingProfile || (!nameChanged && !emailChanged)}>
              <Save className="h-4 w-4" />
              {savingProfile ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-violet-600" />
            Change password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            <Input
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Min 8 characters"
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Last password change: {fmtDate(user?.passwordChangedAt ?? null)}
            </p>
            <Button type="submit" disabled={savingPassword}>
              <KeyRound className="h-4 w-4" />
              {savingPassword ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-violet-600" />
            Login activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            Last login: <span className="font-medium">{fmtDate(user?.lastLoginAt ?? null)}</span>
          </p>
          {user?.lastLoginIp ? (
            <p className="text-slate-600">IP: {user.lastLoginIp}</p>
          ) : null}
          {place ? (
            <p className="flex items-center gap-2 text-slate-600">
              <MapPin className="h-4 w-4 text-slate-400" />
              {place}
            </p>
          ) : null}
          <p className="text-xs text-slate-500 pt-2">
            Account created: {fmtDate(user?.createdAt ?? null)}
          </p>
          <Link
            href="/admin/login-activity"
            className="inline-flex text-xs font-semibold text-violet-700 underline underline-offset-2 pt-1"
          >
            View full login activity →
          </Link>
        </CardContent>
      </Card>

      <p className="text-xs text-slate-500 text-center pb-4">
        Platform SMTP (school OTP emails) alag hai →{" "}
        <Link href="/admin/settings/email" className="text-violet-700 font-semibold underline">
          Email / SMTP Settings
        </Link>
      </p>
    </div>
  );
}
