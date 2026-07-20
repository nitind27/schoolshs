"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useT } from "@/i18n/locale-provider";
import { KeyRound, UserPlus, CheckCircle2, AlertCircle } from "lucide-react";

type AccountInfo = {
  staffId: string;
  staffName: string;
  staffEmail: string | null;
  designation: string;
  suggestedRole: string;
  account: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
  } | null;
};

export function StaffPortalAccountPanel({ staffId }: { staffId: string }) {
  const t = useT();
  const [data, setData] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("teacher");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/${staffId}/account`);
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: json.error || "Failed" });
        setData(null);
        return;
      }
      setData(json);
      setEmail(json.account?.email || json.staffEmail || "");
      setRole(json.account?.role || json.suggestedRole || "teacher");
      setIsActive(json.account?.isActive !== false);
      setPassword("");
      setConfirmPassword("");
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const creating = !data?.account;
    if (creating || password) {
      if (password.length < 8) {
        setMessage({ type: "err", text: t("accountSettings.passwordMin") });
        return;
      }
      if (password !== confirmPassword) {
        setMessage({ type: "err", text: t("accountSettings.passwordMismatch") });
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${staffId}/account`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          isActive,
          ...(password ? { password } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: json.error || t("accountSettings.saveAccountFailed") });
        return;
      }
      setMessage({
        type: "ok",
        text: json.created
          ? t("accountSettings.accountCreated")
          : json.passwordUpdated
            ? t("accountSettings.staffPasswordUpdated")
            : t("accountSettings.accountUpdated"),
      });
      setPassword("");
      setConfirmPassword("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {data?.account ? (
            <KeyRound className="h-4 w-4 text-blue-600" />
          ) : (
            <UserPlus className="h-4 w-4 text-emerald-600" />
          )}
          {t("accountSettings.portalLogin")}
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">{t("accountSettings.portalLoginHint")}</p>
      </CardHeader>
      <CardContent>
        {data?.account && (
          <div className="mb-4 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              {t("accountSettings.status")}:{" "}
              <strong className={data.account.isActive ? "text-emerald-700" : "text-red-600"}>
                {data.account.isActive ? t("common.active") : t("common.inactive")}
              </strong>
            </span>
            {data.account.lastLoginAt && (
              <span>
                {t("accountSettings.lastLogin")}:{" "}
                {new Date(data.account.lastLoginAt).toLocaleString("en-IN")}
              </span>
            )}
          </div>
        )}

        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t("accountSettings.loginEmail")}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="md:col-span-2"
          />
          <Select
            label={t("accountSettings.portalRole")}
            required
            options={[
              { value: "teacher", label: t("roles.teacher") },
              { value: "clerk", label: t("roles.clerk") },
            ]}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300"
              />
              {t("accountSettings.accountActive")}
            </label>
          </div>
          <Input
            label={
              data?.account
                ? t("accountSettings.newPasswordOptional")
                : t("accountSettings.newPassword")
            }
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!data?.account}
          />
          <Input
            label={t("accountSettings.confirmPassword")}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required={!data?.account || Boolean(password)}
          />

          {message && (
            <div
              className={`md:col-span-2 rounded-xl px-3 py-2.5 text-sm flex items-center gap-2 ${
                message.type === "ok"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.type === "ok" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {message.text}
            </div>
          )}

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving
                ? t("common.saving")
                : data?.account
                  ? t("accountSettings.saveAccount")
                  : t("accountSettings.createLogin")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
