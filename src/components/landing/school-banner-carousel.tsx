"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BannerSlide {
  id: string;
  image: string;
  title: string;
  caption: string;
}

export function SchoolBannerCarousel({ slides, autoMs = 6000 }: { slides: BannerSlide[]; autoMs?: number }) {
  const [index, setIndex] = useState(0);
  const total = slides.length;

  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % total), autoMs);
    return () => clearInterval(id);
  }, [autoMs, total]);

  const go = (dir: number) => setIndex((i) => (i + dir + total) % total);

  if (total === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-md">
      <div className="relative aspect-[16/10] w-full sm:aspect-[16/9]">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-in-out",
              i === index ? "opacity-100 z-10" : "opacity-0 z-0"
            )}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="h-full w-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">{slide.caption}</p>
              <p className="mt-1 text-sm sm:text-base font-semibold leading-snug">{slide.title}</p>
            </div>
          </div>
        ))}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-lg bg-white/90 p-1.5 text-slate-700 shadow hover:bg-white"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-lg bg-white/90 p-1.5 text-slate-700 shadow hover:bg-white"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5 border-t border-slate-200 bg-white px-3 py-2.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 bg-blue-600" : "w-1.5 bg-slate-300 hover:bg-slate-400"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
