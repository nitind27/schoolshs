"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
  Loader2,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useT } from "@/i18n/locale-provider";
import { LandingHeroCanvas } from "@/components/landing/landing-hero-canvas";
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

function useHeroTilt() {
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onMove = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      stage.style.setProperty("--tilt-x", `${(-y * 4.5).toFixed(2)}deg`);
      stage.style.setProperty("--tilt-y", `${(x * 6).toFixed(2)}deg`);
      stage.style.setProperty("--tilt-px", `${(x * 10).toFixed(1)}px`);
      stage.style.setProperty("--tilt-py", `${(y * 8).toFixed(1)}px`);
    };
    const onLeave = () => {
      stage.style.setProperty("--tilt-x", "0deg");
      stage.style.setProperty("--tilt-y", "0deg");
      stage.style.setProperty("--tilt-px", "0px");
      stage.style.setProperty("--tilt-py", "0px");
    };
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  return stageRef;
}

export function SchoolLandingPage() {
  const t = useT();
  const pageRef = useScrollReveal();
  const heroTiltRef = useHeroTilt();
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

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setFormErr("");
    setFormOk(false);
    try {
      const res = await fetch("/api/contact-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("landing.formError"));
      setFormOk(true);
      setForm({ name: "", email: "", phone: "", schoolCode: "", subject: "", message: "" });
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : t("landing.formError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div ref={pageRef} className="landing-site min-h-screen">
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

      {/* Hero — canvas 3D mesh + perspective stage */}
      <section className="lp-hero" ref={heroTiltRef}>
        <LandingHeroCanvas />
        <div className="lp-hero-veil" aria-hidden />

        <div className="lp-hero-stage" aria-hidden>
          <div className="lp-cube">
            <span /><span /><span /><span />
          </div>
        </div>

        <div className="lp-shell lp-hero-center landing-fade landing-fade--show">
          <div className="lp-hero-badge">
            <span className="lp-hero-dot" />
            {t("landing.heroBadge")}
          </div>
          <h1 className="lp-brand-title">{t("landing.productName")}</h1>
          <p className="lp-headline">{t("landing.heroHeadline")}</p>
          <p className="lp-lede">{t("landing.heroDesc")}</p>
          <div className="lp-cta-row">
            <Link href="/login" className="lp-btn-primary">
              <span>{t("landing.ctaPortal")}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#modules" className="lp-btn-soft">
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
              <li
                key={s.key}
                className={`lp-module-item landing-fade landing-fade--d${((i % 3) + 1) as 1 | 2 | 3}`}
              >
                <span className="lp-module-num">{String(i + 1).padStart(2, "0")}</span>
                <div className="lp-module-icon">
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <h3>{t(`landing.module_${s.key}`)}</h3>
                  <p>{t(`landing.module_${s.key}_desc`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

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
          <div className="landing-fade lp-section-head lp-section-head--center">
            <p className="lp-eyebrow">{t("landing.supportEyebrow")}</p>
            <h2>{t("landing.supportTitle")}</h2>
            <p className="lp-section-lead">{t("landing.supportDesc")}</p>
          </div>

          <form className="lp-contact-form landing-fade" onSubmit={onSubmit}>
            <div className="lp-contact-grid">
              <label className="lp-field">
                <span>{t("landing.formName")}</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  autoComplete="name"
                />
              </label>
              <label className="lp-field">
                <span>{t("landing.formEmail")}</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                />
              </label>
              <label className="lp-field">
                <span>{t("landing.formPhone")}</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  autoComplete="tel"
                />
              </label>
              <label className="lp-field">
                <span>{t("landing.formSchoolCode")}</span>
                <input
                  value={form.schoolCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, schoolCode: e.target.value.toUpperCase() }))
                  }
                  className="is-mono"
                />
              </label>
            </div>

            <label className="lp-field">
              <span>{t("landing.formSubject")}</span>
              <input
                required
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </label>

            <label className="lp-field">
              <span>{t("landing.formMessage")}</span>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
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
                  <Loader2 className="h-4 w-4 animate-spin" />
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
      </section>

      <footer className="lp-footer">
        <div className="lp-shell lp-footer-inner">
          <div className="lp-logo">
            <span className="lp-brand-mark lp-brand-mark--sm" aria-hidden>
              <School className="h-4 w-4" />
            </span>
            <span className="lp-logo-text">
              <span className="lp-display">{t("landing.productName")}</span>
              <span>{t("landing.productTag")}</span>
            </span>
          </div>
          <div className="lp-footer-meta">
            <p>{t("common.copyright")}</p>
            <p className="lp-managed-by">{t("landing.managedBy")}</p>
          </div>
          <Link href="/login" className="lp-btn-enter">
            {t("landing.ctaPortal")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
