"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Smartphone, CheckCircle, Loader2, Radio, ClipboardPaste } from "lucide-react";

function extractSixDigitOtp(text: string): string | null {
  const m = text.match(/\b(\d{6})\b/);
  return m ? m[1] : null;
}

function SmsBridgeContent() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const inputRef = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<{ schoolName?: string; mobileMasked?: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [listening, setListening] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [error, setError] = useState("");
  const listenAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/automation/sms/relay?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setInfo(d);
      })
      .catch(() => setError("Link invalid — dubara Connect karein"));
  }, [token]);

  const sendOtp = useCallback(
    async (code: string) => {
      if (!token || !/^\d{4,8}$/.test(code) || sending) return;
      setSending(true);
      setError("");
      try {
        const res = await fetch("/api/automation/sms/relay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, otp: code }),
        });
        const data = await res.json();
        if (res.ok) {
          setDone(true);
          setSentCount((c) => c + 1);
          setOtp("");
          setTimeout(() => setDone(false), 2500);
        } else {
          setError(data.error || "Send failed — internet check karein");
        }
      } catch {
        setError("Network error — WiFi/data check karein");
      } finally {
        setSending(false);
      }
    },
    [token, sending]
  );

  const startSmsListen = useCallback(() => {
    if (typeof window === "undefined" || !("OTPCredential" in window)) {
      setListening(false);
      return;
    }
    listenAbort.current?.abort();
    const ac = new AbortController();
    listenAbort.current = ac;
    setListening(true);

    navigator.credentials
      .get({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      } as CredentialRequestOptions)
      .then((cred) => {
        const code = (cred as { code?: string } | null)?.code;
        if (code && /^\d{4,8}$/.test(code)) {
          setOtp(code);
        }
      })
      .catch(() => {
        /* timeout / unsupported — normal */
      })
      .finally(() => {
        if (!ac.signal.aborted) setListening(false);
      });
  }, []);

  useEffect(() => {
    if (!token) return;
    startSmsListen();
    return () => listenAbort.current?.abort();
  }, [token, startSmsListen]);

  useEffect(() => {
    if (/^\d{6}$/.test(otp)) {
      void sendOtp(otp);
    }
  }, [otp, sendOtp]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      inputRef.current?.focus();
      startSmsListen();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [startSmsListen]);

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const code = extractSixDigitOtp(text);
      if (code) setOtp(code);
      else setError("Clipboard me 6 digit OTP nahi mila");
    } catch {
      setError("Paste allow karein — ya SMS notification se OTP select karein");
    }
  };

  const readyToSend = /^\d{4,8}$/.test(otp);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100">
        <p className="text-red-600 text-center">Invalid link — PC par Auto Apply se dubara Connect karein</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 text-white p-5 flex flex-col safe-area-pb">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-white/10 rounded-xl">
          <Smartphone className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-xl font-bold">OTP Bridge</h1>
          <p className="text-blue-200 text-sm">{info?.schoolName || "Scholarship Portal"}</p>
        </div>
      </div>

      {info?.mobileMasked && (
        <p className="text-sm text-blue-100 mb-3 rounded-lg bg-white/5 px-3 py-2">
          DG Mobile: <strong>{info.mobileMasked}</strong>
          {sentCount > 0 && <span className="ml-2 text-green-300">• {sentCount} OTP bheje</span>}
        </p>
      )}

      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className="rounded-xl bg-white/10 p-3 mb-4 text-center">
          <p className="text-sm text-blue-50 leading-relaxed">
            <strong>Har OTP par:</strong> SMS aaye → keyboard par OTP <strong>auto-suggest</strong> dabao → khud website
            par chala jayega
          </p>
          <p className="text-[11px] text-blue-200 mt-2">Button tab active hoga jab OTP box me 6 digit aaye</p>
        </div>

        {listening && (
          <div className="flex items-center justify-center gap-2 text-cyan-200 text-xs mb-3 animate-pulse">
            <Radio className="h-4 w-4" />
            SMS OTP sun rahe hain (auto-capture)...
          </div>
        )}

        <label className="text-xs text-blue-200 mb-2 block">OTP (6 digit)</label>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={8}
          value={otp}
          onChange={(e) => {
            setError("");
            setOtp(e.target.value.replace(/\D/g, ""));
          }}
          placeholder="• • • • • •"
          className="w-full text-center text-4xl font-mono tracking-[0.35em] rounded-2xl border-2 border-blue-300/40 py-5 text-slate-900 bg-white shadow-lg focus:border-green-400 focus:ring-2 focus:ring-green-400/50 outline-none"
          disabled={sending}
        />

        <button
          type="button"
          onClick={pasteFromClipboard}
          className="mt-3 w-full py-3 rounded-xl border border-blue-400/50 text-blue-100 text-sm font-medium flex items-center justify-center gap-2"
        >
          <ClipboardPaste className="h-4 w-4" />
          SMS se copy kiya? Paste karein
        </button>

        <button
          type="button"
          onClick={() => readyToSend && sendOtp(otp)}
          disabled={sending}
          className={`mt-4 w-full py-4 rounded-xl font-bold text-lg transition-all ${
            readyToSend
              ? "bg-green-500 text-white shadow-lg shadow-green-500/30 scale-100"
              : "bg-white/15 text-blue-100 border-2 border-dashed border-white/30"
          } ${sending ? "opacity-70" : ""}`}
        >
          {sending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Bhej rahe hain...
            </span>
          ) : readyToSend ? (
            "OTP Website par Bhejein ✓"
          ) : (
            "OTP SMS aane ka wait — auto-fill hoga"
          )}
        </button>

        {done && (
          <div className="mt-4 flex items-center justify-center gap-2 text-green-300 font-medium text-sm">
            <CheckCircle className="h-5 w-5" />
            Bhej diya! PC par dikhega — agla OTP ke liye ready
          </div>
        )}
        {error && <p className="mt-3 text-center text-red-300 text-sm bg-red-900/30 rounded-lg p-2">{error}</p>}
      </div>

      <div className="mt-6 space-y-2 text-[10px] text-blue-300/90 text-center leading-relaxed">
        <p>📌 Home screen par add karein — har baar fast khulega</p>
        <p>100% automatic chahiye? OTP phone par &quot;SMS Forwarder&quot; app + webhook (PC Advanced section)</p>
      </div>
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
