"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  X,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";
import "./feature-tour.css";

type Placement = "top" | "bottom" | "left" | "right" | "center";
type TourPhase = "Core" | "Scholarship" | "Staff" | "Admin";

type TourStep = {
  id: string;
  selector?: string;
  href?: string;
  titleKey: string;
  descKey: string;
  placement?: Placement;
  pulse?: boolean;
  isSearchStep?: boolean;
  isStudentOpenStep?: boolean;
  opensMegaMenu?: boolean;
  phase?: TourPhase;
};

const PAGE_MAIN =
  '[data-ft-anchor="main"], .page-hero, .sa-hero, .sa-page, .ops-dash';

const TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    selector: ".ops-dash,.dashboard-page",
    titleKey: "featureTour.stepDashboardTitle",
    descKey: "featureTour.stepDashboardDesc",
    placement: "center",
    phase: "Core",
  },
  {
    id: "pulse",
    href: "/dashboard",
    selector: ".ops-pulse",
    titleKey: "featureTour.stepPulseTitle",
    descKey: "featureTour.stepPulseDesc",
    placement: "bottom",
    pulse: true,
    phase: "Core",
  },
  {
    id: "search",
    href: "/dashboard",
    selector: ".tn-gr-search",
    titleKey: "featureTour.stepSearchTitle",
    descKey: "featureTour.stepSearchDesc",
    placement: "bottom",
    pulse: true,
    isSearchStep: true,
    phase: "Core",
  },
  {
    id: "student-profile",
    titleKey: "featureTour.stepStudentProfileTitle",
    descKey: "featureTour.stepStudentProfileDesc",
    selector: ".sa-hero,.sa-page",
    placement: "center",
    isStudentOpenStep: true,
    phase: "Core",
  },
  {
    id: "command-center",
    href: "/dashboard",
    selector: ".ops-command",
    titleKey: "featureTour.stepCommandTitle",
    descKey: "featureTour.stepCommandDesc",
    placement: "bottom",
    phase: "Core",
  },
  {
    id: "insights",
    href: "/dashboard",
    selector: ".ops-insights",
    titleKey: "featureTour.stepInsightsTitle",
    descKey: "featureTour.stepInsightsDesc",
    placement: "top",
    phase: "Core",
  },
  {
    id: "filters",
    href: "/dashboard",
    selector: ".ops-control",
    titleKey: "featureTour.stepFiltersTitle",
    descKey: "featureTour.stepFiltersDesc",
    placement: "bottom",
    pulse: true,
    phase: "Core",
  },
  {
    id: "mega-menu",
    href: "/dashboard",
    selector: ".tn-mega-panel, .tn-mega-mobile .tn-mega-body, .tn-mega-trigger",
    titleKey: "featureTour.stepMegaMenuTitle",
    descKey: "featureTour.stepMegaMenuDesc",
    placement: "bottom",
    pulse: true,
    opensMegaMenu: true,
    phase: "Core",
  },
  {
    id: "setup-flow",
    href: "/dashboard",
    selector: ".ops-flow",
    titleKey: "featureTour.stepSetupFlowTitle",
    descKey: "featureTour.stepSetupFlowDesc",
    placement: "top",
    phase: "Core",
  },
  {
    id: "students",
    href: "/students",
    selector: PAGE_MAIN,
    titleKey: "featureTour.stepStudentsTitle",
    descKey: "featureTour.stepStudentsDesc",
    placement: "center",
    phase: "Core",
  },
  {
    id: "staff",
    href: "/staff",
    selector: PAGE_MAIN,
    titleKey: "featureTour.stepStaffTitle",
    descKey: "featureTour.stepStaffDesc",
    placement: "center",
    phase: "Staff",
  },
  {
    id: "import",
    href: "/import",
    selector: PAGE_MAIN,
    titleKey: "featureTour.stepImportTitle",
    descKey: "featureTour.stepImportDesc",
    placement: "center",
    phase: "Scholarship",
  },
  {
    id: "bulk-submit",
    href: "/bulk-submit",
    selector: PAGE_MAIN,
    titleKey: "featureTour.stepBulkSubmitTitle",
    descKey: "featureTour.stepBulkSubmitDesc",
    placement: "center",
    phase: "Scholarship",
  },
  {
    id: "auto-apply",
    href: "/auto-apply",
    selector: PAGE_MAIN,
    titleKey: "featureTour.stepAutoApplyTitle",
    descKey: "featureTour.stepAutoApplyDesc",
    placement: "center",
    phase: "Scholarship",
  },
  {
    id: "accounting",
    href: "/accounting",
    selector: PAGE_MAIN,
    titleKey: "featureTour.stepAccountingTitle",
    descKey: "featureTour.stepAccountingDesc",
    placement: "center",
    phase: "Admin",
  },
  {
    id: "certificates",
    href: "/certificates",
    selector: PAGE_MAIN,
    titleKey: "featureTour.stepCertificatesTitle",
    descKey: "featureTour.stepCertificatesDesc",
    placement: "center",
    phase: "Admin",
  },
  {
    id: "help",
    href: "/dashboard",
    selector: ".help-side-tab",
    titleKey: "featureTour.stepHelpTitle",
    descKey: "featureTour.stepHelpDesc",
    placement: "left",
    pulse: true,
    phase: "Core",
  },
];

