"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/i18n/locale-provider";
import {
  KeyRound,
  ShieldAlert,
  User,
  Mail,
  Building2,
  CheckCircle2,
  Lock,
} from "lucide-react";

type MeUser = {
  name: string;
  email: string;
  role: string;
  schoolName?: string | null;
  schoolCode?: string | null;
};

export default function ProfilePage() {
  const t = useT();
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const homeHref =
    user?.role === "clerk" ? "/clerk" : user?.role === "teacher" ? "/teacher" : "/dashboard";
  const isAdmin = user?.role === "school_admin";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user || null))
      .finally(() => setLoading(false));
  }, []);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setMessage({ type: "err", text: t("accountSettings.passwordMismatch") });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: "err", text: t("accountSettings.passwordMin") });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: data.error || t("accountSettings.passwordFailed") });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "ok", text: t("accountSettings.passwordUpdated") });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center h-48 items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <PageShell
      title={t("accountSettings.myProfile")}
      subtitle={t("accountSettings.profileSubtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: homeHref },
        { label: t("accountSettings.myProfile") },
      ]}
    >
      <div className="grid lg:grid-cols-5 gap-5 max-w-4xl">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-blue-600" />
              {t("accountSettings.accountInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold uppercase">
                {(user?.name || "?").charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-xs text-slate-500 capitalize">
                      {user?.role === "school_admin"
                        ? t("roles.school_admin")
                        : user?.role === "teacher"
                          ? t("roles.teacher")
                          : user?.role === "clerk"
                            ? t("roles.clerk")
                            : user?.role}
                    </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-slate-600">
                <Mail className="h-4 w-4 text-slate-400" />
                {user?.email}
              </p>
              {(user?.schoolName || user?.schoolCode) && (
                <p className="flex items-center gap-2 text-slate-600">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  {user.schoolName}
                  {user.schoolCode ? ` (${user.schoolCode})` : ""}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <KeyRound className="h-4 w-4 text-emerald-600" />
                  {t("accountSettings.changePassword")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={changePassword} className="space-y-4">
                  <Input
                    type="password"
                    label={t("accountSettings.currentPassword")}
                    required
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    label={t("accountSettings.newPassword")}
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    label={t("accountSettings.confirmPassword")}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {message && (
                    <div
                      className={`rounded-xl px-3 py-2.5 text-sm flex items-center gap-2 ${
                        message.type === "ok"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {message.type === "ok" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                      )}
                      {message.text}
                    </div>
                  )}
                  <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                    <Lock className="h-4 w-4" />
                    {saving ? t("common.saving") : t("accountSettings.updatePassword")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-950">
                      {t("accountSettings.noSelfServiceTitle")}
                    </h3>
                    <p className="text-sm text-amber-900/80 mt-1.5 leading-relaxed">
                      {t("accountSettings.contactAdminForPassword")}
                    </p>
                    <p className="text-xs text-amber-800/70 mt-3">
                      {t("accountSettings.contactAdminHint")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <p className="text-xs text-slate-500 mt-4">
              {t("accountSettings.adminCanResetStaff")}{" "}
              <Link href="/staff" className="text-blue-600 hover:underline font-medium">
                {t("nav.staff")}
              </Link>
            </p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
