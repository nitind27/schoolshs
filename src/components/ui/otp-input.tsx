"use client";

import { useRef, type KeyboardEvent, type ClipboardEvent } from "react";
import { cn } from "@/lib/utils";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  className?: string;
  boxClassName?: string;
};

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled,
  className,
  boxClassName,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const focusAt = (index: number) => {
    const el = refs.current[Math.max(0, Math.min(index, length - 1))];
    el?.focus();
    el?.select();
  };

  const applyValue = (next: string, focusIndex?: number) => {
    const cleaned = next.replace(/\D/g, "").slice(0, length);
    onChange(cleaned);
    if (focusIndex !== undefined) focusAt(focusIndex);
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) {
      const arr = [...digits];
      arr[index] = "";
      applyValue(arr.join(""));
      return;
    }

    const arr = [...digits];
    arr[index] = digit;
    applyValue(arr.join(""), index < length - 1 ? index + 1 : index);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      const arr = [...digits];
      arr[index - 1] = "";
      applyValue(arr.join(""), index - 1);
      return;
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusAt(index - 1);
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    applyValue(pasted, Math.min(pasted.length, length - 1));
  };

  return (
    <div
      className={cn("inline-flex w-full max-w-full flex-wrap items-center justify-center gap-1.5 sm:gap-2", className)}
      role="group"
      aria-label="One-time password"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          disabled={disabled}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-11 w-10 shrink-0 rounded-xl border-2 border-slate-200 bg-white",
            "text-center text-lg font-bold leading-none text-slate-900 sm:h-12 sm:w-11 sm:text-xl",
            "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200",
            "disabled:cursor-not-allowed disabled:opacity-50",
            boxClassName,
          )}
          aria-label={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  );
}