export const DEMO_SEARCH_EVENT = "ft:demo-search";
export const DEMO_SEARCH_CLEAR_EVENT = "ft:demo-search-clear";
export const FT_MEGA_OPEN_EVENT = "ft:mega-open";
export const FT_MEGA_CLOSE_EVENT = "ft:mega-close";

const STEP_MS = 4500;
const PAD = 10;
const MEASURE_RETRIES = 16;
const MEASURE_INTERVAL_MS = 280;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function vpRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function findTourTarget(selector?: string): Element | null {
  if (!selector) return null;
  for (const part of selector.split(",").map((s) => s.trim()).filter(Boolean)) {
    const el = document.querySelector(part);
    if (el) return el;
  }
  return null;
}

function tourPathReady(
  pathname: string,
  step: TourStep,
  demoStudentId: string,
): boolean {
  if (step.isStudentOpenStep) {
    return demoStudentId
      ? pathname.includes(`/students/${demoStudentId}/`)
      : false;
  }
  if (!step.href) return true;
  if (step.href === "/dashboard") return pathname === "/dashboard";
  return pathname === step.href || pathname.startsWith(`${step.href}/`);
}

function tooltipPos(
  tgt: Rect,
  prefer: Placement,
  ttW: number,
  ttH: number,
  vw: number,
  vh: number,
): { top: number; left: number; arrow: Placement | "none" } {
  if (prefer === "center") {
    return {
      top: vh / 2 - ttH / 2,
      left: clamp(vw / 2 - ttW / 2, 8, vw - ttW - 8),
      arrow: "none",
    };
  }
  const G = 16;
  for (const p of [...new Set<Placement>([prefer, "bottom", "top", "right", "left"])]) {
    let t = 0;
    let l = 0;
    if (p === "bottom") {
      t = tgt.top + tgt.height + PAD + G;
      l = tgt.left + tgt.width / 2 - ttW / 2;
    } else if (p === "top") {
      t = tgt.top - PAD - G - ttH;
      l = tgt.left + tgt.width / 2 - ttW / 2;
    } else if (p === "right") {
      t = tgt.top + tgt.height / 2 - ttH / 2;
      l = tgt.left + tgt.width + PAD + G;
    } else {
      t = tgt.top + tgt.height / 2 - ttH / 2;
      l = tgt.left - PAD - G - ttW;
    }
    l = clamp(l, 8, vw - ttW - 8);
    t = clamp(t, 8, vh - ttH - 8);
    if (t >= 4 && t + ttH <= vh - 4 && l >= 4 && l + ttW <= vw - 4) {
      return { top: t, left: l, arrow: p };
    }
  }
  return {
    top: vh / 2 - ttH / 2,
    left: clamp(vw / 2 - ttW / 2, 8, vw - ttW - 8),
    arrow: "none",
  };
}

function phaseLabelKey(phase?: TourPhase) {
  if (!phase) return null;
  const map: Record<TourPhase, string> = {
    Core: "featureTour.phaseCore",
    Scholarship: "featureTour.phaseScholarship",
    Staff: "featureTour.phaseStaff",
    Admin: "featureTour.phaseAdmin",
  };
  return map[phase];
}

