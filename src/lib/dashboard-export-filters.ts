import type { DashboardFilterValues } from "@/components/dashboard/dashboard-filters";
import type { DashboardFilters } from "./dashboard-analytics";

export function filtersToQuery(filters: DashboardFilterValues): string {
  const p = new URLSearchParams();
  if (filters.standard) p.set("standard", filters.standard);
  if (filters.section) p.set("section", filters.section);
  if (filters.status) p.set("status", filters.status);
  if (filters.category) p.set("category", filters.category);
  if (filters.gender && filters.gender !== "all") p.set("gender", filters.gender);
  const q = p.toString();
  return q ? `?${q}` : "";
}

export function parseFiltersFromSearchParams(
  searchParams: URLSearchParams
): DashboardFilters {
  return {
    standard: searchParams.get("standard") || undefined,
    section: searchParams.get("section") || undefined,
    status: searchParams.get("status") || undefined,
    category: searchParams.get("category") || undefined,
    gender: searchParams.get("gender") || undefined,
  };
}

export function buildFilterSlug(filters: DashboardFilterValues): string {
  const parts: string[] = [];
  if (filters.standard) parts.push(`Std${filters.standard}`);
  if (filters.section) parts.push(`Div${filters.section}`);
  if (filters.status) parts.push(filters.status);
  if (filters.category) parts.push(filters.category);
  if (filters.gender && filters.gender !== "all") parts.push(filters.gender);
  return parts.length ? parts.join("_") : "All";
}

export function buildFilterSummaryText(
  filters: DashboardFilterValues,
  t: (k: string, p?: Record<string, string | number>) => string
): string {
  const parts: string[] = [];
  if (filters.standard) parts.push(t("dashboard.stdLabel", { standard: filters.standard }));
  if (filters.section) parts.push(t("dashboard.divLabel", { section: filters.section }));
  if (filters.status) parts.push(t(`status.${filters.status}`));
  if (filters.category) parts.push(filters.category);
  if (filters.gender && filters.gender !== "all") {
    const gl = t(`gender.${filters.gender}`);
    parts.push(gl !== `gender.${filters.gender}` ? gl : filters.gender);
  }
  return parts.length ? parts.join(" · ") : t("dashboard.filterAll");
}
