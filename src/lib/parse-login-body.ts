import { NextRequest } from "next/server";
import { AuthError } from "@/lib/auth";

export type LoginPayload = {
  email: string;
  password: string;
  captchaToken: string;
  captchaAnswer: string;
};

function pickEmail(source: Record<string, unknown>): string {
  const value =
    source.email ??
    source.username ??
    source.login ??
    source.user ??
    source.mobile ??
    "";
  return String(value).trim().toLowerCase();
}

function pickPassword(source: Record<string, unknown>): string {
  return String(source.password ?? source.pass ?? "").trim();
}

function pickCaptcha(source: Record<string, unknown>) {
  return {
    captchaToken: String(source.captchaToken ?? source.captcha_token ?? "").trim(),
    captchaAnswer: String(source.captchaAnswer ?? source.captcha ?? source.captcha_code ?? "")
      .trim()
      .toUpperCase(),
  };
}

function fromRecord(source: Record<string, unknown>): LoginPayload {
  const captcha = pickCaptcha(source);
  return {
    email: pickEmail(source),
    password: pickPassword(source),
    ...captcha,
  };
}

function fromUrlEncoded(text: string): LoginPayload {
  const params = new URLSearchParams(text);
  const record: Record<string, unknown> = {};
  params.forEach((v, k) => {
    record[k] = v;
  });
  return fromRecord(record);
}

function fromJsonText(text: string): LoginPayload {
  const body = JSON.parse(text) as Record<string, unknown>;
  if (Array.isArray(body)) {
    throw new AuthError("Invalid JSON body", 400);
  }
  return fromRecord(body);
}

export async function parseLoginPayload(request: NextRequest): Promise<LoginPayload> {
  const contentType = (request.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const record: Record<string, unknown> = {};
    form.forEach((value, key) => {
      record[key] = typeof value === "string" ? value : value.name;
    });
    return fromRecord(record);
  }

  const text = (await request.text()).trim();
  if (!text) {
    throw new AuthError("Email aur password required", 400);
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    (!text.startsWith("{") && !text.startsWith("[") && text.includes("="))
  ) {
    return fromUrlEncoded(text);
  }

  try {
    return fromJsonText(text);
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Invalid request body", 400);
  }
}

/** @deprecated use parseLoginPayload */
export async function parseLoginCredentials(request: NextRequest) {
  const p = await parseLoginPayload(request);
  return { email: p.email, password: p.password };
}
