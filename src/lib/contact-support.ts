/** Shared Contact Support form limits + validation (client + API). */

export const CONTACT_LIMITS = {
  name: { min: 2, max: 80 },
  email: { max: 180 },
  phone: { minDigits: 10, maxDigits: 15 },
  schoolCode: { min: 2, max: 20 },
  subject: { min: 5, max: 120 },
  message: { min: 20, max: 2000 },
} as const;

export type ContactField =
  | "name"
  | "email"
  | "phone"
  | "schoolCode"
  | "subject"
  | "message";

export type ContactFormInput = {
  name: string;
  email: string;
  phone: string;
  schoolCode: string;
  subject: string;
  message: string;
};

export type ContactFieldErrors = Partial<Record<ContactField, string>>;

/** Machine codes — map to i18n on the client; API may return English fallback. */
export type ContactErrorCode =
  | "name_required"
  | "name_min"
  | "name_max"
  | "name_invalid"
  | "email_required"
  | "email_invalid"
  | "email_max"
  | "phone_invalid"
  | "schoolCode_invalid"
  | "schoolCode_max"
  | "subject_required"
  | "subject_min"
  | "subject_max"
  | "message_required"
  | "message_min"
  | "message_max";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’\-]{0,}$/u;
const SCHOOL_CODE_RE = /^[A-Z0-9][A-Z0-9_-]*$/i;

export function cleanContactText(s: unknown, max: number, collapseSpaces = true) {
  let v = String(s ?? "").trim();
  if (collapseSpaces) v = v.replace(/\s+/g, " ");
  if (v.length > max) v = v.slice(0, max);
  return v;
}

function phoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function normalizeContactForm(raw: Partial<ContactFormInput>): ContactFormInput {
  return {
    name: cleanContactText(raw.name, CONTACT_LIMITS.name.max),
    email: cleanContactText(raw.email, CONTACT_LIMITS.email.max).toLowerCase(),
    phone: cleanContactText(raw.phone, 20, false),
    schoolCode: cleanContactText(raw.schoolCode, CONTACT_LIMITS.schoolCode.max).toUpperCase(),
    subject: cleanContactText(raw.subject, CONTACT_LIMITS.subject.max),
    message: cleanContactText(raw.message, CONTACT_LIMITS.message.max, false).replace(/\r\n/g, "\n"),
  };
}

export function validateContactForm(raw: Partial<ContactFormInput>): {
  ok: boolean;
  data: ContactFormInput;
  errors: ContactFieldErrors;
  codes: Partial<Record<ContactField, ContactErrorCode>>;
} {
  const data = normalizeContactForm(raw);
  const errors: ContactFieldErrors = {};
  const codes: Partial<Record<ContactField, ContactErrorCode>> = {};

  const set = (field: ContactField, code: ContactErrorCode, message: string) => {
    if (!errors[field]) {
      errors[field] = message;
      codes[field] = code;
    }
  };

  if (!data.name) {
    set("name", "name_required", "Please enter your full name");
  } else if (data.name.length < CONTACT_LIMITS.name.min) {
    set("name", "name_min", `Name must be at least ${CONTACT_LIMITS.name.min} characters`);
  } else if (data.name.length > CONTACT_LIMITS.name.max) {
    set("name", "name_max", `Name must be at most ${CONTACT_LIMITS.name.max} characters`);
  } else if (!NAME_RE.test(data.name)) {
    set("name", "name_invalid", "Name can only contain letters, spaces, and . ' -");
  }

  if (!data.email) {
    set("email", "email_required", "Please enter your email");
  } else if (data.email.length > CONTACT_LIMITS.email.max) {
    set("email", "email_max", `Email must be at most ${CONTACT_LIMITS.email.max} characters`);
  } else if (!EMAIL_RE.test(data.email)) {
    set("email", "email_invalid", "Please enter a valid email address");
  }

  if (data.phone) {
    const digits = phoneDigits(data.phone);
    if (
      digits.length < CONTACT_LIMITS.phone.minDigits ||
      digits.length > CONTACT_LIMITS.phone.maxDigits
    ) {
      set(
        "phone",
        "phone_invalid",
        `Phone must have ${CONTACT_LIMITS.phone.minDigits}–${CONTACT_LIMITS.phone.maxDigits} digits`
      );
    }
  }

  if (data.schoolCode) {
    if (data.schoolCode.length < CONTACT_LIMITS.schoolCode.min) {
      set(
        "schoolCode",
        "schoolCode_invalid",
        `School code must be at least ${CONTACT_LIMITS.schoolCode.min} characters`
      );
    } else if (!SCHOOL_CODE_RE.test(data.schoolCode)) {
      set("schoolCode", "schoolCode_invalid", "School code: letters, numbers, _ or - only");
    }
  }

  if (!data.subject) {
    set("subject", "subject_required", "Please enter a subject");
  } else if (data.subject.length < CONTACT_LIMITS.subject.min) {
    set(
      "subject",
      "subject_min",
      `Subject must be at least ${CONTACT_LIMITS.subject.min} characters`
    );
  } else if (data.subject.length > CONTACT_LIMITS.subject.max) {
    set(
      "subject",
      "subject_max",
      `Subject must be at most ${CONTACT_LIMITS.subject.max} characters`
    );
  }

  if (!data.message) {
    set("message", "message_required", "Please enter your message");
  } else if (data.message.trim().length < CONTACT_LIMITS.message.min) {
    set(
      "message",
      "message_min",
      `Message must be at least ${CONTACT_LIMITS.message.min} characters`
    );
  } else if (data.message.length > CONTACT_LIMITS.message.max) {
    set(
      "message",
      "message_max",
      `Message must be at most ${CONTACT_LIMITS.message.max} characters`
    );
  }

  // Normalize phone to digits-only for storage when valid
  const phoneOut = data.phone && !errors.phone ? phoneDigits(data.phone) : data.phone || "";

  return {
    ok: Object.keys(errors).length === 0,
    data: {
      ...data,
      phone: phoneOut,
      schoolCode: data.schoolCode || "",
    },
    errors,
    codes,
  };
}
