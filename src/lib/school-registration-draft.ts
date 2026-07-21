/** Super-admin school registration wizard — browser draft keyed by unique school code */

export const SCHOOL_REG_DRAFT_INDEX_KEY = "shs-school-reg-draft-index";
export const SCHOOL_REG_CURRENT_CODE_KEY = "shs-school-reg-current-code";
const DRAFT_PREFIX = "shs-school-reg-draft:";
const PENDING_CODE = "__PENDING__";

export type SchoolRegistrationDraft = {
  version: 1;
  savedAt: string;
  step: number;
  codeManuallyEdited: boolean;
  form: Record<string, unknown>;
};

export type SchoolRegistrationDraftSummary = {
  code: string;
  schoolName: string;
  savedAt: string;
  step: number;
  fieldCount: number;
};

function draftStorageKey(code: string) {
  const normalized = code.trim().toUpperCase().replace(/\s/g, "");
  return `${DRAFT_PREFIX}${normalized || PENDING_CODE}`;
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s/g, "");
}

function readIndex(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SCHOOL_REG_DRAFT_INDEX_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(codes: string[]) {
  if (typeof window === "undefined") return;
  const unique = [...new Set(codes.filter(Boolean))];
  localStorage.setItem(SCHOOL_REG_DRAFT_INDEX_KEY, JSON.stringify(unique));
}

/** Keep stored values when incoming save has empty strings (prevents wipe while typing code) */
export function mergeRegistrationDraftForms(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...existing };
  for (const [key, val] of Object.entries(incoming)) {
    if (val === undefined || val === null) continue;
    if (key === "enabledFeatures") {
      if (Array.isArray(val) && val.length > 0) out[key] = val;
      continue;
    }
    if (typeof val === "string") {
      const prev = existing[key];
      if (val.trim() === "" && typeof prev === "string" && prev.trim() !== "") continue;
      out[key] = val;
      continue;
    }
    out[key] = val;
  }
  return out;
}

function countFilledFields(form: Record<string, unknown>): number {
  let n = 0;
  for (const [k, v] of Object.entries(form)) {
    if (k === "code" || k === "enabledFeatures") continue;
    if (typeof v === "string" && v.trim()) n += 1;
  }
  if (Array.isArray(form.enabledFeatures) && form.enabledFeatures.length > 0) n += 1;
  return n;
}

export function loadSchoolRegistrationDraft(code: string): SchoolRegistrationDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftStorageKey(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SchoolRegistrationDraft;
    if (parsed?.version !== 1 || !parsed.form) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getSchoolRegistrationDraftSummary(code: string): SchoolRegistrationDraftSummary | null {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  const draft = loadSchoolRegistrationDraft(normalized);
  if (!draft) return null;
  const name = String(draft.form.name || "").trim();
  return {
    code: normalized,
    schoolName: name || "Unnamed school",
    savedAt: draft.savedAt,
    step: draft.step,
    fieldCount: countFilledFields(draft.form),
  };
}

export function listSchoolRegistrationDraftSummaries(): SchoolRegistrationDraftSummary[] {
  const codes = readIndex().filter((c) => c !== PENDING_CODE);
  const out: SchoolRegistrationDraftSummary[] = [];
  for (const code of codes) {
    const summary = getSchoolRegistrationDraftSummary(code);
    if (summary) out.push(summary);
  }
  return out.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

/** @deprecated use listSchoolRegistrationDraftSummaries */
export function listSchoolRegistrationDraftCodes(): string[] {
  return listSchoolRegistrationDraftSummaries().map((s) => s.code);
}

function prunePartialCodeDrafts(keepCode: string) {
  const keep = normalizeCode(keepCode);
  if (!keep) return;
  const next = readIndex().filter((c) => {
    if (c === keep) return true;
    if (keep.startsWith(c) && c.length < keep.length) {
      localStorage.removeItem(draftStorageKey(c));
      return false;
    }
    return true;
  });
  writeIndex(next);
}

export function saveSchoolRegistrationDraft(params: {
  code: string;
  previousCode?: string;
  step: number;
  codeManuallyEdited: boolean;
  form: Record<string, unknown>;
  replace?: boolean;
}): string | null {
  if (typeof window === "undefined") return null;

  const normalized = normalizeCode(params.code);
  if (!normalized || normalized.length < 3) return null;

  const storageCode = normalized;
  const prev = normalizeCode(params.previousCode || "");

  const existing = loadSchoolRegistrationDraft(storageCode);
  const mergedForm = params.replace
    ? params.form
    : existing
      ? mergeRegistrationDraftForms(existing.form, params.form)
      : params.form;

  mergedForm.code = storageCode;

  const payload: SchoolRegistrationDraft = {
    version: 1,
    savedAt: new Date().toISOString(),
    step: Math.max(params.step, existing?.step ?? 0),
    codeManuallyEdited: params.codeManuallyEdited,
    form: mergedForm,
  };

  localStorage.setItem(draftStorageKey(storageCode), JSON.stringify(payload));
  localStorage.setItem(SCHOOL_REG_CURRENT_CODE_KEY, storageCode);

  const index = readIndex().filter((c) => c !== PENDING_CODE && c !== prev);
  if (!index.includes(storageCode)) index.unshift(storageCode);
  writeIndex(index);

  prunePartialCodeDrafts(storageCode);

  if (prev && prev !== storageCode) {
    localStorage.removeItem(draftStorageKey(prev));
    writeIndex(readIndex().filter((c) => c !== prev));
  }

  return storageCode;
}

export function clearSchoolRegistrationDraft(code: string) {
  if (typeof window === "undefined") return;
  const normalized = normalizeCode(code) || PENDING_CODE;
  localStorage.removeItem(draftStorageKey(normalized));
  writeIndex(readIndex().filter((c) => c !== normalized));
  const current = localStorage.getItem(SCHOOL_REG_CURRENT_CODE_KEY);
  if (current === normalized) localStorage.removeItem(SCHOOL_REG_CURRENT_CODE_KEY);
}

const PENDING_FORM_KEY = "shs-school-reg-pending-form";

export function saveRegistrationPendingSnapshot(payload: {
  form: Record<string, unknown>;
  step: number;
  codeManuallyEdited: boolean;
}) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    PENDING_FORM_KEY,
    JSON.stringify({ version: 1, savedAt: new Date().toISOString(), ...payload }),
  );
}

export function loadRegistrationPendingSnapshot(): {
  form: Record<string, unknown>;
  step: number;
  codeManuallyEdited: boolean;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PENDING_FORM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      form?: Record<string, unknown>;
      step?: number;
      codeManuallyEdited?: boolean;
    };
    if (!parsed.form) return null;
    return {
      form: parsed.form,
      step: typeof parsed.step === "number" ? parsed.step : 0,
      codeManuallyEdited: Boolean(parsed.codeManuallyEdited),
    };
  } catch {
    return null;
  }
}

export function clearRegistrationPendingSnapshot() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_FORM_KEY);
}
