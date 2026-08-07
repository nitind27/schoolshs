/** Landing page expert popup — validation (client + API). */

export const LEAD_LIMITS = {
  name: { min: 2, max: 80 },
  email: { max: 180 },
  phone: { minDigits: 10, maxDigits: 15 },
  instituteName: { min: 2, max: 120 },
} as const;

export const LEAD_ROLE_OPTIONS = [
  "school_admin",
  "teacher",
  "clerk",
  "ca",
  "student",
  "other",
] as const;

export type LeadRoleType = (typeof LEAD_ROLE_OPTIONS)[number];

export type LeadField = "name" | "email" | "phone" | "instituteName" | "roleType";

export type LeadFormInput = {
  name: string;
  email: string;
  phone: string;
  instituteName: string;
  roleType: string;
};

export type LeadFieldErrors = Partial<Record<LeadField, string>>;

export type LeadErrorCode =
  | "name_required"
  | "name_min"
  | "name_max"
  | "name_invalid"
  | "email_required"
  | "email_invalid"
  | "email_max"
  | "phone_required"
  | "phone_invalid"
  | "institute_required"
  | "institute_min"
  | "institute_max"
  | "role_required"
  | "role_invalid";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’\-]{0,}$/u;

function clean(s: unknown, max: number) {
  let v = String(s ?? "").trim().replace(/\s+/g, " ");
  if (v.length > max) v = v.slice(0, max);
  return v;
}

function phoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function normalizeLeadForm(raw: Partial<LeadFormInput>): LeadFormInput {
  return {
    name: clean(raw.name, LEAD_LIMITS.name.max),
    email: clean(raw.email, LEAD_LIMITS.email.max).toLowerCase(),
    phone: String(raw.phone ?? "").trim(),
    instituteName: clean(raw.instituteName, LEAD_LIMITS.instituteName.max),
    roleType: String(raw.roleType ?? "").trim().toLowerCase(),
  };
}

export function validateLeadForm(raw: Partial<LeadFormInput>): {
  ok: boolean;
  data: LeadFormInput;
  errors: LeadFieldErrors;
  codes: Partial<Record<LeadField, LeadErrorCode>>;
} {
  const data = normalizeLeadForm(raw);
  const errors: LeadFieldErrors = {};
  const codes: Partial<Record<LeadField, LeadErrorCode>> = {};

  const set = (field: LeadField, code: LeadErrorCode, message: string) => {
    if (!errors[field]) {
      errors[field] = message;
      codes[field] = code;
    }
  };

  if (!data.name) {
    set("name", "name_required", "Please enter your name");
  } else if (data.name.length < LEAD_LIMITS.name.min) {
    set("name", "name_min", `Name must be at least ${LEAD_LIMITS.name.min} characters`);
  } else if (data.name.length > LEAD_LIMITS.name.max) {
    set("name", "name_max", `Name must be at most ${LEAD_LIMITS.name.max} characters`);
  } else if (!NAME_RE.test(data.name)) {
    set("name", "name_invalid", "Name can only contain letters, spaces, and . ' -");
  }

  if (!data.email) {
    set("email", "email_required", "Please enter your email");
  } else if (data.email.length > LEAD_LIMITS.email.max) {
    set("email", "email_max", `Email must be at most ${LEAD_LIMITS.email.max} characters`);
  } else if (!EMAIL_RE.test(data.email)) {
    set("email", "email_invalid", "Please enter a valid email address");
  }

  const digits = phoneDigits(data.phone);
  if (!digits) {
    set("phone", "phone_required", "Please enter your contact number");
  } else if (
    digits.length < LEAD_LIMITS.phone.minDigits ||
    digits.length > LEAD_LIMITS.phone.maxDigits
  ) {
    set(
      "phone",
      "phone_invalid",
      `Phone must have ${LEAD_LIMITS.phone.minDigits}–${LEAD_LIMITS.phone.maxDigits} digits`
    );
  }

  if (!data.instituteName) {
    set("instituteName", "institute_required", "Please enter institute / school name");
  } else if (data.instituteName.length < LEAD_LIMITS.instituteName.min) {
    set(
      "instituteName",
      "institute_min",
      `Institute name must be at least ${LEAD_LIMITS.instituteName.min} characters`
    );
  } else if (data.instituteName.length > LEAD_LIMITS.instituteName.max) {
    set(
      "instituteName",
      "institute_max",
      `Institute name must be at most ${LEAD_LIMITS.instituteName.max} characters`
    );
  }

  if (!data.roleType) {
    set("roleType", "role_required", "Please select your role");
  } else if (!LEAD_ROLE_OPTIONS.includes(data.roleType as LeadRoleType)) {
    set("roleType", "role_invalid", "Please select a valid role");
  }

  return {
    ok: Object.keys(errors).length === 0,
    data: { ...data, phone: digits || data.phone },
    errors,
    codes,
  };
}
