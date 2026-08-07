"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Send, Shield, Users, Building2, Sparkles } from "lucide-react";
import { Spinner } from "@/components/ui/loader";
import { useT } from "@/i18n/locale-provider";
import {
  LEAD_ROLE_OPTIONS,
  validateLeadForm,
  type LeadErrorCode,
  type LeadField,
  type LeadFieldErrors,
} from "@/lib/landing-lead";
import "@/components/landing/landing-expert-modal.css";

const STORAGE_KEY = "codeat-landing-expert-modal";
const OPEN_DELAY_MS = 4500;

type StoredState = { dismissedAt?: number; submittedAt?: number };

function readStored(): StoredState {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}") as StoredState;
  } catch {
    return {};
  }
}

function writeStored(patch: StoredState) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readStored(), ...patch }));
}

export function LandingExpertModal() {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    instituteName: "",
    roleType: "",
  });
  const [fieldErrors, setFieldErrors] = useState<LeadFieldErrors>({});
  const [formErr, setFormErr] = useState("");
  const [formOk, setFormOk] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const stored = readStored();
    if (stored.submittedAt || stored.dismissedAt) return;

    const timer = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const errorForCode = (code?: LeadErrorCode, fallback?: string) => {
    if (!code) return fallback || t("landing.leadFormError");
    const key = `landing.leadErr_${code}`;
    const msg = t(key);
    return msg === key ? fallback || t("landing.leadFormError") : msg;
  };

  function closeModal() {
    setOpen(false);
    writeStored({ dismissedAt: Date.now() });
  }

  function setField(field: LeadField, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (formErr) setFormErr("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormOk(false);

    const local = validateLeadForm(form);
    if (!local.ok) {
      const mapped: LeadFieldErrors = {};
      for (const field of Object.keys(local.errors) as LeadField[]) {
        mapped[field] = errorForCode(local.codes[field], local.errors[field]);
      }
      setFieldErrors(mapped);
      setFormErr(t("landing.leadFormFixFields"));
      return;
    }

    setFieldErrors({});
    setSending(true);
    try {
      const res = await fetch("/api/contact-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...local.data, source: "landing_modal" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.codes && typeof data.codes === "object") {
          const mapped: LeadFieldErrors = {};
          for (const [field, code] of Object.entries(data.codes as Record<string, LeadErrorCode>)) {
            mapped[field as LeadField] = errorForCode(code, data.errors?.[field]);
          }
          setFieldErrors(mapped);
          setFormErr(t("landing.leadFormFixFields"));
          return;
        }
        throw new Error(data.error || t("landing.leadFormError"));
      }
      setFormOk(true);
      writeStored({ submittedAt: Date.now() });
      window.setTimeout(() => {
        setOpen(false);
      }, 2200);
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : t("landing.leadFormError"));
    } finally {
      setSending(false);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="lp-lead-root" role="dialog" aria-modal="true" aria-labelledby="lp-lead-title">
      <button type="button" className="lp-lead-backdrop" onClick={closeModal} aria-label={t("landing.leadClose")} />
      <div className="lp-lead-panel">
        <button type="button" className="lp-lead-close" onClick={closeModal} aria-label={t("landing.leadClose")}>
          <X className="h-5 w-5" />
        </button>

        <div className="lp-lead-layout">
          <div className="lp-lead-promo">
            <p className="lp-lead-eyebrow">{t("landing.leadEyebrow")}</p>
            <h2 id="lp-lead-title" className="lp-lead-title">
              {t("landing.leadTitle")}
            </h2>
            <p className="lp-lead-desc">{t("landing.leadDesc")}</p>

            <ul className="lp-lead-stats">
              <li>
                <Building2 className="h-5 w-5" aria-hidden />
                <div>
                  <strong>{t("landing.leadStat1Value")}</strong>
                  <span>{t("landing.leadStat1Label")}</span>
                </div>
              </li>
              <li>
                <Users className="h-5 w-5" aria-hidden />
                <div>
                  <strong>{t("landing.leadStat2Value")}</strong>
                  <span>{t("landing.leadStat2Label")}</span>
                </div>
              </li>
              <li>
                <Shield className="h-5 w-5" aria-hidden />
                <div>
                  <strong>{t("landing.leadStat3Value")}</strong>
                  <span>{t("landing.leadStat3Label")}</span>
                </div>
              </li>
            </ul>

            <p className="lp-lead-trust">
              <Sparkles className="h-4 w-4" aria-hidden />
              {t("landing.leadTrust")}
            </p>
          </div>

          <div className="lp-lead-form-wrap">
            <h3 className="lp-lead-form-title">{t("landing.leadFormTitle")}</h3>
            {formOk ? (
              <div className="lp-lead-success">
                <p>{t("landing.leadFormSuccess")}</p>
              </div>
            ) : (
              <form className="lp-lead-form" onSubmit={onSubmit} noValidate>
                <label className={`lp-lead-field${fieldErrors.name ? " has-error" : ""}`}>
                  <span>{t("landing.leadFormName")}</span>
                  <input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    autoComplete="name"
                    maxLength={80}
                  />
                  {fieldErrors.name && <p className="lp-lead-field-err">{fieldErrors.name}</p>}
                </label>

                <label className={`lp-lead-field${fieldErrors.email ? " has-error" : ""}`}>
                  <span>{t("landing.leadFormEmail")}</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    autoComplete="email"
                    maxLength={180}
                  />
                  {fieldErrors.email && <p className="lp-lead-field-err">{fieldErrors.email}</p>}
                </label>

                <label className={`lp-lead-field${fieldErrors.phone ? " has-error" : ""}`}>
                  <span>{t("landing.leadFormPhone")}</span>
                  <div className="lp-lead-phone-row">
                    <span className="lp-lead-phone-prefix">+91</span>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="8123456789"
                      maxLength={10}
                    />
                  </div>
                  {fieldErrors.phone && <p className="lp-lead-field-err">{fieldErrors.phone}</p>}
                </label>

                <label className={`lp-lead-field${fieldErrors.instituteName ? " has-error" : ""}`}>
                  <span>{t("landing.leadFormInstitute")}</span>
                  <input
                    value={form.instituteName}
                    onChange={(e) => setField("instituteName", e.target.value)}
                    maxLength={120}
                  />
                  {fieldErrors.instituteName && (
                    <p className="lp-lead-field-err">{fieldErrors.instituteName}</p>
                  )}
                </label>

                <label className={`lp-lead-field${fieldErrors.roleType ? " has-error" : ""}`}>
                  <span>{t("landing.leadFormRole")}</span>
                  <select
                    value={form.roleType}
                    onChange={(e) => setField("roleType", e.target.value)}
                  >
                    <option value="">{t("landing.leadFormRolePlaceholder")}</option>
                    {LEAD_ROLE_OPTIONS.map((key) => (
                      <option key={key} value={key}>
                        {key === "other" ? t("landing.leadRoleOther") : t(`roles.${key}`)}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.roleType && <p className="lp-lead-field-err">{fieldErrors.roleType}</p>}
                </label>

                {formErr && <p className="lp-lead-form-err">{formErr}</p>}

                <button type="submit" className="lp-lead-submit" disabled={sending}>
                  {sending ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      {t("landing.leadFormSending")}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {t("landing.leadFormSubmit")}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
