"use client";

import { cn } from "@/lib/utils";

export interface ChartSegment {
  label: string;
  value: number;
  color: string;
  percent?: number;
}

function buildConicGradient(segments: ChartSegment[], total: number): string {
  if (total <= 0) return "#e2e8f0";
  let acc = 0;
  const parts = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const start = (acc / total) * 100;
      acc += s.value;
      const end = (acc / total) * 100;
      return `${s.color} ${start}% ${end}%`;
    });
  return parts.length ? `conic-gradient(${parts.join(", ")})` : "#e2e8f0";
}

export function DoughnutChart({
  segments,
  centerLabel,
  centerValue,
  size = 200,
  className,
}: {
  segments: ChartSegment[];
  centerLabel?: string;
  centerValue?: string | number;
  size?: number;
  className?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const enriched = segments.map((s) => ({
    ...s,
    percent: total > 0 ? Math.round((s.value / total) * 100) : 0,
  }));

  return (
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-center", className)}>
      <div className="relative mx-auto shrink-0" style={{ width: size, height: size }}>
        <div
          className="h-full w-full rounded-full shadow-inner ring-4 ring-white"
          style={{ background: buildConicGradient(enriched, total) }}
        />
        <div
          className="absolute inset-0 m-auto flex flex-col items-center justify-center rounded-full bg-white shadow-sm"
          style={{ width: size * 0.58, height: size * 0.58 }}
        >
          {centerValue !== undefined && (
            <span className="text-2xl font-bold tabular-nums text-slate-900">{centerValue}</span>
          )}
          {centerLabel && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{centerLabel}</span>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {enriched.filter((s) => s.value > 0).map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-full shadow-sm" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{s.label}</span>
            <span className="shrink-0 font-bold tabular-nums text-slate-900">{s.value}</span>
            <span className="w-10 shrink-0 text-right text-xs text-slate-400">{s.percent}%</span>
          </div>
        ))}
        {total === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No data</p>
        )}
      </div>
    </div>
  );
}

export function BarChart({
  segments,
  maxValue,
  className,
}: {
  segments: ChartSegment[];
  maxValue?: number;
  className?: string;
}) {
  const peak = maxValue ?? Math.max(...segments.map((s) => s.value), 1);

  return (
    <div className={cn("space-y-3", className)}>
      {segments.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No data</p>
      ) : (
        segments.map((s) => {
          const pct = peak > 0 ? (s.value / peak) * 100 : 0;
          return (
            <div key={s.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 truncate pr-2">{s.label}</span>
                <span className="shrink-0 font-bold tabular-nums text-slate-900">
                  {s.value}
                  {s.percent !== undefined && (
                    <span className="ml-1 font-normal text-slate-400">({s.percent}%)</span>
                  )}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${s.color}dd, ${s.color})`,
                  }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export function VerticalBarChart({
  segments,
  className,
}: {
  segments: ChartSegment[];
  className?: string;
}) {
  const peak = Math.max(...segments.map((s) => s.value), 1);
  const barAreaHeight = 140;

  return (
    <div className={cn("overflow-x-auto px-1", className)}>
      <div
        className="flex min-w-full items-end justify-between gap-1.5"
        style={{ minWidth: segments.length > 6 ? `${segments.length * 52}px` : undefined }}
      >
        {segments.map((s) => {
          const barPx = peak > 0 ? Math.round((s.value / peak) * barAreaHeight) : 0;
          const height = s.value > 0 ? Math.max(barPx, 6) : 0;
          return (
            <div key={s.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-bold tabular-nums text-slate-700">{s.value}</span>
              <div
                className="flex w-full max-w-[52px] items-end justify-center"
                style={{ height: barAreaHeight }}
              >
                <div
                  className="w-full rounded-t-md transition-all duration-700 shadow-sm"
                  style={{
                    height: `${height}px`,
                    background: `linear-gradient(180deg, ${s.color}, ${s.color}cc)`,
                  }}
                />
              </div>
              <span className="w-full truncate text-center text-[10px] font-medium leading-tight text-slate-500">
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
