"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  GraduationCap, ArrowRight, Award, BookOpen, Calculator, Users, IdCard,
  FileText, Shield, MapPin, Phone, Bot, ClipboardCheck, Building2,
  UserCheck, CheckCircle2, ChevronRight, Sparkles,
} from "lucide-react";
import { Hero3DSlider } from "@/components/landing/hero-3d-slider";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import { CERTIFICATE_SCHOOL } from "@/lib/certificates/config";
import "@/components/landing/landing.css";

const SLIDE_IMAGES = [
  "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1509062527246-079aea7b1097?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1571260899304-425eee4c780e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3d?auto=format&fit=crop&w=1200&q=80",
];

const GALLERY = [
  "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1517486808906-6ca8b3f0484e?auto=format&fit=crop&w=800&q=80",
];

const PORTAL_ROLES = [
  { key: "school_admin", icon: Building2, color: "bg-blue-600" },
  { key: "teacher", icon: BookOpen, color: "bg-emerald-600" },
  { key: "clerk", icon: UserCheck, color: "bg-amber-500" },
  { key: "student", icon: GraduationCap, color: "bg-sky-500" },
  { key: "ca", icon: Calculator, color: "bg-rose-600" },
] as const;

const SERVICES = [
  { icon: Award, key: "scholarship", accent: "border-l-amber-500" },
  { icon: BookOpen, key: "results", accent: "border-l-blue-600" },
  { icon: Calculator, key: "accounting", accent: "border-l-emerald-600" },
  { icon: ClipboardCheck, key: "admissions", accent: "border-l-violet-600" },
  { icon: Bot, key: "autoApply", accent: "border-l-cyan-600" },
  { icon: IdCard, key: "idCards", accent: "border-l-pink-600" },
  { icon: FileText, key: "certificates", accent: "border-l-slate-600" },
  { icon: Users, key: "students", accent: "border-l-sky-600" },
] as const;

