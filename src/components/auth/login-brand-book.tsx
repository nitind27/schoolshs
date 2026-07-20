"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Award,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  KeyRound,
  MapPin,
  Shield,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";

type SchoolBranding = {
  code: string;
  name: string;
  address?: string | null;
  udiseCode?: string | null;
  district?: string | null;
};

type BookPage = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  items: { icon: LucideIcon; label: string; hint?: string }[];
  footer: string;
};

const FLIP_MS = 700;
const AUTO_MS = 4200;

export function LoginBrandBook({
  branding,
  headline,
  metaLine,
  mode = "default",
}: {
  branding: SchoolBranding | null;
  headline: string;
  metaLine: string;
  mode?: "default" | "ca";
}) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
  const busyRef = useRef(false);
  const indexRef = useRef(0);
  const pausedRef = useRef(false);
  const isCa = mode === "ca";

  const pages: BookPage[] = isCa
    ? [
        {
          id: "welcome",
          eyebrow: t("login.caLoginBadge"),
          title: t("caNav.title"),
          body: t("login.caLoginDesc"),
          items: [
            { icon: Shield, label: t("caPortal.verifyVouchersTitle"), hint: "01" },
            { icon: BookOpen, label: t("caNav.trialBalance"), hint: "02" },
            { icon: Check, label: t("caPortal.auditSession"), hint: "03" },
          ],
          footer: t("caNav.subtitle"),
        },
        {
          id: "schools",
          eyebrow: t("caPortal.assignedSchools"),
          title: t("login.caLoginHero"),
          body: t("caPortal.assignedSchoolsDesc"),
          items: [
            { icon: Users, label: t("caPortal.switchSchool"), hint: "Multi" },
            { icon: Shield, label: t("login.secureLogin"), hint: "RBAC" },
            { icon: Sparkles, label: t("loginHub.digitalGujarat"), hint: "Portal" },
          ],
          footer: t("landing.managedBy"),
        },
        {
          id: "security",
          eyebrow: t("login.secureLogin"),
          title: t("caPortal.voucherVerification"),
          body: t("caPortal.voucherVerificationDesc"),
          items: [
            { icon: Shield, label: t("login.feature1"), hint: "01" },
            { icon: Database, label: t("login.feature2"), hint: "02" },
            { icon: KeyRound, label: t("login.feature3"), hint: "03" },
          ],
          footer: t("caNav.subtitle"),
        },
        {
          id: "signoff",
          eyebrow: t("caPortal.auditSession"),
          title: t("caPortal.auditSessionTitle"),
          body: t("caPortal.auditSessionSubtitle"),
          items: [
            { icon: Check, label: t("caPortal.completeSignOff"), hint: "FY" },
            { icon: Shield, label: t("caPortal.auditChecklist"), hint: "ICAI" },
            { icon: Award, label: t("caNav.financialReports"), hint: "Reports" },
          ],
          footer: t("landing.managedBy"),
        },
      ]
    : [
    {
      id: "welcome",
      eyebrow: branding ? t("login.schoolVerified") : t("loginHub.trustedPlatform"),
      title: headline,
      body: branding
        ? [metaLine, branding.address].filter(Boolean).join(" · ") || t("loginHub.heroDesc")
        : t("loginHub.heroDesc"),
      items: branding
        ? [
            ...(branding.district
              ? [{ icon: MapPin, label: branding.district, hint: "District" }]
              : []),
            ...(branding.udiseCode
              ? [{ icon: Check, label: branding.udiseCode, hint: "UDISE" }]
              : []),
            { icon: Shield, label: branding.code, hint: "School code" },
          ].slice(0, 3)
        : [
            { icon: Sparkles, label: t("loginHub.digitalGujarat"), hint: "Platform" },
            { icon: Shield, label: t("login.secureLogin"), hint: "Access" },
            { icon: Users, label: t("loginHub.statPortals"), hint: "12+ roles" },
          ],
      footer: branding
        ? `${branding.name} · ${branding.code}`
        : t("landing.productTag"),
    },
    {
      id: "modules",
      eyebrow: t("landing.navModules"),
      title: t("loginHub.badge"),
      body: t("loginHub.heroDesc"),
      items: [
        { icon: Award, label: t("loginHub.moduleScholarship"), hint: "01" },
        { icon: BookOpen, label: t("loginHub.moduleResults"), hint: "02" },
        { icon: Wallet, label: t("loginHub.moduleAccounting"), hint: "03" },
      ],
      footer: t("loginHub.footerNote"),
    },
    {
      id: "security",
      eyebrow: t("login.secureLogin"),
      title: t("loginHub.statSecure"),
      body: t("login.subtitle"),
      items: [
        { icon: Shield, label: t("login.feature1"), hint: "01" },
        { icon: Database, label: t("login.feature2"), hint: "02" },
        { icon: KeyRound, label: t("login.feature3"), hint: "03" },
      ],
      footer: t("loginHub.gsebReady"),
    },
    {
      id: "trust",
      eyebrow: t("loginHub.digitalGujarat"),
      title: t("landing.productName"),
      body: t("loginHub.selectRole"),
      items: [
        { icon: Check, label: t("loginHub.gsebReady"), hint: "Board" },
        { icon: Shield, label: t("loginHub.statSecure"), hint: "100%" },
        { icon: Users, label: t("loginHub.statPortals"), hint: "12+" },
      ],
      footer: t("landing.managedBy"),
    },
  ];

  const total = pages.length;
  const page = pages[index];

  const turnTo = useCallback((next: number) => {
    if (busyRef.current) return;
    const target = ((next % total) + total) % total;
    if (target === indexRef.current) return;

    busyRef.current = true;
    setPhase("out");

    window.setTimeout(() => {
      indexRef.current = target;
      setIndex(target);
      setPhase("in");
      window.setTimeout(() => {
        setPhase("idle");
        busyRef.current = false;
      }, FLIP_MS * 0.55);
    }, FLIP_MS * 0.45);
  }, [total]);

  const goNext = useCallback(() => {
    turnTo(indexRef.current + 1);
  }, [turnTo]);

  const goPrev = useCallback(() => {
    turnTo(indexRef.current - 1);
  }, [turnTo]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (pausedRef.current || busyRef.current) return;
      turnTo(indexRef.current + 1);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [turnTo]);

  return (
    <div
      className="auth-book"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div className="auth-book-scene">
        <div className="auth-book-shell">
          <div className="auth-book-cover" aria-hidden />
          <div className="auth-book-spine" aria-hidden />
          <div className="auth-book-edge" aria-hidden />

          <div className={`auth-book-leaf is-${phase}`}>
            <article className="auth-book-face">
              <header className="auth-book-face-top">
                <span className="auth-book-eyebrow">{page.eyebrow}</span>
                <span className="auth-book-page-num">
                  {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </span>
              </header>

              <h2 className="auth-book-title auth-portal-headline-gu">{page.title}</h2>
              <p className="auth-book-body">{page.body}</p>

              <ul className="auth-book-list">
                {page.items.map((item) => (
                  <li key={`${page.id}-${item.label}`}>
                    <span className="auth-book-list-icon">
                      <item.icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <span className="auth-book-list-text">
                      <strong>{item.label}</strong>
                      {item.hint ? <em>{item.hint}</em> : null}
                    </span>
                  </li>
                ))}
              </ul>

              <footer className="auth-book-face-foot">{page.footer}</footer>
            </article>
          </div>
        </div>
      </div>

      <div className="auth-book-controls">
        <button type="button" className="auth-book-nav" onClick={goPrev} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
        </button>

        <div className="auth-book-dots" role="tablist" aria-label="Book pages">
          {pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={`auth-book-dot ${i === index ? "is-active" : ""}`}
              onClick={() => turnTo(i)}
            />
          ))}
        </div>

        <button type="button" className="auth-book-nav" onClick={goNext} aria-label="Next page">
          <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>

      <div className="auth-book-progress" aria-hidden>
        <span key={index} className="auth-book-progress-bar" />
      </div>
    </div>
  );
}
