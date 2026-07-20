"use client";

import { useId, useRef } from "react";

export function GrDigitBoxInput({
  label,
  value,
  onChange,
  count,
  maxLength,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (digits: string) => void;
  count: number;
  maxLength?: number;
  className?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const max = maxLength ?? count;
  const digits = value.replace(/\D/g, "").slice(0, max);
  const chars = digits.padEnd(count, " ").slice(0, count).split("");

  const setDigits = (next: string) => {
    onChange(next.replace(/\D/g, "").slice(0, max));
  };

  return (
    <div className={`space-y-1.5 ${className}`.trim()}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.focus()}
        className="w-full rounded-xl border border-slate-300 bg-white px-2 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
      >
        <div className="gr-search-digit-boxes">
          {Array.from({ length: count }).map((_, i) => (
            <span
              key={i}
              className={`gr-search-digit-box${chars[i]?.trim() ? " gr-search-digit-filled" : ""}`}
            >
              {chars[i]?.trim() || ""}
            </span>
          ))}
        </div>
        <input
          id={id}
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={digits}
          onChange={(e) => setDigits(e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text");
            setDigits(digits + pasted);
          }}
          className="sr-only"
          aria-label={label}
        />
      </button>
      <style>{`
        .gr-search-digit-boxes {
          display: flex;
          gap: 2px;
          width: 100%;
        }
        .gr-search-digit-box {
          flex: 1;
          min-width: 0;
          height: 28px;
          border: 1px solid #94a3b8;
          border-radius: 4px;
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          line-height: 26px;
          color: #0f172a;
          background: #f8fafc;
        }
        .gr-search-digit-filled {
          background: #fff;
          border-color: #64748b;
        }
      `}</style>
    </div>
  );
}
