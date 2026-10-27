"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cleanLcFonts, type LcFontMap } from "@/lib/certificates/lc-fonts";

const FONT_MIN = 8;
const FONT_MAX = 18;

type FontScopeValue = {
  sizeOf: (id: string) => number | undefined;
  focus: (id: string, el: HTMLElement) => void;
  blur: (id: string) => void;
  fix: () => void;
  fixing: boolean;
  fixedNote: string;
  stepLabels: (delta: number) => void;
};

const FontScope = createContext<FontScopeValue | null>(null);

function readFontPx(el: HTMLElement) {
  return Math.round(parseFloat(getComputedStyle(el).fontSize) || 12);
}

function FontBar({
  active,
  sizes,
  bases,
  onStep,
}: {
  active: { id: string; el: HTMLElement } | null;
  sizes: Record<string, number>;
  bases: Record<string, number>;
  onStep: (delta: number) => void;
}) {
  const size = active ? sizes[active.id] ?? bases[active.id] : undefined;
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    const el = active?.el;
    if (!el) {
      setRect(null);
      return;
    }
    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [active, size]);

  if (!active || !rect || size == null) return null;
  const top = rect.top > 42 ? rect.top - 34 : rect.bottom + 6;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 132));

  return (
    <div className="cert-fontbar no-print" style={{ top, left }} onMouseDown={(event) => event.preventDefault()}>
      <button type="button" aria-label="Smaller" disabled={size <= FONT_MIN} onClick={() => onStep(-1)}>
        A−
      </button>
      <span>{size}</span>
      <button type="button" aria-label="Larger" disabled={size >= FONT_MAX} onClick={() => onStep(1)}>
        A+
      </button>
    </div>
  );
}

