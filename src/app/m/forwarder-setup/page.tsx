"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Zap, Copy, CheckCircle, Loader2, ExternalLink, Smartphone } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

function ForwarderSetupContent() {
  const t = useT();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [schoolName, setSchoolName] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/automation/sms/relay?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.schoolName) setSchoolName(d.schoolName);
      })
      .catch(() => {});
  }, [token]);

  const webhookUrl =
    origin && token
      ? `${origin}/api/automation/sms/webhook?token=${encodeURIComponent(token)}&text={{msg}}&from={{from}}`
      : "";

  const copyUrl = async () => {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white">
        <p>{t("otpMobile.invalidLinkReconnect")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 to-slate-950 text-white p-5 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-emerald-500/20 rounded-xl">
          <Zap className="h-8 w-8 text-emerald-300" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{t("otpMobile.setupTitle")}</h1>
          <p className="text-emerald-200/80 text-sm">{schoolName || t("otpMobile.scholarshipPortal")}</p>
        </div>
      </div>

      <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 p-4 mb-6">
        <p className="text-sm leading-relaxed text-emerald-50">{t("otpMobile.setupOnceNote")}</p>
      </div>

      <ol className="space-y-5 text-sm">
        <li className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="font-bold text-emerald-200 mb-2">{t("otpMobile.step1Title")}</p>
          <p className="text-slate-300 mb-3">{t("otpMobile.step1Desc")}</p>
          <a
            href="https://play.google.com/store/search?q=sms%20forwarder%20webhook&c=apps"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-emerald-300 underline"
          >
            {t("otpMobile.openPlayStore")} <ExternalLink className="h-4 w-4" />
          </a>
        </li>

        <li className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="font-bold text-emerald-200 mb-2">{t("otpMobile.step2Title")}</p>
          <ul className="text-slate-300 space-y-1 list-disc pl-4">
            <li>{t("otpMobile.step2Trigger")}</li>
            <li>{t("otpMobile.step2Filter")}</li>
            <li>{t("otpMobile.step2Action")}</li>
          </ul>
        </li>

        <li className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="font-bold text-emerald-200 mb-2">{t("otpMobile.step3Title")}</p>
          <div className="mt-2 rounded-lg bg-black/30 p-3 font-mono text-[10px] break-all text-emerald-100 leading-relaxed">
            {webhookUrl || t("common.loading")}
          </div>
          <button
            type="button"
            onClick={copyUrl}
            className="mt-3 w-full py-3 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2"
          >
            {copied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            {copied ? t("otpMobile.copied") : t("otpMobile.copyWebhookUrl")}
          </button>
          <p className="text-[10px] text-slate-400 mt-2">
            {t("otpMobile.step3PlaceholderHint", { msg: "{{msg}}", sms: "{{sms}}", body: "{{body}}" })}
          </p>
        </li>

        <li className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="font-bold text-emerald-200 mb-2">{t("otpMobile.step4Title")}</p>
          <ul className="text-slate-300 space-y-1 list-disc pl-4">
            <li>{t("otpMobile.step4AutoStart")}</li>
            <li>{t("otpMobile.step4Battery")}</li>
            <li>{t("otpMobile.step4SmsPerm")}</li>
          </ul>
        </li>
      </ol>

      <div className="mt-6 rounded-xl bg-amber-500/15 border border-amber-400/30 p-4 text-sm text-amber-100">
        <p className="font-bold mb-1 flex items-center gap-2">
          <Smartphone className="h-4 w-4" /> {t("otpMobile.importantTitle")}
        </p>
        <p className="text-amber-200/90 leading-relaxed">{t("otpMobile.importantNote")}</p>
      </div>

      <p className="mt-6 text-center text-[10px] text-slate-500">
        {t("otpMobile.manualBackupLink")}:{" "}
        <a href={`/m/sms-bridge?token=${encodeURIComponent(token)}`} className="text-blue-400 underline">
          {t("otpMobile.bridgeTitle")}
        </a>
      </p>
    </div>
  );
}

export default function ForwarderSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-emerald-950">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      }
    >
      <ForwarderSetupContent />
    </Suspense>
  );
}
