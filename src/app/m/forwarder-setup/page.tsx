"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Zap, Copy, CheckCircle, Loader2, ExternalLink, Smartphone } from "lucide-react";

function ForwarderSetupContent() {
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
        <p>Invalid link — PC par Auto Apply se Connect karein</p>
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
          <h1 className="text-xl font-bold">Automatic OTP Setup</h1>
          <p className="text-emerald-200/80 text-sm">{schoolName || "Scholarship Portal"}</p>
        </div>
      </div>

      <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 p-4 mb-6">
        <p className="text-sm leading-relaxed text-emerald-50">
          <strong>Ek baar setup</strong> → uske baad Chrome band, screen lock, kuch bhi — har DG OTP khud PC website par
          jayega. <strong>Koi Allow popup nahi.</strong>
        </p>
      </div>

      <ol className="space-y-5 text-sm">
        <li className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="font-bold text-emerald-200 mb-2">Step 1 — App install karo</p>
          <p className="text-slate-300 mb-3">Play Store se &quot;SMS Forwarder&quot; install karo (free app)</p>
          <a
            href="https://play.google.com/store/search?q=sms%20forwarder%20webhook&c=apps"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-emerald-300 underline"
          >
            Play Store kholo <ExternalLink className="h-4 w-4" />
          </a>
        </li>

        <li className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="font-bold text-emerald-200 mb-2">Step 2 — Naya rule banao</p>
          <ul className="text-slate-300 space-y-1 list-disc pl-4">
            <li>Trigger: <strong>Incoming SMS</strong></li>
            <li>Filter: sab SMS ya &quot;OTP&quot; / &quot;verification&quot; wale</li>
            <li>Action: <strong>Webhook / HTTP POST / URL</strong></li>
          </ul>
        </li>

        <li className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="font-bold text-emerald-200 mb-2">Step 3 — Yeh URL copy karke app me paste karo</p>
          <div className="mt-2 rounded-lg bg-black/30 p-3 font-mono text-[10px] break-all text-emerald-100 leading-relaxed">
            {webhookUrl || "Loading..."}
          </div>
          <button
            type="button"
            onClick={copyUrl}
            className="mt-3 w-full py-3 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2"
          >
            {copied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            {copied ? "Copy ho gaya!" : "Webhook URL Copy karein"}
          </button>
          <p className="text-[10px] text-slate-400 mt-2">
            Agar app me {"{{msg}}"} kaam na kare to {"{{sms}}"} ya {"{{body}}"} try karein
          </p>
        </li>

        <li className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="font-bold text-emerald-200 mb-2">Step 4 — Battery / background allow</p>
          <ul className="text-slate-300 space-y-1 list-disc pl-4">
            <li>SMS Forwarder ko <strong>Auto-start</strong> on karo</li>
            <li>Battery optimization <strong>off</strong> karo is app ke liye</li>
            <li>SMS permission <strong>Allow</strong> (sirf ek baar)</li>
          </ul>
        </li>
      </ol>

      <div className="mt-6 rounded-xl bg-amber-500/15 border border-amber-400/30 p-4 text-sm text-amber-100">
        <p className="font-bold mb-1 flex items-center gap-2">
          <Smartphone className="h-4 w-4" /> Important
        </p>
        <p className="text-amber-200/90 leading-relaxed">
          Phone <strong>band (switch off)</strong> ho to SMS nahi aayegi — koi system nahi kar sakta. Lekin phone on +
          screen lock + Chrome band = <strong>kaam karega</strong>.
        </p>
      </div>

      <p className="mt-6 text-center text-[10px] text-slate-500">
        Manual backup:{" "}
        <a href={`/m/sms-bridge?token=${encodeURIComponent(token)}`} className="text-blue-400 underline">
          OTP Bridge page
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
