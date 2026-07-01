import { cn } from "@/lib/utils";
import { forwardRef, type SelectHTMLAttributes } from "react";
import { useT } from "@/i18n/locale-provider";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: readonly string[] | { value: string; label: string }[];
  emptyLabel?: string;
}

const SelectInner = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, emptyLabel, ...props }, ref) => {
    const t = useT();
    const placeholder = emptyLabel ?? t("common.select");

    return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        id={id}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
          className
        )}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) =>
          typeof opt === "string" ? (
            <option key={opt} value={opt}>{opt}</option>
          ) : (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          )
        )}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
    );
  }
);
SelectInner.displayName = "Select";

export const Select = SelectInner;