export function CertFontScope({ resetKey, children }: { resetKey: string; children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<LcFontMap>({});
  const [active, setActive] = useState<{ id: string; el: HTMLElement } | null>(null);
  const [fixing, setFixing] = useState(false);
  const [fixedNote, setFixedNote] = useState("");
  const bases = useRef<Record<string, number>>({});
  const saved = useRef<LcFontMap>({});
  const sizesRef = useRef<LcFontMap>({});
  sizesRef.current = sizes;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/certificates/lc-fonts")
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        const fonts = cleanLcFonts(data.fonts);
        saved.current = fonts;
        setSizes(fonts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const seenReset = useRef(resetKey);
  useEffect(() => {
    if (seenReset.current === resetKey) return;
    seenReset.current = resetKey;
    setSizes({ ...saved.current });
    setActive(null);
    setFixedNote("");
  }, [resetKey]);

  const value = useMemo<FontScopeValue>(
    () => ({
      sizeOf: (id) => sizes[id],
      focus: (id, el) => {
        if (!bases.current[id]) bases.current[id] = readFontPx(el);
        setActive({ id, el });
      },
      blur: (id) => setActive((current) => (current?.id === id ? null : current)),
      fixing,
      fixedNote,
      stepLabels: (delta: number) => {
        const root = rootRef.current;
        if (!root) return;
        const nodes = [...root.querySelectorAll<HTMLElement>('[data-lc-role="label"]')];
        setSizes((prev) => {
          const next = { ...prev };
          for (const el of nodes) {
            const key = el.dataset.lcKey || "";
            if (!key) continue;
            if (!bases.current[key]) bases.current[key] = readFontPx(el);
            const base = bases.current[key];
            const current = prev[key] ?? base;
            const size = Math.min(FONT_MAX, Math.max(FONT_MIN, current + delta));
            if (size === base) delete next[key];
            else next[key] = size;
          }
          return next;
        });
        setFixedNote("");
      },
      fix: () => {
        setFixing(true);
        setFixedNote("");
        const fonts = cleanLcFonts(sizesRef.current);
        fetch("/api/certificates/lc-fonts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fonts }),
        })
          .then(async (response) => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Save failed");
            const next = cleanLcFonts(data.fonts);
            saved.current = next;
            setSizes(next);
            setFixedNote("Font size saved. Print will use this size.");
          })
          .catch(() => setFixedNote("Font size was not saved."))
          .finally(() => setFixing(false));
      },
    }),
    [sizes, fixing, fixedNote],
  );

  const step = (delta: number) => {
    if (!active) return;
    const base = bases.current[active.id] || readFontPx(active.el);
    setSizes((prev) => {
      const current = prev[active.id] ?? base;
      const next = Math.min(FONT_MAX, Math.max(FONT_MIN, current + delta));
      if (next === base) {
        const copy = { ...prev };
        delete copy[active.id];
        return copy;
      }
      return { ...prev, [active.id]: next };
    });
    setFixedNote("");
  };

  return (
    <FontScope.Provider value={value}>
      <div ref={rootRef}>{children}</div>
      <FontBar active={active} sizes={sizes} bases={bases.current} onStep={step} />
      <style jsx global>{`
        .cert-inline-edit {
          outline: none;
          cursor: text;
          border-radius: 2px;
        }
        .cert-inline-edit.cert-sized {
          font-size: var(--cert-fs) !important;
        }
        .cert-fontbar {
          position: fixed;
          z-index: 40;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 2px;
          background: #fff;
          border: 1px solid #93c5fd;
          border-radius: 8px;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.16);
        }
        .cert-fontbar button {
          min-width: 28px;
          height: 26px;
          padding: 0 6px;
          border: 0;
          border-radius: 6px;
          background: #eff6ff;
          color: #1e3a8a;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .cert-fontbar span {
          min-width: 22px;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          color: #1e3a8a;
        }
        .cert-edit-hint {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin: 0 auto 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: #1e3a8a;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 10px;
        }
        .cert-edit-hint button {
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #1e3a8a;
          background: #fff;
          border: 1px solid #93c5fd;
          border-radius: 8px;
          cursor: pointer;
        }
        @media screen {
          .cert-inline-edit:hover {
            background: rgba(59, 130, 246, 0.08);
          }
          .cert-inline-edit:focus {
            background: rgba(59, 130, 246, 0.14);
            box-shadow: 0 0 0 1px #3b82f6;
          }
        }
        @media print {
          .cert-inline-edit,
          .cert-inline-edit:focus {
            background: transparent !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </FontScope.Provider>
  );
}

export function CertFontTools({ onReset }: { onReset: () => void }) {
  const fonts = useContext(FontScope);
  if (!fonts) return null;
  return (
    <div className="cert-edit-hint no-print">
      <span>Click any line to edit it. A+ / A− changes that line. Labels A+ changes every label. Then Fix font.</span>
      <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {fonts.fixedNote ? <span>{fonts.fixedNote}</span> : null}
        <button type="button" onClick={() => fonts.stepLabels(-1)}>
          Labels A−
        </button>
        <button type="button" onClick={() => fonts.stepLabels(1)}>
          Labels A+
        </button>
        <button type="button" onClick={fonts.fix} disabled={fonts.fixing}>
          {fonts.fixing ? "Saving..." : "Fix font"}
        </button>
        <button type="button" onClick={onReset}>
          Reset text
        </button>
      </span>
    </div>
  );
}

export function CertEdit({
  value,
  onChange,
  className,
  style,
  sizeKey,
  label,
  multiline,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  sizeKey: string;
  label?: boolean;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const fonts = useContext(FontScope);
  const px = fonts?.sizeOf(sizeKey);

  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    const shown = value || "\u00a0";
    if (el.textContent !== shown) el.textContent = shown;
  }, [value]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (px) {
      el.style.setProperty("--cert-fs", `${px}px`);
      el.style.setProperty("font-size", `${px}px`, "important");
    } else {
      el.style.removeProperty("--cert-fs");
      el.style.removeProperty("font-size");
    }
  }, [px]);

  return (
    <span
      ref={ref}
      data-lc-key={sizeKey}
      data-lc-role={label ? "label" : undefined}
      className={`cert-inline-edit${px ? " cert-sized" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onFocus={(event) => fonts?.focus(sizeKey, event.currentTarget)}
      onBlur={(event) => {
        fonts?.blur(sizeKey);
        const raw = event.currentTarget.textContent || "";
        const next = multiline
          ? raw.replace(/\u00a0/g, " ").trim()
          : raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
        onChange(next);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !multiline) {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      onPaste={(event) => {
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, multiline ? text : text.replace(/\s+/g, " "));
      }}
    />
  );
}

export function useSheetState<T extends Record<string, string>>(seed: T, resetKey: string) {
  const seedKey = JSON.stringify(seed);
  const seedRef = useRef(seed);
  seedRef.current = seed;
  const [values, setValues] = useState<T>(seed);
  const dirty = useRef(new Set<keyof T>());
  const prevReset = useRef(resetKey);
  const prevSeed = useRef(seedKey);

  useEffect(() => {
    const current = seedRef.current;
    if (prevReset.current !== resetKey) {
      dirty.current = new Set();
      prevReset.current = resetKey;
      prevSeed.current = seedKey;
      setValues(current);
      return;
    }
    if (prevSeed.current === seedKey) return;
    prevSeed.current = seedKey;
    setValues((prev) => {
      const next = { ...current };
      for (const key of dirty.current) next[key] = prev[key];
      return next;
    });
  }, [seedKey, resetKey]);

  const set = (key: keyof T) => (value: string) => {
    dirty.current.add(key);
    setValues((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  };

  const reset = () => {
    dirty.current = new Set();
    prevSeed.current = seedKey;
    setValues(seedRef.current);
  };

  return { values, set, reset };
}
