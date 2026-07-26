"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, Eraser, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import "./multi-select-search.css";

export type MultiSelectSearchProps = {
  label?: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: readonly string[];
  /** Sent as value when Other is chosen — custom typed items are stored as-is */
  allowOther?: boolean;
  otherLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  otherPlaceholder?: string;
  addLabel?: string;
  emptyLabel?: string;
  clearAllLabel?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  hint?: string;
};

function normalize(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

export function MultiSelectSearch({
  label,
  value,
  onChange,
  options,
  allowOther = true,
  otherLabel = "Other",
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  otherPlaceholder = "Type and add…",
  addLabel = "Add",
  emptyLabel = "No matches",
  clearAllLabel = "Clear all",
  required,
  disabled,
  error,
  className,
  hint,
}: MultiSelectSearchProps) {
  const autoId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const otherRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [otherMode, setOtherMode] = useState(false);
  const [otherDraft, setOtherDraft] = useState("");
  const [extras, setExtras] = useState<string[]>([]);

  const selected = useMemo(
    () => value.map(normalize).filter(Boolean),
    [value],
  );

  const selectedSet = useMemo(
    () => new Set(selected.map((s) => s.toLowerCase())),
    [selected],
  );

  // Keep custom values that aren't in the preset list
  useEffect(() => {
    const preset = new Set(options.map((o) => o.toLowerCase()));
    const customs = selected.filter((s) => !preset.has(s.toLowerCase()));
    if (!customs.length) return;
    setExtras((prev) => {
      const map = new Map(prev.map((p) => [p.toLowerCase(), p]));
      for (const c of customs) map.set(c.toLowerCase(), c);
      return Array.from(map.values());
    });
  }, [selected, options]);

  const allOptions = useMemo(() => {
    const seen = new Set(options.map((o) => o.toLowerCase()));
    const merged = [...options];
    for (const e of extras) {
      if (!seen.has(e.toLowerCase())) {
        merged.push(e);
        seen.add(e.toLowerCase());
      }
    }
    return merged;
  }, [options, extras]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter((o) => o.toLowerCase().includes(q));
  }, [allOptions, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setOtherMode(false);
        setQuery("");
        setOtherDraft("");
      }
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setOtherMode(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && !otherMode) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, otherMode]);

  useEffect(() => {
    if (otherMode) {
      requestAnimationFrame(() => otherRef.current?.focus());
    }
  }, [otherMode]);

  const toggle = (opt: string) => {
    const key = opt.toLowerCase();
    if (selectedSet.has(key)) {
      onChange(selected.filter((s) => s.toLowerCase() !== key));
    } else {
      onChange([...selected, opt]);
    }
  };

  const remove = (opt: string) => {
    const key = opt.toLowerCase();
    onChange(selected.filter((s) => s.toLowerCase() !== key));
  };

  const addOther = () => {
    const text = normalize(otherDraft);
    if (!text) return;
    if (!selectedSet.has(text.toLowerCase())) {
      onChange([...selected, text]);
    }
    setExtras((prev) => {
      if (prev.some((p) => p.toLowerCase() === text.toLowerCase())) return prev;
      return [...prev, text];
    });
    setOtherDraft("");
    setOtherMode(false);
    setQuery("");
  };

  const onOtherKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addOther();
    }
  };

  const clearAll = () => {
    onChange([]);
    setOtherMode(false);
    setOtherDraft("");
    setQuery("");
  };

  return (
    <div className={cn("shs-ms", className)} ref={rootRef}>
      {label ? (
        <div className="shs-ms__label-row">
          <label htmlFor={autoId} className="shs-ms__label">
            {label}
            {required ? <span className="shs-ms__req">*</span> : null}
          </label>
          {selected.length > 0 && !disabled ? (
            <button
              type="button"
              className="shs-ms__clear-all"
              onClick={clearAll}
            >
              <Eraser className="h-3.5 w-3.5" />
              <span>{clearAllLabel}</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="shs-ms__control">
        <button
          type="button"
          id={autoId}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="shs-ms__trigger"
          data-open={open ? "true" : "false"}
          data-error={error ? "true" : "false"}
          onClick={() => {
            if (disabled) return;
            setOpen((v) => !v);
          }}
        >
          <div className="shs-ms__chips">
            {selected.length === 0 ? (
              <span className="shs-ms__placeholder">{placeholder}</span>
            ) : (
              selected.map((item) => (
                <span key={item} className="shs-ms__chip">
                  <span className="shs-ms__chip-text">{item}</span>
                  <span
                    role="button"
                    tabIndex={-1}
                    className="shs-ms__chip-x"
                    aria-label={`Remove ${item}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(item);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              ))
            )}
          </div>
          <ChevronDown className={cn("shs-ms__chev", open && "shs-ms__chev--open")} />
        </button>

        {selected.length > 0 && !disabled && !label ? (
          <button
            type="button"
            className="shs-ms__clear-icon"
            onClick={clearAll}
            aria-label={clearAllLabel}
            title={clearAllLabel}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="shs-ms__panel" role="listbox" aria-multiselectable="true">
          <div className="shs-ms__search">
            <Search className="shs-ms__search-icon h-4 w-4" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="shs-ms__search-input"
              onClick={(e) => e.stopPropagation()}
            />
            {query ? (
              <button
                type="button"
                className="shs-ms__clear-q"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="shs-ms__list">
            {filtered.length === 0 ? (
              <p className="shs-ms__empty">{emptyLabel}</p>
            ) : (
              filtered.map((opt) => {
                const active = selectedSet.has(opt.toLowerCase());
                return (
                  <button
                    key={opt}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn("shs-ms__option", active && "shs-ms__option--on")}
                    onClick={() => toggle(opt)}
                  >
                    <span className={cn("shs-ms__check", active && "shs-ms__check--on")}>
                      {active ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                    <span className="shs-ms__opt-label">{opt}</span>
                  </button>
                );
              })
            )}
          </div>

          {allowOther ? (
            <div className="shs-ms__other">
              {!otherMode ? (
                <button
                  type="button"
                  className="shs-ms__other-btn"
                  onClick={() => setOtherMode(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {otherLabel}
                </button>
              ) : (
                <div className="shs-ms__other-row">
                  <input
                    ref={otherRef}
                    type="text"
                    value={otherDraft}
                    onChange={(e) => setOtherDraft(e.target.value)}
                    onKeyDown={onOtherKey}
                    placeholder={otherPlaceholder}
                    className="shs-ms__other-input"
                  />
                  <button
                    type="button"
                    className="shs-ms__add-btn"
                    onClick={addOther}
                    disabled={!normalize(otherDraft)}
                  >
                    {addLabel}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="shs-ms__error">{error}</p> : null}
      {hint && !error ? <p className="shs-ms__hint">{hint}</p> : null}
    </div>
  );
}

/**
 * Parse stored qualification string → array.
 * Only split on comma / semicolon / pipe — NOT on "/" (names like "PTC / D.El.Ed.").
 */
export function parseQualificationList(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  const parts = raw
    .split(/\s*[,;|]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  // De-dupe case-insensitively while preserving first spelling
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export function joinQualificationList(items: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = raw.trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.join(", ");
}