export function FeatureTourTrigger() {
  const [active, setActive] = useState(false);
  const t = useT();
  return (
    <>
      <button
        type="button"
        className="ft-trigger"
        onClick={() => setActive(true)}
        title={t("featureTour.triggerTip")}
        aria-label={t("featureTour.triggerLabel")}
      >
        <Sparkles className="ft-trigger-icon h-3.5 w-3.5" aria-hidden />
        <span className="ft-trigger-text">{t("featureTour.triggerLabel")}</span>
      </button>
      {active && <FeatureTour onClose={() => setActive(false)} />}
    </>
  );
}

function FeatureTour({ onClose }: { onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();

  const [demoGr, setDemoGr] = useState("");
  const [demoStudentId, setDemoStudentId] = useState("");
  const [demoStudentName, setDemoStudentName] = useState("");

  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    arrow: Placement | "none";
  } | null>(null);
  const [visible, setVisible] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const ttRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measTm = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTm = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = TOUR_STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === TOUR_STEPS.length - 1;
  const pct = Math.round(((stepIdx + 1) / TOUR_STEPS.length) * 100);
  const pathReady = tourPathReady(pathname, step, demoStudentId);
  const phaseKey = phaseLabelKey(step.phase);

  useEffect(() => {
    document.body.classList.add("ft-tour-active");
    return () => {
      document.body.classList.remove("ft-tour-active");
      window.dispatchEvent(new CustomEvent(FT_MEGA_CLOSE_EVENT));
      window.dispatchEvent(new CustomEvent(DEMO_SEARCH_CLEAR_EVENT));
    };
  }, []);

  useEffect(() => {
    fetch("/api/students?limit=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const s = d?.students?.[0];
        if (!s) return;
        setDemoGr(String(s.grNumber ?? ""));
        setDemoStudentId(String(s.id ?? ""));
        setDemoStudentName(
          [s.firstName, s.surname].filter(Boolean).join(" ").trim(),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step.isStudentOpenStep) {
      if (demoStudentId && !pathname.includes(`/students/${demoStudentId}/`)) {
        router.push(`/students/${demoStudentId}/analysis`);
      }
      return;
    }
    if (step.href && !tourPathReady(pathname, step, demoStudentId)) {
      router.push(step.href);
    }
  }, [step.id, step.href, step.isStudentOpenStep, demoStudentId, pathname, router]);

  useEffect(() => {
    if (step.opensMegaMenu) {
      window.dispatchEvent(new CustomEvent(FT_MEGA_OPEN_EVENT));
    } else {
      window.dispatchEvent(new CustomEvent(FT_MEGA_CLOSE_EVENT));
    }
    document.body.classList.toggle("ft-tour-mega", !!step.opensMegaMenu);
    return () => document.body.classList.remove("ft-tour-mega");
  }, [step.id, step.opensMegaMenu]);

  useEffect(() => {
    if (!step.isSearchStep || !demoGr) {
      window.dispatchEvent(new CustomEvent(DEMO_SEARCH_CLEAR_EVENT));
      return;
    }
    let i = 0;
    let cur = "";
    const chars = demoGr.split("");
    const next = () => {
      if (i >= chars.length) return;
      cur += chars[i++];
      window.dispatchEvent(
        new CustomEvent(DEMO_SEARCH_EVENT, { detail: { value: cur } }),
      );
      if (i < chars.length) setTimeout(next, 130);
    };
    const tm = setTimeout(next, 800);
    return () => {
      clearTimeout(tm);
      window.dispatchEvent(new CustomEvent(DEMO_SEARCH_CLEAR_EVENT));
    };
  }, [step.isSearchStep, demoGr, stepIdx]);

  const measure = useCallback(() => {
    if (measTm.current) clearTimeout(measTm.current);
    if (pollTm.current) clearInterval(pollTm.current);

    setVisible(false);
    setWaiting(true);
    setRect(null);

    if (step.isStudentOpenStep && !demoStudentId) {
      setWaiting(true);
      setVisible(true);
      return;
    }
    if (!pathReady) {
      setWaiting(true);
      setVisible(true);
      return;
    }

    let attempt = 0;
    const tryMeasure = () => {
      const el = findTourTarget(step.selector);
      if (!el) {
        attempt += 1;
        if (attempt >= MEASURE_RETRIES) {
          setRect(null);
          setWaiting(false);
          setVisible(true);
          return;
        }
        measTm.current = setTimeout(tryMeasure, MEASURE_INTERVAL_MS);
        return;
      }

      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      measTm.current = setTimeout(() => {
        const target = findTourTarget(step.selector);
        if (target) setRect(vpRect(target));
        setWaiting(false);
        setVisible(true);
      }, 240);
    };

    measTm.current = setTimeout(tryMeasure, step.href || step.isStudentOpenStep ? 420 : 280);
  }, [step, demoStudentId, pathReady]);

  useEffect(() => {
    measure();
    return () => {
      if (measTm.current) clearTimeout(measTm.current);
      if (pollTm.current) clearInterval(pollTm.current);
    };
  }, [measure, pathname, stepIdx, pathReady]);

  useEffect(() => {
    const repo = () => {
      if (!step.selector || waiting) return;
      const el = findTourTarget(step.selector);
      if (el) setRect(vpRect(el));
    };
    window.addEventListener("scroll", repo, { passive: true });
    window.addEventListener("resize", repo, { passive: true });
    return () => {
      window.removeEventListener("scroll", repo);
      window.removeEventListener("resize", repo);
    };
  }, [step.selector, waiting]);

  useLayoutEffect(() => {
    if (!visible || !ttRef.current) return;
    const W = ttRef.current.offsetWidth || 300;
    const H = ttRef.current.offsetHeight || 200;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (!rect) {
      setPos({
        top: clamp(vh / 2 - H / 2, 8, vh - H - 8),
        left: clamp(vw / 2 - W / 2, 8, vw - W - 8),
        arrow: "none",
      });
      return;
    }
    setPos(tooltipPos(rect, step.placement ?? "bottom", W, H, vw, vh));
  }, [rect, visible, step.placement]);

  useEffect(() => {
    if (!playing) {
      if (timer.current) clearTimeout(timer.current);
      return;
    }
    timer.current = setTimeout(
      () =>
        setStepIdx((p) => {
          const n = p + 1;
          if (n >= TOUR_STEPS.length) {
            setPlaying(false);
            return p;
          }
          return n;
        }),
      STEP_MS,
    );
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, stepIdx]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") {
        setPlaying(false);
        setStepIdx((p) => Math.min(TOUR_STEPS.length - 1, p + 1));
      }
      if (e.key === "ArrowLeft") {
        setPlaying(false);
        setStepIdx((p) => Math.max(0, p - 1));
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const goNext = () => {
    setPlaying(false);
    setStepIdx((p) => Math.min(TOUR_STEPS.length - 1, p + 1));
  };
  const goPrev = () => {
    setPlaying(false);
    setStepIdx((p) => Math.max(0, p - 1));
  };

  const hasTarget = visible && !!rect && !waiting;
  const strips =
    hasTarget && rect
      ? (() => {
          const { top: vt, left: vl, width: vw2, height: vh2 } = rect;
          const et = Math.max(0, vt - PAD);
          const el = Math.max(0, vl - PAD);
          const ew = vw2 + PAD * 2;
          const eh = vh2 + PAD * 2;
          return {
            top: { top: 0, left: 0, right: 0, height: et },
            bot: { top: et + eh, left: 0, right: 0, bottom: 0 },
            left: { top: et, left: 0, width: el, height: eh },
            right: { top: et, left: el + ew, right: 0, height: eh },
          };
        })()
      : null;

  const desc = (() => {
    let raw = t(step.descKey);
    if (demoGr) raw = raw.replace(/\{\{gr\}\}/g, demoGr);
    if (demoStudentName) raw = raw.replace(/\{\{name\}\}/g, demoStudentName);
    return raw;
  })();

  return (
    <>
      {strips ? (
        <>
          <div className="ft-strip" style={strips.top} aria-hidden />
          <div className="ft-strip" style={strips.bot} aria-hidden />
          <div className="ft-strip" style={strips.left} aria-hidden />
          <div className="ft-strip" style={strips.right} aria-hidden />
        </>
      ) : (
        <div className="ft-overlay-full" aria-hidden />
      )}

      {hasTarget && rect && (
        <div
          className={cn("ft-cutout-border", step.pulse && "ft-cutout-pulse")}
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
          aria-hidden
        />
      )}

      <div
        ref={ttRef}
        className={cn(
          "ft-tooltip",
          pos ? `ft-arrow-${pos.arrow}` : "ft-arrow-none",
          !visible && "ft-tooltip--hidden",
        )}
        style={pos ? { top: pos.top, left: pos.left } : undefined}
        role="dialog"
        aria-live="polite"
        aria-label={t(step.titleKey)}
      >
        <div className="ft-tt-stripe" aria-hidden />
        <div className="ft-tt-progress" aria-hidden>
          <div className="ft-tt-bar" style={{ width: `${pct}%` }} />
        </div>

        <div className="ft-tt-head">
          <div className="ft-tt-head-left">
            {phaseKey ? (
              <span className="ft-tt-phase">{t(phaseKey)}</span>
            ) : null}
            <span className="ft-tt-counter">
              <b>{stepIdx + 1}</b>/{TOUR_STEPS.length}
            </span>
          </div>
          <div className="ft-tt-ctrls">
            <button
              type="button"
              className={cn("ft-tt-icobtn", playing && "is-playing")}
              onClick={() => setPlaying((v) => !v)}
              title={playing ? t("featureTour.pauseDemo") : t("featureTour.playDemo")}
            >
              {playing ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              className="ft-tt-icobtn is-close"
              onClick={onClose}
              title={t("featureTour.closeTour")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="ft-tt-body">
          <h3 className="ft-tt-title">{t(step.titleKey)}</h3>
          {waiting ? (
            <p className="ft-tt-wait">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("featureTour.loadingStep")}
            </p>
          ) : (
            <p className="ft-tt-desc">{desc}</p>
          )}
          {step.isSearchStep && demoGr && !waiting && (
            <div className="ft-tt-gr">
              <span>GR:</span>
              <code className="ft-tt-gr-code">{demoGr}</code>
              <span className="ft-tt-gr-name">{demoStudentName}</span>
            </div>
          )}
          {step.isStudentOpenStep && demoStudentName && !waiting && (
            <div className="ft-tt-gr ft-tt-gr--open">
              <span>{t("featureTour.openingStudent")}</span>
              <strong>{demoStudentName}</strong>
            </div>
          )}
        </div>

        <div className="ft-tt-dots" aria-hidden>
          {TOUR_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={cn(
                "ft-tt-dot",
                i === stepIdx && "is-active",
                i < stepIdx && "is-done",
              )}
              onClick={() => {
                setPlaying(false);
                setStepIdx(i);
              }}
            />
          ))}
        </div>

        <div className="ft-tt-nav">
          <button
            type="button"
            className="ft-tt-btn ft-tt-btn--ghost"
            onClick={goPrev}
            disabled={isFirst || waiting}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {t("common.previous")}
          </button>
          <button
            type="button"
            className="ft-tt-btn ft-tt-btn--skip"
            onClick={onClose}
          >
            {t("featureTour.skipTour")}
          </button>
          {isLast ? (
            <button
              type="button"
              className="ft-tt-btn ft-tt-btn--next"
              onClick={onClose}
              disabled={waiting}
            >
              {t("featureTour.finish")} ✓
            </button>
          ) : (
            <button
              type="button"
              className="ft-tt-btn ft-tt-btn--next"
              onClick={goNext}
              disabled={waiting}
            >
              {t("common.next")}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export function FeatureTourDemoSearchBridge() {
  useEffect(() => {
    const fill = (v: string) => {
      const inp = document.querySelector<HTMLInputElement>(".tn-gr-search__input");
      if (!inp) return;
      const set = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      set?.call(inp, v);
      inp.dispatchEvent(new Event("input", { bubbles: true }));
      inp.dispatchEvent(new Event("change", { bubbles: true }));
      if (v) inp.focus();
    };
    const onS = (e: Event) =>
      fill((e as CustomEvent<{ value: string }>).detail?.value ?? "");
    const onC = () => fill("");
    window.addEventListener(DEMO_SEARCH_EVENT, onS);
    window.addEventListener(DEMO_SEARCH_CLEAR_EVENT, onC);
    return () => {
      window.removeEventListener(DEMO_SEARCH_EVENT, onS);
      window.removeEventListener(DEMO_SEARCH_CLEAR_EVENT, onC);
    };
  }, []);
  return null;
}
