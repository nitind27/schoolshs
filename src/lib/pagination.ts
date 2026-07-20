/** Default rows per page for all data tables */
export const PAGE_SIZE = 10;

export function parsePageParam(value: string | null | undefined): number {
  const p = parseInt(value || "1", 10);
  return Number.isFinite(p) && p > 0 ? p : 1;
}

export function parseLimitParam(
  value: string | null | undefined,
  defaultLimit = PAGE_SIZE,
): number {
  const l = parseInt(value || String(defaultLimit), 10);
  if (!Number.isFinite(l) || l < 1) return defaultLimit;
  return Math.min(l, 100);
}

export function totalPages(total: number, pageSize = PAGE_SIZE): number {
  if (total <= 0) return 0;
  return Math.ceil(total / pageSize);
}

export function pageRange(page: number, limit: number, total: number) {
  const pages = totalPages(total, limit);
  const safePage = pages === 0 ? 1 : Math.min(Math.max(1, page), pages);
  if (total === 0) {
    return { page: 1, from: 0, to: 0, totalPages: 0 };
  }
  return {
    page: safePage,
    from: (safePage - 1) * limit + 1,
    to: Math.min(safePage * limit, total),
    totalPages: pages,
  };
}

export function paginateSlice<T>(items: T[], page: number, pageSize = PAGE_SIZE): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
