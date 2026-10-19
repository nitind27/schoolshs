import { RELIGIONS } from "@/lib/constants";

/** Gujarati label for the built-in religion values stored on students. */
export const RELIGION_LABEL_GU: Record<(typeof RELIGIONS)[number], string> = {
  Hindu: "હિન્દુ",
  Muslim: "મુસ્લિમ",
  Christian: "ખ્રિસ્તી",
  Sikh: "શીખ",
  Buddhist: "બૌદ્ધ",
  Jain: "જૈન",
  Parsi: "પારસી",
  Other: "અન્ય",
};

export function normalizeReligionName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isBuiltinReligion(name: string) {
  const key = normalizeReligionName(name).toLowerCase();
  return RELIGIONS.some((item) => item.toLowerCase() === key);
}

export function builtinReligionName(name: string) {
  const key = normalizeReligionName(name).toLowerCase();
  return RELIGIONS.find((item) => item.toLowerCase() === key) || "";
}

/** Map English or the matching Gujarati label back to the stored built-in value. */
export function resolveReligionName(value: string) {
  const normalized = normalizeReligionName(value);
  const builtin = builtinReligionName(normalized);
  if (builtin) return builtin;
  const fromGujarati = Object.entries(RELIGION_LABEL_GU).find(([, label]) => label === normalized);
  return fromGujarati?.[0] || normalized;
}

/** Built-in religions first, then school additions, without case-insensitive duplicates. */
export function mergeReligionNames(...groups: string[][]) {
  const seen = new Set<string>();
  const ordered: string[] = [];
  const push = (raw: string) => {
    const canonical = builtinReligionName(raw) || normalizeReligionName(raw);
    if (!canonical || canonical.length > 80) return;
    const key = canonical.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(canonical);
  };
  for (const name of RELIGIONS) push(name);
  for (const group of groups) {
    const extras = [...group].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    for (const name of extras) push(name);
  }
  return ordered;
}

export function religionLabel(name: string) {
  const builtin = builtinReligionName(name);
  if (builtin) return RELIGION_LABEL_GU[builtin as (typeof RELIGIONS)[number]] || builtin;
  return normalizeReligionName(name);
}
