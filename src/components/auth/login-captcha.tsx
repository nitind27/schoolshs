"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Shield } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

type Props = {
  answer: string;
  onAnswerChange: (value: string) => void;
  onTokenChange: (token: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  refreshKey?: number;
};

export function LoginCaptcha({
  answer,
  onAnswerChange,
  onTokenChange,
  disabled,
  invalid,
  refreshKey = 0,
}: Props) {
  const t = useT();
  const [svg, setSvg] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/captcha", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSvg(data.imageSvg);
      onTokenChange(data.captchaToken);
      onAnswerChange("");
    } catch {
      setSvg("");
      onTokenChange("");
    } finally {
      setLoading(false);
    }
  }, [onAnswerChange, onTokenChange]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <div className={`auth-captcha ${invalid ? "is-invalid" : ""} ${disabled ? "is-disabled" : ""}`}>
      <div className="auth-captcha-header">
        <div className="auth-captcha-label-wrap">
          <Shield className="auth-captcha-icon" strokeWidth={2} />
          <label className="auth-portal-label" htmlFor="captcha-answer">
            {t("login.captchaLabel")}
          </label>
        </div>
        <button
          type="button"
          className="auth-captcha-refresh"
          onClick={load}
          disabled={loading || disabled}
          title={t("login.captchaRefresh")}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{t("login.captchaRefresh")}</span>
        </button>
      </div>

      <div className="auth-captcha-body">
        <div className="auth-captcha-image" aria-hidden={loading}>
          {loading ? (
            <div className="auth-captcha-image-loading">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--auth-blue, #2563eb)" }} />
            </div>
          ) : svg ? (
            <div className="auth-captcha-svg" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <div className="auth-captcha-image-loading text-xs text-slate-500">
              {t("login.captchaLoadError")}
            </div>
          )}
        </div>

        <div className="auth-captcha-input-wrap">
          <input
            id="captcha-answer"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={6}
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder={t("login.captchaPlaceholder")}
            className="auth-portal-input is-mono auth-captcha-input"
            disabled={disabled || loading}
            required
          />
          <p className="auth-portal-field-hint">{t("login.captchaHint")}</p>
        </div>
      </div>
    </div>
  );
}
