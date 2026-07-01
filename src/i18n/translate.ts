import type { Messages } from "./messages";

type Params = Record<string, string | number>;

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

function interpolate(str: string, params?: Params): string {
  if (!params) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(params[key] ?? ""));
}

export function createTranslator(localeMessages: Messages) {
  return function t(key: string, params?: Params): string {
    const val = getNested(localeMessages as unknown as Record<string, unknown>, key);
    if (val === undefined) return key;
    return interpolate(val, params);
  };
}

export function translateFieldLabel(t: (key: string) => string, field: string): string {
  const label = t(`fields.${field}`);
  return label === `fields.${field}` ? field : label;
}

export function translateStatus(t: (key: string) => string, status: string): string {
  const label = t(`status.${status}`);
  return label === `status.${status}` ? status : label;
}
