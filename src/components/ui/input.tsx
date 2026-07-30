import { cn } from "@/lib/utils";
import { forwardRef, useId, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, type, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id || generatedId;
    return (
      <div className="min-w-0 space-y-1.5">
        {label && (
          <label htmlFor={fieldId} className="block break-words text-sm font-medium leading-snug text-slate-700">
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <input
          id={fieldId}
          ref={ref}
          type={type}
          className={cn(
            // Avoid `flex` on the control — it centers the native date calendar icon in Chrome/Edge
            "block h-10 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400",
            "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
            "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60",
            "transition-colors duration-150",
            type === "date" && "shs-date-input",
            error && "border-red-400 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          {...props}
        />
        {error && <p className="break-words text-xs leading-snug text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
