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

function draftStorageKey(code: string) {
  const normalized = code.trim().toUpperCase().replace(/\s/g, "");
  return `${DRAFT_PREFIX}${normalized || PENDING_CODE}`;
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

export function loadLatestSchoolRegistrationDraft(): {
  code: string;
  draft: SchoolRegistrationDraft;
} | null {
  if (typeof window === "undefined") return null;
  const index = readIndex().filter((c) => c !== PENDING_CODE);
  for (const code of index) {
    const draft = loadSchoolRegistrationDraft(code);
    if (draft) return { code, draft };
  }
  return null;
}

/** Codes that have a saved draft in this browser (for hints) */
export function listSchoolRegistrationDraftCodes(): string[] {
  return readIndex().filter((c) => c !== PENDING_CODE && loadSchoolRegistrationDraft(c));
}

export function saveSchoolRegistrationDraft(params: {
  code: string;
  previousCode?: string;
  step: number;
  codeManuallyEdited: boolean;
  form: Record<string, unknown>;
}): string | null {
  if (typeof window === "undefined") return null;

  const normalized = params.code.trim().toUpperCase().replace(/\s/g, "");
  if (!normalized || normalized.length < 3) return null;

  const storageCode = normalized;
  const prev = (params.previousCode || "").trim().toUpperCase().replace(/\s/g, "") || "";

  const payload: SchoolRegistrationDraft = {
    version: 1,
    savedAt: new Date().toISOString(),
    step: params.step,
    codeManuallyEdited: params.codeManuallyEdited,
    form: params.form,
  };

  localStorage.setItem(draftStorageKey(storageCode), JSON.stringify(payload));
  localStorage.setItem(SCHOOL_REG_CURRENT_CODE_KEY, storageCode);

  const index = readIndex().filter((c) => c !== PENDING_CODE && c !== prev);
  if (!index.includes(storageCode)) index.unshift(storageCode);
  writeIndex(index);

  if (prev && prev !== storageCode && prev !== PENDING_CODE) {
    localStorage.removeItem(draftStorageKey(prev));
    writeIndex(readIndex().filter((c) => c !== prev));
  }

  return storageCode;
}

export function clearSchoolRegistrationDraft(code: string) {
  if (typeof window === "undefined") return;
  const normalized = code.trim().toUpperCase().replace(/\s/g, "") || PENDING_CODE;
  localStorage.removeItem(draftStorageKey(normalized));
  writeIndex(readIndex().filter((c) => c !== normalized));
  const current = localStorage.getItem(SCHOOL_REG_CURRENT_CODE_KEY);
  if (current === normalized) localStorage.removeItem(SCHOOL_REG_CURRENT_CODE_KEY);
}

const PENDING_FORM_KEY = "shs-school-reg-pending-form";

/** Fields filled before a school code exists — merged when code is set */
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
