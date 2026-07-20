import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getAuthSecret } from "@/lib/env-auth";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CAPTCHA_LENGTH = 5;
const CAPTCHA_TTL_MS = 5 * 60 * 1000;

export type CaptchaChallenge = {
  captchaToken: string;
  imageSvg: string;
  expiresIn: number;
};

type CaptchaPayload = {
  id: string;
  code: string;
  exp: number;
};

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64url");
}

function fromBase64Url(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

function signPayload(payload: CaptchaPayload): string {
  const data = toBase64Url(Buffer.from(JSON.stringify(payload)));
  const sig = createHmac("sha256", getAuthSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function parseToken(token: string): CaptchaPayload | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expected = createHmac("sha256", getAuthSecret()).update(data).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return JSON.parse(fromBase64Url(data).toString("utf8")) as CaptchaPayload;
  } catch {
    return null;
  }
}

function randomCode(): string {
  const bytes = randomBytes(CAPTCHA_LENGTH);
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** SVG captcha — readable, with light noise (server-generated, not client dummy) */
function buildCaptchaSvg(code: string): string {
  const w = 200;
  const h = 56;
  const chars = code.split("");
  const charWidth = w / (chars.length + 1);

  const letters = chars
    .map((ch, i) => {
      const x = charWidth * (i + 1);
      const y = 36 + (randomBytes(1)[0]! % 7) - 3;
      const rotate = (randomBytes(1)[0]! % 17) - 8;
      const fill = i % 2 === 0 ? "#0c1222" : "#0f766e";
      return `<text x="${x.toFixed(1)}" y="${y}" fill="${fill}" font-family="Georgia, serif" font-size="26" font-weight="700" letter-spacing="2" transform="rotate(${rotate} ${x} ${y})" text-anchor="middle">${escapeXml(ch)}</text>`;
    })
    .join("");

  const noise = Array.from({ length: 4 }, () => {
    const x1 = randomBytes(1)[0]! % w;
    const y1 = randomBytes(1)[0]! % h;
    const x2 = randomBytes(1)[0]! % w;
    const y2 = randomBytes(1)[0]! % h;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#cbd5e1" stroke-width="1" opacity="0.7"/>`;
  }).join("");

  const dots = Array.from({ length: 18 }, () => {
    const cx = randomBytes(1)[0]! % w;
    const cy = randomBytes(1)[0]! % h;
    return `<circle cx="${cx}" cy="${cy}" r="1" fill="#94a3b8" opacity="0.35"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Security code">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#f1f5f9"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="10" fill="url(#bg)" stroke="#e2e8f0" stroke-width="1"/>
  ${noise}
  ${dots}
  ${letters}
</svg>`;
}

export function createCaptchaChallenge(): CaptchaChallenge {
  const code = randomCode();
  const payload: CaptchaPayload = {
    id: randomBytes(12).toString("hex"),
    code,
    exp: Date.now() + CAPTCHA_TTL_MS,
  };
  return {
    captchaToken: signPayload(payload),
    imageSvg: buildCaptchaSvg(code),
    expiresIn: Math.floor(CAPTCHA_TTL_MS / 1000),
  };
}

export function verifyCaptchaAnswer(token: string, answer: string): boolean {
  if (!token || !answer?.trim()) return false;
  const payload = parseToken(token);
  if (!payload || payload.exp < Date.now()) return false;
  const normalized = answer.trim().toUpperCase().replace(/\s/g, "");
  if (normalized.length !== CAPTCHA_LENGTH) return false;
  const expected = payload.code.toUpperCase();
  const a = Buffer.from(normalized);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
