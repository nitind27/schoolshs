"use client";

import { cn } from "@/lib/utils";

export interface ChartSegment {
  label: string;
  value: number;
  color: string;
  percent?: number;
  /** Filter value used on click (status key, category name, standard, gender) */
  id?: string;
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
  onSegmentClick,
  showZero = false,
  legendTiles = false,
}: {
  segments: ChartSegment[];
  centerLabel?: string;
  centerValue?: string | number;
  size?: number;
  className?: string;
  onSegmentClick?: (segment: ChartSegment) => void;
  showZero?: boolean;
  legendTiles?: boolean;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const enriched = segments.map((s) => ({
    ...s,
    percent: total > 0 ? Math.round((s.value / total) * 100) : 0,
  }));
  const legend = showZero ? enriched : enriched.filter((s) => s.value > 0);

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center", className)}>
      <div className="relative mx-auto shrink-0" style={{ width: size, height: size }}>
        <div
          className="h-full w-full rounded-full shadow-[0_12px_28px_-16px_rgba(15,23,42,0.45)] ring-4 ring-white"
          style={{ background: buildConicGradient(enriched, total) }}
        />
        <div
          className="absolute inset-0 m-auto flex flex-col items-center justify-center rounded-full bg-white shadow-md"
          style={{ width: size * 0.58, height: size * 0.58 }}
        >
          {centerValue !== undefined && (
            <span className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900">{centerValue}</span>
          )}
          {centerLabel && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{centerLabel}</span>
          )}
        </div>
      </div>

      <div
        className={cn(
          "min-w-0 flex-1",
          legendTiles ? "ops-doughnut-legend is-tiles" : "space-y-2",
        )}
      >
        {legend.map((s) => {
          const inner = legendTiles ? (
            <>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm" style={{ background: s.color }} />
                <span className="truncate text-xs font-semibold text-slate-600">{s.label}</span>
              </span>
              <strong className="text-xl font-extrabold tabular-nums tracking-tight text-slate-900">
                {s.value.toLocaleString("en-IN")}
              </strong>
              <span className="text-xs font-semibold text-slate-400">{s.percent}%</span>
            </>
          ) : (
            <>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{s.label}</span>
              <span className="shrink-0 font-extrabold tabular-nums text-slate-900">{s.value}</span>
              <span className="w-10 shrink-0 text-right text-xs font-semibold text-slate-400">{s.percent}%</span>
            </>
          );
          const itemClass = legendTiles
            ? "flex w-full min-h-[5rem] cursor-pointer flex-col items-start justify-center gap-1 rounded-xl bg-white/80 px-3.5 py-3 text-left ring-1 ring-slate-100 transition hover:bg-white hover:shadow-sm hover:ring-slate-300"
            : "flex w-full cursor-pointer items-center gap-2 rounded-lg bg-white/70 px-2 py-1.5 text-left text-sm ring-1 ring-slate-100 transition hover:bg-white hover:shadow-sm hover:ring-slate-300";
          return onSegmentClick ? (
            <button
              key={s.id || s.label}
              type="button"
              onClick={() => onSegmentClick(s)}
              className={itemClass}
            >
              {inner}
            </button>
          ) : (
            <div key={s.id || s.label} className={itemClass.replace("cursor-pointer ", "")}>
              {inner}
            </div>
          );
        })}
        {legend.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No data</p>}
      </div>
    </div>
  );
}

export function BarChart({
  segments,
  maxValue,
  className,
  onSegmentClick,
}: {
  segments: ChartSegment[];
  maxValue?: number;
  className?: string;
  onSegmentClick?: (segment: ChartSegment) => void;
}) {
  const peak = maxValue ?? Math.max(...segments.map((s) => s.value), 1);

  return (
    <div className={cn("space-y-3", className)}>
      {segments.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No data</p>
      ) : (
        segments.map((s) => {
          const pct = peak > 0 ? (s.value / peak) * 100 : 0;
          const body = (
            <>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="truncate pr-2 font-semibold text-slate-700">{s.label}</span>
                <span className="shrink-0 font-bold tabular-nums text-slate-900">
                  {s.value}
                  {s.percent !== undefined && (
                    <span className="ml-1 font-normal text-slate-400">({s.percent}%)</span>
                  )}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full shadow-sm transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${s.color}dd, ${s.color})`,
                  }}
                />
              </div>
            </>
          );
          return onSegmentClick ? (
            <button
              key={s.id || s.label}
              type="button"
              onClick={() => onSegmentClick(s)}
              className="w-full cursor-pointer rounded-lg p-1 text-left hover:bg-white/80"
            >
              {body}
            </button>
          ) : (
            <div key={s.id || s.label}>{body}</div>
          );
        })
      )}
    </div>
  );
}

export function VerticalBarChart({
  segments,
  className,
  onSegmentClick,
}: {
  segments: ChartSegment[];
  className?: string;
  onSegmentClick?: (segment: ChartSegment) => void;
}) {
  const peak = Math.max(...segments.map((s) => s.value), 1);
  const barAreaHeight = 150;

  return (
    <div className={cn("overflow-x-auto px-1 pt-1", className)}>
      <div
        className="flex min-w-full items-end justify-between gap-2"
        style={{ minWidth: segments.length > 6 ? `${segments.length * 56}px` : undefined }}
      >
        {segments.map((s) => {
          const barPx = peak > 0 ? Math.round((s.value / peak) * barAreaHeight) : 0;
          const height = s.value > 0 ? Math.max(barPx, 8) : 0;
          const body = (
            <>
              <span className="rounded-md bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white opacity-90 shadow-sm">
                {s.value}
              </span>
              <div
                className="relative flex w-full max-w-[56px] items-end justify-center"
                style={{ height: barAreaHeight }}
              >
                <div
                  className="w-[72%] rounded-t-lg shadow-[0_10px_18px_-12px_rgba(15,23,42,0.55)] transition-all duration-700 ease-out group-hover:brightness-110"
                  style={{
                    height: `${height}px`,
                    background: `linear-gradient(180deg, ${s.color} 0%, ${s.color}cc 70%, ${s.color}99 100%)`,
                  }}
                />
              </div>
              <span className="w-full truncate text-center text-[10px] font-semibold leading-tight text-slate-600">
                {s.label}
              </span>
            </>
          );
          return onSegmentClick ? (
            <button
              key={s.id || s.label}
              type="button"
              onClick={() => onSegmentClick(s)}
              className="group flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-lg p-1 hover:bg-white/70"
            >
              {body}
            </button>
          ) : (
            <div key={s.id || s.label} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5">
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
