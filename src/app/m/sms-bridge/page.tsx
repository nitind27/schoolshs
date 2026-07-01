"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Smartphone, CheckCircle, Loader2, AlertCircle, Wifi, Zap } from "lucide-react";
import { extractOtpFromSms } from "@/lib/sms-otp";

function SmsBridgeContent() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const sendingRef = useRef(false);

  const [info, setInfo] = useState<{ schoolName?: string; mobileMasked?: string } | null>(null);
  const [linkOk, setLinkOk] = useState<boolean | null>(null);
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [lastSent, setLastSent] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/automation/sms/relay?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || d.error) {
          setLinkOk(false);
          setError(d.error || "Link invalid — PC par dubara Connect karein");
          return;
        }
        setLinkOk(true);
        setInfo(d);
      })
      .catch(() => {
        setLinkOk(false);
        setError("PC se connect nahi — same WiFi check karein");
      });
  }, [token]);

  const sendOtp = useCallback(
    async (code: string) => {
      const normalized = code.replace(/\D/g, "");
      if (!token || !/^\d{4,8}$/.test(normalized) || sendingRef.current) return;

      sendingRef.current = true;
      setSending(true);
      setError("");

      try {
        const res = await fetch("/api/automation/sms/relay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, otp: normalized }),
        });
        const data = await res.json();
        if (res.ok) {
          setDone(true);
          setLastSent(normalized);
          setOtp("");
          setTimeout(() => setDone(false), 3000);
        } else {
          setError(data.error || "Send failed");
        }
      } catch {
        setError("Network error — phone aur PC same WiFi par hone chahiye");
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [token]
  );

  const onOtpChange = (raw: string) => {
    setError("");
    const digits = raw.replace(/\D/g, "");
    if (digits.length <= 8) {
      setOtp(digits);
      return;
    }
    const fromSms = extractOtpFromSms(raw);
    setOtp(fromSms || digits.slice(0, 8));
  };

  const readyToSend = /^\d{4,8}$/.test(otp);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100">
        <p className="text-red-600 text-center">Invalid link</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 text-white p-5 flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-3 bg-white/10 rounded-xl">
          <Smartphone className="h-8 w-8" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">OTP Bridge (Manual)</h1>
          <p className="text-blue-200 text-sm">{info?.schoolName || "Scholarship Portal"}</p>
        </div>
        {linkOk === true && (
          <span className="flex items-center gap-1 text-[10px] text-green-300 bg-green-900/40 px-2 py-1 rounded-full">
            <Wifi className="h-3 w-3" /> OK
          </span>
        )}
        {linkOk === false && (
          <span className="flex items-center gap-1 text-[10px] text-red-300 bg-red-900/40 px-2 py-1 rounded-full">
            <AlertCircle className="h-3 w-3" /> Error
          </span>
        )}
      </div>

      <Link
        href={`/m/forwarder-setup?token=${encodeURIComponent(token)}`}
        className="mb-4 block rounded-xl bg-emerald-500/25 border border-emerald-400/50 p-4"
      >
        <div className="flex items-start gap-3">
          <Zap className="h-6 w-6 text-emerald-300 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-100">Automatic chahiye? (Recommended)</p>
            <p className="text-sm text-emerald-200/90 mt-1">
              SMS Forwarder app lagao — Chrome band, screen off — OTP khud website par jayega. Koi Allow popup nahi.
            </p>
            <p className="text-xs text-emerald-300 mt-2 underline">Setup guide kholo →</p>
          </div>
        </div>
      </Link>

      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <p className="text-sm text-blue-100 mb-4 text-center">
          Manual backup: SMS aaye → sirf <strong>6 digit</strong> type karo → Bhejein
        </p>

        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          value={otp}
          onChange={(e) => onOtpChange(e.target.value)}
          placeholder="306187"
          className="w-full text-center text-4xl font-mono tracking-[0.35em] rounded-2xl border-2 border-blue-300/40 py-5 text-slate-900 bg-white shadow-lg outline-none focus:border-green-400"
          disabled={sending || linkOk === false}
        />

        <button
          type="button"
          onClick={() => sendOtp(otp)}
          disabled={sending || !readyToSend || linkOk === false}
          className={`mt-4 w-full py-4 rounded-xl font-bold text-lg ${
            readyToSend ? "bg-green-500 text-white" : "bg-white/15 text-blue-100 border-2 border-dashed border-white/30"
          }`}
        >
          {sending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Bhej rahe hain...
            </span>
          ) : (
            "OTP Website par Bhejein"
          )}
        </button>

        {done && lastSent && (
          <div className="mt-4 text-center text-green-300 font-medium">
            <CheckCircle className="h-6 w-6 inline mr-1" /> {lastSent} bhej diya!
          </div>
        )}
        {error && <p className="mt-3 text-center text-red-200 text-sm bg-red-900/40 rounded-lg p-3">{error}</p>}
      </div>

      <p className="mt-6 text-[10px] text-blue-300/80 text-center">
        Is page ko band kar sakte ho agar SMS Forwarder setup ho chuka hai
      </p>
    </div>
  );
}

export default function SmsBridgePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-blue-950">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      }
    >
      <SmsBridgeContent />
    </Suspense>
  );
}
