"use client";

import { Spinner } from "@/components/ui/loader";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useT } from "@/i18n/locale-provider";
import {
  KeyRound,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Shield,
  Mail,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export function StaffPortalAccountPanel({
  staffId,
  compactHint,
}: {
  staffId: string;
  /** Optional short note under title */
  compactHint?: boolean;
}) {
  const t = useT();
  const [data, setData] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("teacher");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const putAccount = async (payload: Record<string, unknown>) => {
    const res = await fetch(`/api/staff/${staffId}/account`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || t("accountSettings.saveAccountFailed"));
    }
    return json as {
      created?: boolean;
      passwordUpdated?: boolean;
    };
  };

  const saveAccountDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!data?.account) return;

    setSavingAccount(true);
    try {
      await putAccount({ email, role, isActive });
      setMessage({ type: "ok", text: t("accountSettings.accountUpdated") });
      await load();
    } catch (err) {
      setMessage({
        type: "err",
        text: err instanceof Error ? err.message : t("accountSettings.saveAccountFailed"),
      });
    } finally {
      setSavingAccount(false);
    }
  };

  const savePasswordOrCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      setMessage({ type: "err", text: t("accountSettings.passwordMin") });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: "err", text: t("accountSettings.passwordMismatch") });
      return;
    }

    setSavingPassword(true);
    try {
      const json = await putAccount({
        email: email || data?.staffEmail || "",
        role,
        isActive,
        password,
      });
      setMessage({
        type: "ok",
        text: json.created
          ? t("accountSettings.accountCreated")
          : t("accountSettings.staffPasswordUpdated"),
      });
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      await load();
    } catch (err) {
      setMessage({
        type: "err",
        text: err instanceof Error ? err.message : t("accountSettings.saveAccountFailed"),
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center rounded-2xl border border-slate-200 bg-white py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const hasAccount = Boolean(data?.account);

  return (
    <div className="space-y-4">
      {/* Status strip */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-teal-900 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
              {t("accountSettings.portalLogin")}
            </p>
            <p className="mt-0.5 truncate text-base font-semibold text-white">
              {data?.staffName || "—"}
            </p>
            {!compactHint && (
              <p className="mt-1 text-xs text-white/70">{t("accountSettings.portalLoginHint")}</p>
            )}
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
              hasAccount
                ? data?.account?.isActive
                  ? "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/30"
                  : "bg-red-400/20 text-red-100 ring-1 ring-red-300/30"
                : "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/30",
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            {hasAccount
              ? data?.account?.isActive
                ? t("common.active")
                : t("common.inactive")
              : t("accountSettings.noLoginYet")}
          </span>
        </div>

        {hasAccount && (
          <div className="flex flex-wrap gap-x-5 gap-y-2 px-4 py-3 text-xs text-slate-600 sm:px-5">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <strong className="font-medium text-slate-800">{data?.account?.email}</strong>
            </span>
            <span>
              {t("accountSettings.portalRole")}:{" "}
              <strong className="text-slate-800">
                {data?.account?.role === "clerk" ? t("roles.clerk") : t("roles.teacher")}
              </strong>
            </span>
            {data?.account?.lastLoginAt && (
              <span>
                {t("accountSettings.lastLogin")}:{" "}
                {new Date(data.account.lastLoginAt).toLocaleString("en-IN")}
              </span>
            )}
          </div>
        )}
      </div>

      {message && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm",
            message.type === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-700",
          )}
        >
          {message.type === "ok" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Password / Create — primary action */}
      <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-b from-teal-50/50 to-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
            {hasAccount ? <KeyRound className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {hasAccount
                ? t("accountSettings.resetPasswordTitle")
                : t("accountSettings.createLoginTitle")}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {hasAccount
                ? t("accountSettings.resetPasswordDesc")
                : t("accountSettings.createLoginDesc")}
            </p>
          </div>
        </div>

        <form onSubmit={savePasswordOrCreate} className="space-y-3">
          {!hasAccount && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label={t("accountSettings.loginEmail")}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
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
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative">
              <Input
                label={
                  hasAccount
                    ? t("accountSettings.newPassword")
                    : t("accountSettings.newPassword")
                }
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-[2.05rem] rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={showPassword ? "Hide" : "Show"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Input
              label={t("accountSettings.confirmPassword")}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Lock className="h-3 w-3" />
            {t("accountSettings.passwordMin")}
          </p>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              loading={savingPassword}
              className="bg-teal-700 hover:bg-teal-800"
            >
              {hasAccount
                ? t("accountSettings.updatePassword")
                : t("accountSettings.createLogin")}
            </Button>
          </div>
        </form>
      </div>

      {/* Account details — only when login exists */}
      {hasAccount && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="mb-1 text-sm font-bold text-slate-900">
            {t("accountSettings.loginDetailsTitle")}
          </h3>
          <p className="mb-4 text-xs text-slate-500">{t("accountSettings.loginDetailsDesc")}</p>

          <form onSubmit={saveAccountDetails} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label={t("accountSettings.loginEmail")}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
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
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300"
                />
                {t("accountSettings.accountActive")}
              </label>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" variant="outline" loading={savingAccount}>
                {t("accountSettings.saveAccount")}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
