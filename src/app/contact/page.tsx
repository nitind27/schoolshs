"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Send,
} from "lucide-react";
import { Spinner } from "@/components/ui/loader";
import {
  CONTACT_LIMITS,
  validateContactForm,
  type ContactField,
  type ContactFieldErrors,
} from "@/lib/contact-support";
import "./contact.css";

const APP_NAME = "Codeat Education";
const COMPANY = "Codeat Infotech";

const SUPPORT = {
  email: "support.codeateducation@gmail.com",
  phoneDisplay: "+91 8735995467",
  phoneTel: "+918735995467",
  whatsapp: "918735995467",
  addressLines: [
    "3rd floor, Anupam Amenity Centre",
    "Near Bus Depot, Hari Ichchha Industrial Society",
    "Udhna Udhyog Nagar, T-22",
    "Surat, Gujarat 394610",
  ],
  addressOneLine:
    "3rd floor, Anupam Amenity Centre, Near Bus Depot, Hari Ichchha Industrial Society, Udhna Udhyog Nagar, T-22, Surat, Gujarat 394610",
} as const;

const MAP_QUERY = encodeURIComponent(
  "Anupam Amenity Centre, Hari Ichchha Industrial Society, Udhna Udhyog Nagar, Surat, Gujarat 394610",
);
const MAP_EMBED = `https://maps.google.com/maps?q=${MAP_QUERY}&z=16&hl=en&output=embed`;
const MAP_OPEN = `https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`;
const MAP_DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${MAP_QUERY}`;

const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  schoolCode: "",
  subject: "",
  message: "",
};

export default function ContactSupportPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const setField = (key: keyof typeof INITIAL_FORM, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key as ContactField]) return e;
      const next = { ...e };
      delete next[key as ContactField];
      return next;
    });
  };

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* ignore */
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setOkMsg("");
    setErrMsg("");
    const result = validateContactForm(form);
    if (!result.ok) {
      setErrors(result.errors);
      setErrMsg(Object.values(result.errors)[0] || "Please fix the highlighted fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        setErrMsg(data.error || "Could not send message. Try again.");
        return;
      }
      setForm(INITIAL_FORM);
      setErrors({});
      setOkMsg("Message sent. Our support team will reply by email soon.");
    } catch {
      setErrMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-site">
      <header className="contact-topbar">
        <div className="contact-shell contact-topbar-inner">
          <Link href="/" className="contact-brand">
            <span className="contact-brand-mark" aria-hidden>
              <Building2 className="h-4 w-4" />
            </span>
            <span className="contact-brand-text">
              <strong>{APP_NAME}</strong>
              <em>Support</em>
            </span>
          </Link>
          <nav className="contact-top-links" aria-label="Quick links">
            <Link href="/privacy" className="contact-link-ghost">
              Privacy
            </Link>
            <Link href="/login" className="contact-link-solid">
              Login
            </Link>
          </nav>
        </div>
      </header>

      <main className="contact-main">
        {/* Hero — one composition */}
        <section className="contact-shell">
          <div className="contact-hero">
            <div className="contact-hero-inner">
              <p className="contact-brand-hero">{APP_NAME}</p>
              <h1>We’re here to help</h1>
              <p className="contact-lede">
                Staff panel, student portal, school setup, or Android app — reach our Surat
                support desk by call, WhatsApp, or email.
              </p>
              <div className="contact-hero-cta">
                <a href={`tel:${SUPPORT.phoneTel}`} className="contact-btn-primary">
                  <Phone className="h-4 w-4" />
                  <span className="contact-cta-full">Call {SUPPORT.phoneDisplay}</span>
                  <span className="contact-cta-short">Call now</span>
                </a>
                <a href={`mailto:${SUPPORT.email}`} className="contact-btn-secondary">
                  <Mail className="h-4 w-4" />
                  Email support
                </a>
              </div>
              <p className="contact-hours">
                <Clock3 className="h-3.5 w-3.5" />
                Mon–Sat · 10:00 AM – 6:00 PM IST
              </p>
            </div>
          </div>
        </section>

        {/* Channels */}
        <section className="contact-shell contact-section" aria-labelledby="reach-title">
          <div className="contact-section-head">
            <h2 id="reach-title">Reach us directly</h2>
            <p>Pick the fastest channel for your issue.</p>
          </div>

          <div className="contact-channels">
            <a href={`mailto:${SUPPORT.email}`} className="contact-channel">
              <span className="contact-channel-icon" aria-hidden>
                <Mail className="h-5 w-5" />
              </span>
              <span className="contact-channel-body">
                <span className="contact-channel-label">Email</span>
                <span className="contact-channel-value">{SUPPORT.email}</span>
                <span className="contact-channel-hint">Accounts, billing & technical help</span>
              </span>
            </a>

            <a href={`tel:${SUPPORT.phoneTel}`} className="contact-channel">
              <span className="contact-channel-icon is-phone" aria-hidden>
                <Phone className="h-5 w-5" />
              </span>
              <span className="contact-channel-body">
                <span className="contact-channel-label">Phone</span>
                <span className="contact-channel-value">{SUPPORT.phoneDisplay}</span>
                <span className="contact-channel-hint">Urgent school / login issues</span>
              </span>
            </a>

            <a
              href={`https://wa.me/${SUPPORT.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-channel"
            >
              <span className="contact-channel-icon is-wa" aria-hidden>
                <MessageCircle className="h-5 w-5" />
              </span>
              <span className="contact-channel-body">
                <span className="contact-channel-label">WhatsApp</span>
                <span className="contact-channel-value">{SUPPORT.phoneDisplay}</span>
                <span className="contact-channel-hint">Quick chat during support hours</span>
              </span>
            </a>
          </div>

          <div className="contact-copy-row">
            <button type="button" onClick={() => void copyText("email", SUPPORT.email)}>
              <Copy className="h-3.5 w-3.5" />
              {copied === "email" ? "Email copied" : "Copy email"}
            </button>
            <button type="button" onClick={() => void copyText("phone", SUPPORT.phoneDisplay)}>
              <Copy className="h-3.5 w-3.5" />
              {copied === "phone" ? "Number copied" : "Copy number"}
            </button>
          </div>
        </section>

        {/* Visit + map */}
        <section className="contact-shell contact-section" aria-labelledby="visit-title">
          <div className="contact-section-head">
            <h2 id="visit-title">Visit our office</h2>
            <p>Surat · Udhna Udhyog Nagar</p>
          </div>

          <div className="contact-visit">
            <div className="contact-visit-info">
              <div className="contact-visit-badge">
                <MapPin className="h-4 w-4" />
                Office
              </div>
              <address className="contact-address">
                {SUPPORT.addressLines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </address>
              <p className="contact-visit-company">
                {COMPANY}
                <span>{APP_NAME}</span>
              </p>
              <div className="contact-visit-actions">
                <a href={MAP_DIRECTIONS} target="_blank" rel="noopener noreferrer">
                  <Navigation className="h-4 w-4" />
                  Get directions
                </a>
                <a href={MAP_OPEN} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open in Maps
                </a>
                <button
                  type="button"
                  onClick={() => void copyText("address", SUPPORT.addressOneLine)}
                >
                  <Copy className="h-4 w-4" />
                  {copied === "address" ? "Copied" : "Copy address"}
                </button>
              </div>
            </div>

            <div className="contact-map">
              <iframe
                title="Codeat Education office — Anupam Amenity Centre, Surat"
                src={MAP_EMBED}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </section>

        {/* Message form */}
        <section className="contact-shell contact-section contact-section--form" aria-labelledby="form-title">
          <div className="contact-form-layout">
            <div className="contact-form-aside">
              <h2 id="form-title">Send a message</h2>
              <p>
                Prefer writing? Tell us your school code and whether you’re on the staff or
                student panel. Never include passwords.
              </p>
              <ul>
                <li>Include school code when relevant</li>
                <li>Mention staff / student / admin role</li>
                <li>For app issues, note Android version</li>
              </ul>
            </div>

            <form className="contact-form" onSubmit={onSubmit} noValidate>
              {okMsg && (
                <div className="contact-alert is-ok" role="status">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{okMsg}</span>
                </div>
              )}
              {errMsg && (
                <div className="contact-alert is-err" role="alert">
                  {errMsg}
                </div>
              )}

              <div className="contact-form-grid">
                <label className={errors.name ? "has-error" : undefined}>
                  <span>Full name *</span>
                  <input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value.slice(0, CONTACT_LIMITS.name.max))}
                    autoComplete="name"
                    maxLength={CONTACT_LIMITS.name.max}
                  />
                  {errors.name && <em>{errors.name}</em>}
                </label>
                <label className={errors.email ? "has-error" : undefined}>
                  <span>Email *</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value.slice(0, CONTACT_LIMITS.email.max))}
                    autoComplete="email"
                    maxLength={CONTACT_LIMITS.email.max}
                  />
                  {errors.email && <em>{errors.email}</em>}
                </label>
                <label className={errors.phone ? "has-error" : undefined}>
                  <span>Phone</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value.slice(0, 20))}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                  {errors.phone && <em>{errors.phone}</em>}
                </label>
                <label className={errors.schoolCode ? "has-error" : undefined}>
                  <span>School code</span>
                  <input
                    value={form.schoolCode}
                    onChange={(e) =>
                      setField(
                        "schoolCode",
                        e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 20),
                      )
                    }
                    placeholder="Optional"
                    autoComplete="off"
                  />
                  {errors.schoolCode && <em>{errors.schoolCode}</em>}
                </label>
                <label className={`span-2 ${errors.subject ? "has-error" : ""}`}>
                  <span>Subject *</span>
                  <input
                    value={form.subject}
                    onChange={(e) =>
                      setField("subject", e.target.value.slice(0, CONTACT_LIMITS.subject.max))
                    }
                    maxLength={CONTACT_LIMITS.subject.max}
                  />
                  {errors.subject && <em>{errors.subject}</em>}
                </label>
                <label className={`span-2 ${errors.message ? "has-error" : ""}`}>
                  <span>Message *</span>
                  <textarea
                    value={form.message}
                    onChange={(e) =>
                      setField("message", e.target.value.slice(0, CONTACT_LIMITS.message.max))
                    }
                    rows={5}
                    maxLength={CONTACT_LIMITS.message.max}
                  />
                  {errors.message && <em>{errors.message}</em>}
                </label>
              </div>

              <button type="submit" className="contact-submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size="sm" /> Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send message
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        <div className="contact-shell contact-end">
          <Link href="/" className="contact-back-home">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </main>

      <footer className="contact-footer">
        <div className="contact-shell contact-footer-inner">
          <p>
            © {new Date().getFullYear()} {COMPANY}
          </p>
          <div>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/login">Login</Link>
          </div>
        </div>
      </footer>

      {/* Mobile quick actions */}
      <nav className="contact-mobile-bar" aria-label="Quick contact">
        <a href={`tel:${SUPPORT.phoneTel}`}>
          <Phone className="h-4 w-4" />
          Call
        </a>
        <a href={`https://wa.me/${SUPPORT.whatsapp}`} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
        <a href={`mailto:${SUPPORT.email}`}>
          <Mail className="h-4 w-4" />
          Email
        </a>
      </nav>
    </div>
  );
}
