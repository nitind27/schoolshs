"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

const SLIDES = [
  { image: "/banner/3.png", kind: "identity" },
  { image: "/banner/2.png", kind: "campus" },
  { image: "/banner/1.png", kind: "assembly" },
] as const;

const AUTOPLAY_MS = 5500;

export function LandingHeroSlider() {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [hidden, setHidden] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const count = SLIDES.length;
  const paused = hovering || hidden;

  const go = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (paused || reduced) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, count, index]);

  useEffect(() => {
    const onHide = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  return (
    <div
      className="lp-banner"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className="lp-banner-viewport"
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          if ((event.target as HTMLElement).closest("button, a")) return;
          drag.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          const start = drag.current;
          drag.current = null;
          if (!start) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
          go(index + (dx < 0 ? 1 : -1));
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {SLIDES.map((slide, slideIndex) => {
          const active = slideIndex === index;
          return (
            <article
              key={slide.image}
              className={`lp-banner-slide lp-banner-slide--${slide.kind}${active ? " is-active" : ""}`}
              aria-hidden={!active}
            >
              <img
                src={slide.image}
                alt={slide.kind === "identity" ? t("landing.productName") : ""}
              />
            </article>
          );
        })}

        <div className="lp-banner-shade" />

        <div className="lp-shell lp-banner-copy">
          <div className="lp-banner-copy-inner">
            <p className="lp-banner-kicker">{t("landing.heroBadge")}</p>
            <h1>{t("landing.heroHeadline")}</h1>
            <p className="lp-banner-body">{t("landing.heroDesc")}</p>
            <div className="lp-show-cta">
              <Link href="/login" className="lp-show-btn">
                <span>{t("landing.ctaPortal")}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#modules" className="lp-show-btn lp-show-btn--ghost">
                {t("landing.ctaExplore")}
              </a>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="lp-banner-arrow lp-banner-arrow--prev"
          aria-label={t("common.previous")}
          onClick={() => go(index - 1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="lp-banner-arrow lp-banner-arrow--next"
          aria-label={t("common.next")}
          onClick={() => go(index + 1)}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="lp-banner-dots" role="tablist" aria-label={t("landing.productName")}>
          {SLIDES.map((slide, slideIndex) => (
            <button
              key={slide.image}
              type="button"
              role="tab"
              aria-selected={slideIndex === index}
              aria-label={`${slideIndex + 1}`}
              className={slideIndex === index ? "is-active" : ""}
              onClick={() => go(slideIndex)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
