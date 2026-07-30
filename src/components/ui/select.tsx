import { cn } from "@/lib/utils";
import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { useT } from "@/i18n/locale-provider";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: readonly string[] | { value: string; label: string; disabled?: boolean }[];
  /** Label for the blank first option (value=""). Defaults to common.select */
  emptyLabel?: string;
  /** Hide the blank first option (use for required fields that already have a default) */
  hideEmptyOption?: boolean;
}

function isBlankOption(opt: string | { value: string; label: string }): boolean {
  if (typeof opt === "string") return !opt.trim();
  return !String(opt.value ?? "").trim();
}

const SelectInner = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, emptyLabel, hideEmptyOption, ...props }, ref) => {
    const t = useT();
    const generatedId = useId();
    const fieldId = id || generatedId;
    const placeholder =
      emptyLabel != null && String(emptyLabel).trim()
        ? String(emptyLabel).trim()
        : t("common.select");
    const cleanOptions = (options || []).filter((opt) => !isBlankOption(opt));

    return (
      <div className="min-w-0 space-y-1.5">
        {label && (
          <label htmlFor={fieldId} className="block break-words text-sm font-medium leading-snug text-slate-700">
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <select
          id={fieldId}
          ref={ref}
          className={cn(
            "flex h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 cursor-pointer focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          {...props}
        >
          {!hideEmptyOption && <option value="">{placeholder}</option>}
          {cleanOptions.map((opt) =>
            typeof opt === "string" ? (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ) : (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label?.trim() ? opt.label : opt.value}
              </option>
            )
          )}
        </select>
        {error && <p className="break-words text-xs leading-snug text-red-500">{error}</p>}
      </div>
    );
  }
);
SelectInner.displayName = "Select";

export const Select = SelectInner;
