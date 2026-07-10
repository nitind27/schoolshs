"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface HeroSlide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  tag: string;
}

function slideClass(offset: number, active: boolean) {
  if (active) return "landing-3d-slide landing-3d-slide--active";
  if (offset === -1) return "landing-3d-slide landing-3d-slide--prev";
  if (offset === 1) return "landing-3d-slide landing-3d-slide--next";
  return "landing-3d-slide landing-3d-slide--far";
}

export function Hero3DSlider({ slides, autoMs = 5500 }: { slides: HeroSlide[]; autoMs?: number }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const total = slides.length;

  const go = useCallback(
    (dir: number) => setIndex((i) => (i + dir + total) % total),
    [total]
  );

  useEffect(() => {
    if (paused || total <= 1) return;
    const id = setInterval(() => go(1), autoMs);
    return () => clearInterval(id);
  }, [paused, autoMs, go, total]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onMove = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      stage.style.setProperty("--tilt-x", `${y * -8}deg`);
      stage.style.setProperty("--tilt-y", `${x * 10}deg`);
    };
    const onLeave = () => {
      stage.style.setProperty("--tilt-x", "0deg");
      stage.style.setProperty("--tilt-y", "0deg");
    };
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const offsetFor = (i: number) => {
    let d = i - index;
    if (d > total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d;
  };

  if (total === 0) return null;

  return (
    <div
      className="landing-3d-wrap"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div ref={stageRef} className="landing-3d-stage">
        <div className="landing-3d-ring">
          {slides.map((slide, i) => {
            const offset = offsetFor(i);
            if (Math.abs(offset) > 1) return null;
            return (
              <button
                key={slide.id}
                type="button"
                className={slideClass(offset, offset === 0)}
                onClick={() => offset !== 0 && setIndex(i)}
                aria-label={slide.title}
              >
                <div className="landing-3d-frame">
                  <div className="landing-3d-img" style={{ backgroundImage: `url(${slide.image})` }} />
                  <div className="landing-3d-overlay" />
                  <div className="landing-3d-meta">
                    <span className="landing-3d-tag">{slide.tag}</span>
                    <p className="landing-3d-title">{slide.title}</p>
                    <p className="landing-3d-sub">{slide.subtitle}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {total > 1 && (
        <div className="landing-3d-controls">
          <button type="button" className="landing-3d-btn" onClick={() => go(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="landing-3d-dots">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`landing-3d-dot ${i === index ? "landing-3d-dot--on" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
          <button type="button" className="landing-3d-btn" onClick={() => go(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
