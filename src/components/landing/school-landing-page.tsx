"use client";

import { Spinner } from "@/components/ui/loader";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  GraduationCap,
  ArrowRight,
  Award,
  BookOpen,
  Calculator,
  Users,
  IdCard,
  FileText,
  Shield,
  Bot,
  ClipboardCheck,
  Building2,
  UserCheck,
  Lock,
  School,
  Send,
  CheckCircle2,
  X,
  type LucideIcon,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { FooterHolidayCalendar } from "@/components/landing/footer-holiday-calendar";
import { LandingExpertModal } from "@/components/landing/landing-expert-modal";
import { useT } from "@/i18n/locale-provider";
import {
  CONTACT_LIMITS,
  validateContactForm,
  type ContactErrorCode,
  type ContactField,
  type ContactFieldErrors,
} from "@/lib/contact-support";
import "@/components/landing/landing.css";

const PORTAL_ROLES = [
  { key: "school_admin", icon: Building2 },
  { key: "teacher", icon: BookOpen },
  { key: "clerk", icon: UserCheck },
  { key: "student", icon: GraduationCap },
  { key: "ca", icon: Calculator },
] as const;

const SERVICES = [
  { icon: Award, key: "scholarship" },
  { icon: BookOpen, key: "results" },
  { icon: Calculator, key: "accounting" },
  { icon: ClipboardCheck, key: "admissions" },
  { icon: Bot, key: "autoApply" },
  { icon: IdCard, key: "idCards" },
  { icon: FileText, key: "certificates" },
  { icon: Users, key: "students" },
] as const;

const HERO_VIDEO_SRC = "/video/bgvideo.mp4";

type ServiceKey = (typeof SERVICES)[number]["key"];

function ModuleDetailModal({
  serviceKey,
  index,
  icon: Icon,
  onClose,
}: {
  serviceKey: ServiceKey;
  index: number;
  icon: LucideIcon;
  onClose: () => void;
}) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const num = String(index + 1).padStart(2, "0");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  const points = [1, 2, 3].map((n) => t(`landing.module_${serviceKey}_point${n}`));

  return createPortal(
    <div className="lp-module-modal-root" role="dialog" aria-modal="true" aria-labelledby="lp-module-modal-title">
      <button type="button" className="lp-module-modal-backdrop" onClick={onClose} aria-label={t("landing.moduleModalClose")} />
      <div className="lp-module-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lp-module-modal-head">
          <div className="lp-module-modal-badge" aria-hidden>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="lp-module-modal-kicker">
              <span>{t("landing.moduleModalEyebrow")}</span>
              <span aria-hidden>·</span>
              <span>{num}</span>
            </p>
            <h2 id="lp-module-modal-title">{t(`landing.module_${serviceKey}`)}</h2>
          </div>
          <button type="button" className="lp-module-modal-close" onClick={onClose} aria-label={t("landing.moduleModalClose")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="lp-module-modal-body">
          <p className="lp-module-modal-lead">{t(`landing.module_${serviceKey}_detail`)}</p>
          <ul className="lp-module-modal-points">
            {points.map((text) => (
              <li key={text}>
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lp-module-modal-foot">
          <button type="button" className="lp-module-modal-ghost" onClick={onClose}>
            {t("landing.moduleModalClose")}
          </button>
          <Link href="/login" className="lp-module-modal-cta" onClick={onClose}>
            {t("landing.moduleModalCta")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}

function useScrollReveal() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll(".landing-fade:not(.landing-fade--show)");
    const show = (el: Element) => el.classList.add("landing-fade--show");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) show(e.target);
        }),
      { threshold: 0.12, rootMargin: "0px 0px -36px 0px" }
    );
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9) show(el);
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return rootRef;
}

