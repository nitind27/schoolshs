"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import {
  CheckCircle2,
  Copy,
  KeyRound,
  Mail,
  MailCheck,
  MailWarning,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StaffPortalCredentials = {
  created: boolean;
  username?: string | null;
  password?: string | null;
  role?: string | null;
  emailSent?: boolean;
  emailError?: string | null;
  reason?: string;
};

type Props = {
  staffName: string;
  employeeId?: string | null;
  designation?: string | null;
  portal: StaffPortalCredentials;
  onDone: () => void;
};

export function StaffCredentialsModal({
  staffName,
  employeeId,
  designation,
  portal,
  onDone,
}: Props) {
  const t = useT();
  const [copied, setCopied] = useState<"user" | "pass" | "all" | null>(null);

  const copy = async (kind: "user" | "pass" | "all", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* ignore */
    }
  };

  const roleLabel =
    portal.role === "clerk"
      ? t("roles.clerk")
      : portal.role === "teacher"
        ? t("roles.teacher")
        : portal.role || "—";

  const allText = [
    `Name: ${staffName}`,
    employeeId ? `Employee ID: ${employeeId}` : null,
    designation ? `Designation: ${designation}` : null,
    portal.username ? `Username: ${portal.username}` : null,
    portal.password ? `Password: ${portal.password}` : null,
    portal.role ? `Role: ${roleLabel}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/45 p-2 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 sm:max-h-[calc(100dvh-2rem)]"
      >
        <div className="shrink-0 bg-gradient-to-r from-slate-900 to-teal-900 px-4 py-3.5 text-white sm:px-5 sm:py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">{t("staffPage.staffCreatedTitle")}</p>
              <p className="mt-0.5 text-xs text-white/75">{staffName}</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 overscroll-contain sm:p-5">
          {(employeeId || designation) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              {employeeId && (
                <span>
                  {t("staffPage.employeeId")}: <strong>{employeeId}</strong>
                </span>
              )}
              {designation && (
                <span>
                  {t("staffPage.designation")}: <strong>{designation}</strong>
                </span>
              )}
            </div>
          )}

          {portal.created && portal.username && portal.password ? (
            <>
              <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-teal-900">
                  <KeyRound className="h-4 w-4" />
                  {t("staffPage.loginCredentialsTitle")}
                </div>

                <div className="space-y-2.5">
                  <CredRow
                    label={t("staffPage.usernameLabel")}
                    value={portal.username}
                    onCopy={() => copy("user", portal.username!)}
                    copied={copied === "user"}
                    copyLabel={t("common.copy")}
                    copiedLabel={t("common.copied")}
                  />
                  <CredRow
                    label={t("staffPage.passwordLabel")}
                    value={portal.password}
                    mono
                    onCopy={() => copy("pass", portal.password!)}
                    copied={copied === "pass"}
                    copyLabel={t("common.copy")}
                    copiedLabel={t("common.copied")}
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Shield className="h-3.5 w-3.5 text-slate-400" />
                    {t("accountSettings.portalRole")}: <strong>{roleLabel}</strong>
                  </div>
                </div>

                <p className="mt-3 text-[11px] leading-relaxed text-teal-900/80">
                  {t("staffPage.passwordOnceHint")}
                </p>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full sm:w-auto"
                  onClick={() => copy("all", allText)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === "all" ? t("common.copied") : t("staffPage.copyAllCredentials")}
                </Button>
              </div>

              <div
                className={cn(
                  "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs",
                  portal.emailSent
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-900",
                )}
              >
                {portal.emailSent ? (
                  <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <div>
                  <p className="font-semibold">
                    {portal.emailSent
                      ? t("staffPage.emailSentOk")
                      : t("staffPage.emailSentFail")}
                  </p>
                  {!portal.emailSent && portal.emailError && (
                    <p className="mt-0.5 opacity-80">{portal.emailError}</p>
                  )}
                  {portal.emailSent && (
                    <p className="mt-0.5 flex items-center gap-1 opacity-80">
                      <Mail className="h-3 w-3" />
                      {portal.username}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
              {t("staffPage.noPortalForDesignation")}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button type="button" className="w-full sm:w-auto" onClick={onDone}>
              {t("staffPage.doneGoToStaff")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CredRow({
  label,
  value,
  mono,
  onCopy,
  copied,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy: () => void;
  copied: boolean;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <div className="flex flex-col items-stretch gap-2 rounded-lg border border-teal-100 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p
          className={cn(
            "break-all text-sm font-semibold text-slate-900",
            mono && "font-mono text-base tracking-widest text-teal-800",
          )}
        >
          {value}
        </p>
      </div>
      <Button type="button" variant="ghost" size="sm" className="w-full shrink-0 sm:w-auto" onClick={onCopy}>
        <Copy className="h-3.5 w-3.5" />
        {copied ? copiedLabel : copyLabel}
      </Button>
    </div>
  );
}
