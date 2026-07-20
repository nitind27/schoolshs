"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/otp-input";

function VerifyEmailOtpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          otp: otp.replace(/\D/g, ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }
      setVerifiedEmail(data.email || email);
      setSuccess(data.message || "Email verified successfully.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!email.trim() || !password) {
      setError("Enter email and password to resend OTP.");
      return;
    }
    setResendLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to resend OTP");
        return;
      }
      setSuccess(data.message || "New OTP sent. Check your inbox.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  if (verifiedEmail && success) {
    return (
      <div className="min-h-screen min-h-dvh flex items-center justify-center p-4" style={{ background: "#eef2f7" }}>
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Email verified</h1>
          <p className="mt-2 text-sm text-slate-600">{success}</p>
          <p className="mt-2 text-sm font-mono text-blue-700">{verifiedEmail}</p>
          <Button className="mt-6" onClick={() => router.push("/login")}>
            Sign in to portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center p-4" style={{ background: "#eef2f7" }}>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <ShieldCheck className="h-6 w-6 text-blue-700" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Verify your email</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter the 6-digit OTP sent to your email inbox
          </p>
        </div>

        <form onSubmit={verifyOtp} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Verification OTP</label>
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />
            <p className="mt-2 text-xs text-slate-500 text-center">Code expires in 10 minutes</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>
          )}

          <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
              </>
            ) : (
              "Verify OTP"
            )}
          </Button>
        </form>

        <div className="mt-4 flex flex-col gap-2 text-center">
          <button
            type="button"
            onClick={resendOtp}
            disabled={resendLoading}
            className="text-sm font-semibold text-blue-700 hover:underline disabled:opacity-50"
          >
            {resendLoading ? "Sending…" : "Resend OTP"}
          </button>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <Mail className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#eef2f7" }}>
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <VerifyEmailOtpForm />
    </Suspense>
  );
}