function useScrollReveal() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll(".landing-fade:not(.landing-fade--show)");
    const show = (el: Element) => el.classList.add("landing-fade--show");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) show(e.target); }),
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) show(el);
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

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const slides = useMemo(
    () =>
      SLIDE_IMAGES.map((image, i) => ({
        id: `s-${i}`,
        image,
        title: t(`landing.slide${i + 1}Title`),
        subtitle: t(`landing.slide${i + 1}Sub`),
        tag: t(`landing.slide${i + 1}Tag`),
      })),
    [t]
  );

  const tickerItems = [t("landing.marquee1"), t("landing.marquee2"), t("landing.marquee3"), t("landing.marquee4")];

  const stats = [
    { val: "500+", label: t("loginHub.statStudents"), color: "from-blue-600 to-blue-700" },
    { val: "6", label: t("loginHub.statPortals"), color: "from-indigo-600 to-indigo-700" },
    { val: "SSC/HSC", label: t("landing.statBoard"), color: "from-violet-600 to-violet-700" },
    { val: CERTIFICATE_SCHOOL.diseCode, label: "DISE", color: "from-slate-700 to-slate-800" },
  ];

  return (
    <div ref={pageRef} className="landing-site min-h-screen bg-[#f0f4fa] text-slate-900">
      {/* Header — always solid white so text stays readable over any section */}
      <header
        className={`sticky top-0 z-50 border-b border-slate-200 bg-white transition-shadow duration-300 ${
          scrolled ? "shadow-md" : "shadow-sm"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                {CERTIFICATE_SCHOOL.nameGu}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {CERTIFICATE_SCHOOL.nameEnAlt}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            {["#about", "#services", "#gallery", "#portals", "#contact"].map((href, i) => (
              <a key={href} href={href} className="transition-colors hover:text-blue-700">
                {[t("landing.navAbout"), t("landing.navModules"), t("landing.navGallery"), t("landing.navPortals"), t("landing.navContact")][i]}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher variant="compact" />
            <Link href="/login" className="hidden sm:block">
              <Button variant="outline" size="sm">
                {t("landing.ctaLogin")}
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">
                {t("landing.ctaPortal")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — blue panel like login hub */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0c1e4a] via-[#1e3a8a] to-[#2563eb] text-white">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-12 lg:pb-20 lg:pt-10">
          <div className="landing-fade landing-fade--show">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              {t("landing.heroBadge")}
            </div>

            <h1 className="text-2xl font-bold leading-tight sm:text-3xl lg:text-[2.1rem]">
              {CERTIFICATE_SCHOOL.nameGu}
            </h1>
            <p className="mt-2 text-sm font-medium text-blue-100">{CERTIFICATE_SCHOOL.nameEn}</p>
            <p className="mt-2 flex items-start gap-1.5 text-sm text-blue-200/90">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              {CERTIFICATE_SCHOOL.addressGu}
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-blue-100/90">{t("landing.heroDesc")}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login">
                <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 shadow-lg">
                  {t("landing.ctaPortal")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#services">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 bg-transparent">
                  {t("landing.ctaExplore")}
                </Button>
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {[t("landing.trustGseb"), t("landing.trustDg"), `DISE ${CERTIFICATE_SCHOOL.diseCode}`].map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1.5 rounded-md bg-white/10 border border-white/15 px-2.5 py-1 text-[11px] font-medium text-blue-50">
                  <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="landing-fade landing-fade--show landing-fade--d1">
            <Hero3DSlider slides={slides} />
          </div>
        </div>

        {/* Ticker */}
        <div className="relative border-t border-white/15 bg-white/5 backdrop-blur-sm py-2.5">
          <div className="landing-ticker">
            <div className="landing-ticker-track">
              {[...tickerItems, ...tickerItems].map((item, i) => (
                <span key={`${item}-${i}`} className="landing-ticker-item text-blue-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats — overlap hero */}
      <section className="relative z-10 -mt-8 px-4 sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`landing-tilt landing-fade rounded-xl bg-gradient-to-br ${s.color} px-4 py-5 text-center text-white shadow-lg landing-fade--d${Math.min(i + 1, 3) as 1 | 2 | 3}`}
            >
              <p className="text-2xl font-bold">{s.val}</p>
              <p className="mt-0.5 text-xs font-medium text-white/80">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="landing-fade">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{t("landing.aboutEyebrow")}</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{t("landing.aboutTitle")}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{t("landing.aboutDesc")}</p>
              <ul className="mt-6 space-y-3">
                {[t("landing.aboutPoint1"), t("landing.aboutPoint2"), t("landing.aboutPoint3")].map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>

            <div className="landing-tilt landing-fade landing-fade--d2 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                {t("landing.schoolInfoTitle")}
              </h3>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                {[
                  [t("landing.schoolSection"), CERTIFICATE_SCHOOL.section],
                  [t("landing.schoolMedium"), CERTIFICATE_SCHOOL.medium],
                  ["SSC Index", CERTIFICATE_SCHOOL.sscIndex],
                  ["HSC Index", CERTIFICATE_SCHOOL.hscIndex],
                  [t("landing.schoolPhone"), CERTIFICATE_SCHOOL.phone],
                  ["DISE", CERTIFICATE_SCHOOL.diseCode],
                ].map(([label, val]) => (
                  <div key={String(label)} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                    <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
                    <dd className="mt-0.5 font-semibold text-slate-800">{val}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="border-y border-slate-200 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="landing-fade mb-10 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{t("landing.modulesEyebrow")}</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{t("landing.modulesTitle")}</h2>
            <p className="mt-2 text-sm text-slate-600">{t("landing.modulesDesc")}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s, i) => (
              <div
                key={s.key}
                className={`landing-tilt landing-fade border-l-4 ${s.accent} rounded-xl border border-slate-200 bg-white p-4 shadow-sm landing-fade--d${((i % 3) + 1) as 1 | 2 | 3}`}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">{t(`landing.module_${s.key}`)}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{t(`landing.module_${s.key}_desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery 3D */}
      <section id="gallery" className="overflow-hidden bg-gradient-to-b from-slate-100 to-[#f0f4fa] py-14">
        <div className="landing-fade mx-auto mb-8 max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{t("landing.galleryEyebrow")}</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{t("landing.galleryTitle")}</h2>
        </div>
        <div className="landing-gallery-3d px-4">
          {[...GALLERY, ...GALLERY].map((src, i) => (
            <div key={`${src}-${i}`} className="landing-gallery-card">
              <div className="landing-gallery-img" style={{ backgroundImage: `url(${src})` }} />
            </div>
          ))}
        </div>
      </section>

      {/* Portals */}
      <section id="portals" className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="landing-fade mb-10 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{t("landing.portalEyebrow")}</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{t("landing.portalTitle")}</h2>
            <p className="mt-2 text-sm text-slate-600">{t("landing.portalDesc")}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PORTAL_ROLES.map((p, i) => (
              <Link
                key={p.key}
                href="/login"
                className={`landing-tilt landing-fade group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300 landing-fade--d${((i % 3) + 1) as 1 | 2 | 3}`}
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${p.color}`}>
                  <p.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{t(`roles.${p.key}`)}</p>
                  <p className="text-xs text-slate-500">{t("landing.portalLoginHint")}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>

          <div className="landing-fade mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p><span className="font-semibold">{t("landing.noticeLabel")}:</span> {t("landing.noticeText")}</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200 bg-white py-12">
        <div className="landing-fade mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-10 text-center text-white shadow-xl sm:flex-row sm:px-10 sm:text-left">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">{t("landing.ctaTitle")}</h2>
            <p className="mt-2 text-sm text-blue-100">{t("landing.ctaDesc")}</p>
          </div>
          <Link href="/login" className="shrink-0">
            <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 shadow-lg">
              {t("landing.ctaPortal")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-slate-900 text-slate-300">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-blue-400" />
                <p className="font-bold text-white">{CERTIFICATE_SCHOOL.nameGu}</p>
              </div>
              <p className="mt-2 text-sm text-slate-400">{CERTIFICATE_SCHOOL.nameEn}</p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{CERTIFICATE_SCHOOL.address}</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" />{CERTIFICATE_SCHOOL.phone}</p>
            </div>
            <div className="md:text-right">
              <Link href="/login">
                <Button variant="outline" size="sm" className="border-slate-600 bg-transparent text-white hover:bg-slate-800">
                  {t("landing.ctaLogin")}
                </Button>
              </Link>
            </div>
          </div>
          <p className="mt-8 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">{t("common.copyright")}</p>
        </div>
      </footer>
    </div>
  );
}
