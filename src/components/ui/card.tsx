import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 px-6 py-5", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base font-semibold text-slate-800 leading-tight", className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-slate-500 leading-relaxed", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-2 px-6 py-4 border-t border-slate-100", className)}
      {...props}
    />
  );
}

/* ── Stat card variant ────────────────────────────────────── */
export function StatCard({
  label,
  value,
  sub,
  icon,
  gradient,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  gradient?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 text-white shadow-md",
        gradient || "bg-gradient-to-br from-blue-600 to-blue-700",
        className
      )}
    >
      {/* Background decoration */}
      <div
        className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-white/70 mb-1">{label}</p>
          <p className="text-3xl font-bold tracking-tight leading-none">{value}</p>
          {sub && <p className="text-xs text-white/60 mt-1.5">{sub}</p>}
        </div>
        {icon && (
          <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,.18)" }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