export function SchoolLandingPage() {
  const t = useT();
  const pageRef = useScrollReveal();
  const [scrolled, setScrolled] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    schoolCode: "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [formOk, setFormOk] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [activeModule, setActiveModule] = useState<{ key: ServiceKey; index: number } | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  const errorForCode = (code?: ContactErrorCode, fallback?: string) => {
    if (!code) return fallback || t("landing.formError");
    const key = `landing.formErr_${code}`;
    const msg = t(key);
    return msg === key ? fallback || t("landing.formError") : msg;
  };

  const setField = (field: ContactField, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (formErr) setFormErr("");
    if (formOk) setFormOk(false);
  };

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;
    video.muted = true;
    const play = () => {
      void video.play().catch(() => {});
    };
    play();
    video.addEventListener("loadeddata", play);
    return () => video.removeEventListener("loadeddata", play);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormErr("");
    setFormOk(false);

    const local = validateContactForm(form);
    if (!local.ok) {
      const mapped: ContactFieldErrors = {};
      for (const field of Object.keys(local.codes) as ContactField[]) {
        mapped[field] = errorForCode(local.codes[field], local.errors[field]);
      }
      setFieldErrors(mapped);
      setFormErr(t("landing.formFixFields"));
      return;
    }

    setFieldErrors({});
    setSending(true);
    try {
      const res = await fetch("/api/contact-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(local.data),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.codes && typeof data.codes === "object") {
          const mapped: ContactFieldErrors = {};
          for (const [field, code] of Object.entries(data.codes as Record<string, ContactErrorCode>)) {
            mapped[field as ContactField] = errorForCode(code, data.errors?.[field]);
          }
          setFieldErrors(mapped);
          setFormErr(t("landing.formFixFields"));
          return;
        }
        throw new Error(data.error || t("landing.formError"));
      }
      setFormOk(true);
      setForm({ name: "", email: "", phone: "", schoolCode: "", subject: "", message: "" });
      setFieldErrors({});
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : t("landing.formError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div ref={pageRef} id="top" className="landing-site min-h-screen">
      <header className={`lp-header ${scrolled ? "is-scrolled" : ""}`}>
        <div className="lp-shell lp-header-inner">
          <Link href="/" className="lp-logo">
            <span className="lp-brand-mark" aria-hidden>
              <School className="h-5 w-5" />
            </span>
            <span className="lp-logo-text">
              <span className="lp-display">{t("landing.productName")}</span>
              <span>{t("landing.productTag")}</span>
            </span>
          </Link>

          <nav className="lp-nav" aria-label="Primary">
            <a href="#modules">{t("landing.navModules")}</a>
            <a href="#portals">{t("landing.navPortals")}</a>
            <a href="#contact">{t("landing.navContact")}</a>
          </nav>

          <div className="lp-header-actions">
            <LanguageSwitcher variant="compact" />
            <Link href="/login" className="lp-btn-enter">
              {t("landing.ctaPortal")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="lp-hero lp-hero--v2" aria-label={t("landing.productName")}>
        <div className="lp-hero-media">
          <video
            ref={heroVideoRef}
            className="lp-hero-video"
            src={HERO_VIDEO_SRC}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            aria-hidden
          />
          <div className="lp-hero-shade" aria-hidden />
          <div className="lp-hero-grain" aria-hidden />
        </div>

        <div className="lp-shell lp-hero-content landing-fade landing-fade--show">
          <p className="lp-hero-kicker">
            <span className="lp-hero-dot" />
            {t("landing.productTag")}
          </p>
          <h1 className="lp-brand-title">{t("landing.productName")}</h1>
          <p className="lp-headline">{t("landing.heroHeadline")}</p>
          <p className="lp-lede">{t("landing.heroDesc")}</p>
          <div className="lp-cta-row">
            <Link href="/login" className="lp-btn-primary">
              <span>{t("landing.ctaPortal")}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#modules" className="lp-btn-ghost">
              {t("landing.ctaExplore")}
            </a>
          </div>
        </div>
      </section>

      <section id="modules" className="lp-section">
        <div className="lp-shell">
          <div className="landing-fade lp-section-head lp-section-head--split">
            <div>
              <p className="lp-eyebrow">{t("landing.modulesEyebrow")}</p>
              <h2>{t("landing.modulesTitle")}</h2>
            </div>
            <p className="lp-section-lead">{t("landing.modulesDesc")}</p>
          </div>

          <ol className="lp-module-rail">
            {SERVICES.map((s, i) => (
              <li key={s.key} className={`landing-fade landing-fade--d${((i % 3) + 1) as 1 | 2 | 3}`}>
                <button
                  type="button"
                  className="lp-module-item"
                  onClick={() => setActiveModule({ key: s.key, index: i })}
                  aria-haspopup="dialog"
                >
                  <span className="lp-module-num">{String(i + 1).padStart(2, "0")}</span>
                  <div className="lp-module-icon">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3>{t(`landing.module_${s.key}`)}</h3>
                    <p>{t(`landing.module_${s.key}_desc`)}</p>
                    <span className="lp-module-hint">{t("landing.moduleClickHint")}</span>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {activeModule && (
        <ModuleDetailModal
          serviceKey={activeModule.key}
          index={activeModule.index}
          icon={SERVICES[activeModule.index]!.icon}
          onClose={() => setActiveModule(null)}
        />
      )}

      <section id="portals" className="lp-portals-band">
        <div className="lp-shell lp-section">
          <div className="landing-fade lp-section-head lp-section-head--center">
            <p className="lp-eyebrow">{t("landing.portalEyebrow")}</p>
            <h2>{t("landing.portalTitle")}</h2>
            <p className="lp-section-lead">{t("landing.portalDesc")}</p>
          </div>

          <div className="lp-roles">
            {PORTAL_ROLES.map((p, i) => (
              <Link
                key={p.key}
                href={p.key === "ca" ? "/login?portal=ca" : "/login"}
                className={`lp-role landing-fade landing-fade--d${((i % 3) + 1) as 1 | 2 | 3}`}
              >
                <div className="lp-role-icon">
                  <p.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3>{t(`roles.${p.key}`)}</h3>
                  <p>{t("landing.portalLoginHint")}</p>
                </div>
                <ArrowRight className="lp-role-arrow h-4 w-4" />
              </Link>
            ))}
          </div>

          <div className="lp-note landing-fade">
            <Shield className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <strong>{t("landing.noticeLabel")}:</strong> {t("landing.noticeText")}
            </p>
          </div>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-shell">
          <div className="lp-cta-band landing-fade">
            <div>
              <h2>{t("landing.ctaTitle")}</h2>
              <p>{t("landing.ctaDesc")}</p>
            </div>
            <Link href="/login" className="lp-btn-on-dark">
              <Lock className="h-4 w-4" />
              {t("landing.ctaPortal")}
            </Link>
          </div>
        </div>
      </section>

      <section id="contact" className="lp-support-band">
        <div className="lp-shell lp-section">
          <div className="lp-monitor landing-fade">
            <div className="lp-monitor-screen">
              <div className="lp-monitor-bar" aria-hidden>
                <span className="lp-monitor-dots">
                  <i /><i /><i />
                </span>
                <span className="lp-monitor-url">
                  <Lock className="h-3 w-3" />
                  {t("landing.productName")}
                </span>
                <span className="lp-monitor-spacer" />
              </div>

              <div className="lp-monitor-inner">
                <div className="lp-section-head lp-section-head--center">
                  <p className="lp-eyebrow">{t("landing.supportEyebrow")}</p>
                  <h2>{t("landing.supportTitle")}</h2>
                  <p className="lp-section-lead">{t("landing.supportDesc")}</p>
                </div>

                <form className="lp-contact-form" onSubmit={onSubmit} noValidate>
            <div className="lp-contact-grid">
              <label className={`lp-field${fieldErrors.name ? " has-error" : ""}`}>
                <span>{t("landing.formName")}</span>
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value.slice(0, CONTACT_LIMITS.name.max))}
                  autoComplete="name"
                  maxLength={CONTACT_LIMITS.name.max}
                  minLength={CONTACT_LIMITS.name.min}
                  aria-invalid={!!fieldErrors.name}
                />
                <div className="lp-field-meta">
                  <span className="lp-field-hint">{t("landing.formHintName")}</span>
                  <span className="lp-field-count">
                    {t("landing.formCharCount", {
                      current: form.name.length,
                      max: CONTACT_LIMITS.name.max,
                    })}
                  </span>
                </div>
                {fieldErrors.name && <p className="lp-field-err">{fieldErrors.name}</p>}
              </label>
              <label className={`lp-field${fieldErrors.email ? " has-error" : ""}`}>
                <span>{t("landing.formEmail")}</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value.slice(0, CONTACT_LIMITS.email.max))}
                  autoComplete="email"
                  maxLength={CONTACT_LIMITS.email.max}
                  aria-invalid={!!fieldErrors.email}
                />
                <div className="lp-field-meta">
                  <span className="lp-field-hint">{t("landing.formHintEmail")}</span>
                </div>
                {fieldErrors.email && <p className="lp-field-err">{fieldErrors.email}</p>}
              </label>
              <label className={`lp-field${fieldErrors.phone ? " has-error" : ""}`}>
                <span>{t("landing.formPhone")}</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value.slice(0, 20))}
                  autoComplete="tel"
                  maxLength={20}
                  inputMode="tel"
                  aria-invalid={!!fieldErrors.phone}
                />
                <div className="lp-field-meta">
                  <span className="lp-field-hint">{t("landing.formHintPhone")}</span>
                </div>
                {fieldErrors.phone && <p className="lp-field-err">{fieldErrors.phone}</p>}
              </label>
              <label className={`lp-field${fieldErrors.schoolCode ? " has-error" : ""}`}>
                <span>{t("landing.formSchoolCode")}</span>
                <input
                  value={form.schoolCode}
                  onChange={(e) =>
                    setField("schoolCode", e.target.value.toUpperCase().slice(0, CONTACT_LIMITS.schoolCode.max))
                  }
                  className="is-mono"
                  maxLength={CONTACT_LIMITS.schoolCode.max}
                  aria-invalid={!!fieldErrors.schoolCode}
                />
                <div className="lp-field-meta">
                  <span className="lp-field-hint">{t("landing.formHintSchoolCode")}</span>
                  <span className="lp-field-count">
                    {t("landing.formCharCount", {
                      current: form.schoolCode.length,
                      max: CONTACT_LIMITS.schoolCode.max,
                    })}
                  </span>
                </div>
                {fieldErrors.schoolCode && <p className="lp-field-err">{fieldErrors.schoolCode}</p>}
              </label>
            </div>

            <label className={`lp-field${fieldErrors.subject ? " has-error" : ""}`}>
              <span>{t("landing.formSubject")}</span>
              <input
                value={form.subject}
                onChange={(e) => setField("subject", e.target.value.slice(0, CONTACT_LIMITS.subject.max))}
                maxLength={CONTACT_LIMITS.subject.max}
                minLength={CONTACT_LIMITS.subject.min}
                aria-invalid={!!fieldErrors.subject}
              />
              <div className="lp-field-meta">
                <span className="lp-field-hint">{t("landing.formHintSubject")}</span>
                <span className={`lp-field-count${form.subject.length < CONTACT_LIMITS.subject.min ? " is-low" : ""}`}>
                  {t("landing.formCharCount", {
                    current: form.subject.length,
                    max: CONTACT_LIMITS.subject.max,
                  })}
                </span>
              </div>
              {fieldErrors.subject && <p className="lp-field-err">{fieldErrors.subject}</p>}
            </label>

            <label className={`lp-field${fieldErrors.message ? " has-error" : ""}`}>
              <span>{t("landing.formMessage")}</span>
              <textarea
                rows={5}
                value={form.message}
                onChange={(e) => setField("message", e.target.value.slice(0, CONTACT_LIMITS.message.max))}
                maxLength={CONTACT_LIMITS.message.max}
                minLength={CONTACT_LIMITS.message.min}
                aria-invalid={!!fieldErrors.message}
              />
              <div className="lp-field-meta">
                <span className="lp-field-hint">{t("landing.formHintMessage")}</span>
                <span className={`lp-field-count${form.message.trim().length < CONTACT_LIMITS.message.min ? " is-low" : ""}`}>
                  {t("landing.formCharCount", {
                    current: form.message.length,
                    max: CONTACT_LIMITS.message.max,
                  })}
                </span>
              </div>
              {fieldErrors.message && <p className="lp-field-err">{fieldErrors.message}</p>}
            </label>

            {formOk && (
              <p className="lp-form-ok">
                <CheckCircle2 className="h-4 w-4" />
                {t("landing.formSuccess")}
              </p>
            )}
            {formErr && <p className="lp-form-err">{formErr}</p>}

            <button type="submit" className="lp-btn-submit" disabled={sending}>
              {sending ? (
                <>
                  <Spinner size="sm" />
                  {t("landing.formSending")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t("landing.formSubmit")}
                </>
              )}
            </button>
                </form>
              </div>
            </div>

            <div className="lp-monitor-stand" aria-hidden>
              <span className="lp-monitor-neck" />
              <span className="lp-monitor-base" />
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-shell">
          <div className="lp-footer-main">
            <div className="lp-footer-brand">
              <Link href="/" className="lp-logo lp-footer-logo">
                <span className="lp-brand-mark" aria-hidden>
                  <School className="h-5 w-5" />
                </span>
                <span className="lp-logo-text">
                  <span className="lp-display">{t("landing.productName")}</span>
                  <span>{t("landing.productTag")}</span>
                </span>
              </Link>
              <p className="lp-footer-blurb">{t("landing.footerBlurb")}</p>
              <div className="lp-footer-actions">
                <Link href="/login" className="lp-footer-btn-primary">
                  {t("landing.ctaPortal")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <a href="#contact" className="lp-footer-btn-ghost">
                  {t("landing.navContact")}
                </a>
              </div>
              <p className="lp-footer-secure">
                <Shield className="h-3.5 w-3.5" aria-hidden />
                {t("landing.footerSecureNote")}
              </p>
            </div>

            <nav className="lp-footer-col" aria-label={t("landing.footerExplore")}>
              <h3>{t("landing.footerExplore")}</h3>
              <a href="#modules">{t("landing.navModules")}</a>
              <a href="#portals">{t("landing.navPortals")}</a>
              <a href="#contact">{t("landing.navContact")}</a>
            </nav>

            <nav className="lp-footer-col" aria-label={t("landing.footerPortals")}>
              <h3>{t("landing.footerPortals")}</h3>
              {PORTAL_ROLES.map((p) => (
                <Link key={p.key} href={p.key === "ca" ? "/login?portal=ca" : "/login"}>
                  {t(`roles.${p.key}`)}
                </Link>
              ))}
            </nav>

            <div className="lp-footer-cal-wrap" aria-label={t("landing.calTitle")}>
              <FooterHolidayCalendar />
            </div>
          </div>

          <div className="lp-footer-bottom">
            <div className="lp-footer-legal">
              <p>{t("common.copyright")}</p>
              <span className="lp-footer-dot" aria-hidden />
              <p className="lp-managed-by">{t("landing.managedBy")}</p>
            </div>
            <a href="#top" className="lp-footer-top">
              {t("landing.footerBackTop")}
              <ArrowRight className="h-3.5 w-3.5 lp-footer-top-icon" />
            </a>
          </div>
        </div>
      </footer>

      <LandingExpertModal />
    </div>
  );
}
