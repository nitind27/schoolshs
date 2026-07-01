"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Smartphone, CheckCircle, Loader2 } from "lucide-react";

function SmsBridgeContent() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [info, setInfo] = useState<{ schoolName?: string; mobileMasked?: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/automation/sms/relay?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setInfo(d);
      })
      .catch(() => setError("Link invalid"));
  }, [token]);

  const sendOtp = useCallback(
    async (code: string) => {
      if (!token || !/^\d{4,8}$/.test(code)) return;
      setSending(true);
      setError("");
      const res = await fetch("/api/automation/sms/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, otp: code }),
      });
      const data = await res.json();
      setSending(false);
      if (res.ok) {
        setDone(true);
        setOtp("");
        setTimeout(() => setDone(false), 3000);
      } else {
        setError(data.error || "Failed");
      }
    },
    [token]
  );

  useEffect(() => {
    if (/^\d{6}$/.test(otp)) {
      void sendOtp(otp);
    }
  }, [otp, sendOtp]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100">
        <p className="text-red-600 text-center">Invalid link — Auto Apply page se dubara connect karein</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 text-white p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-white/10 rounded-xl">
          <Smartphone className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-xl font-bold">OTP Bridge</h1>
          <p className="text-blue-200 text-sm">{info?.schoolName || "Scholarship Portal"}</p>
        </div>
      </div>

      {info?.mobileMasked && (
        <p className="text-sm text-blue-100 mb-4">
          Connected: <strong>{info.mobileMasked}</strong>
        </p>
      )}

      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <p className="text-center text-blue-100 mb-4 text-sm leading-relaxed">
          Jab DG / Sandes se OTP SMS aaye, yahan OTP dabayein ya SMS se auto-suggest select karein — website par
          auto-fill hoga
        </p>

        <label className="text-xs text-blue-200 mb-2 block">Enter OTP</label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          placeholder="6 digit OTP"
          className="w-full text-center text-3xl font-mono tracking-[0.4em] rounded-2xl border-0 py-5 text-slate-900 shadow-lg"
          disabled={sending}
        />

        <button
          type="button"
          onClick={() => sendOtp(otp)}
          disabled={sending || otp.length < 4}
          className="mt-4 w-full py-4 rounded-xl bg-green-500 text-white font-bold text-lg disabled:opacity-50"
        >
          {sending ? "Sending..." : "OTP Website par Bhejein"}
        </button>

        {done && (
          <div className="mt-4 flex items-center justify-center gap-2 text-green-300 font-medium">
            <CheckCircle className="h-5 w-5" />
            OTP bhej diya — PC par auto-fill hoga!
          </div>
        )}
        {error && <p className="mt-3 text-center text-red-300 text-sm">{error}</p>}
      </div>

      <p className="text-center text-[10px] text-blue-300/80 mt-8">
        Is page ko phone par bookmark karein — har OTP ke time kholein
      </p>
    </div>
  );
}

export default function SmsBridgePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <SmsBridgeContent />
    </Suspense>
  );
}
