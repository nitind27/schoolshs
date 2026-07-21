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
  const current = localStorage.getItem(SCHOOL_REG_CURRENT_CODE_KEY)?.trim().toUpperCase();
  if (current) {
    const draft = loadSchoolRegistrationDraft(current);
    if (draft) return { code: current, draft };
  }
  const index = readIndex();
  for (const code of index) {
    const draft = loadSchoolRegistrationDraft(code);
    if (draft) return { code, draft };
  }
  return null;
}

export function saveSchoolRegistrationDraft(params: {
  code: string;
  previousCode?: string;
  step: number;
  codeManuallyEdited: boolean;
  form: Record<string, unknown>;
}): string {
  if (typeof window === "undefined") return params.code;

  const normalized = params.code.trim().toUpperCase().replace(/\s/g, "");
  const storageCode = normalized || PENDING_CODE;
  const prev = (params.previousCode || "").trim().toUpperCase().replace(/\s/g, "") || PENDING_CODE;

  const payload: SchoolRegistrationDraft = {
    version: 1,
    savedAt: new Date().toISOString(),
    step: params.step,
    codeManuallyEdited: params.codeManuallyEdited,
    form: params.form,
  };

  localStorage.setItem(draftStorageKey(storageCode), JSON.stringify(payload));
  localStorage.setItem(SCHOOL_REG_CURRENT_CODE_KEY, storageCode);

  const index = readIndex().filter((c) => c !== prev || prev === storageCode);
  if (!index.includes(storageCode)) index.unshift(storageCode);
  writeIndex(index);

  if (prev !== storageCode) {
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
