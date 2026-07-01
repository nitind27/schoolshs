/** SMS body se Digital Gujarat / Sandes / Google OTP nikaalo */
export function extractOtpFromSms(text: string): string | null {
  const trimmed = text.trim();
  if (/^\d{4,8}$/.test(trimmed)) return trimmed;

  const patterns = [
    /^(\d{4,8})\s+is your\b/i,
    /\b(\d{4,8})\s+is your\s+(?:google\s+)?verification\s+code\b/i,
    /\bverification\s+code[\s:.-]*(\d{4,8})\b/i,
    /\bOTP[\s:.-]*(?:is|no\.?|number|code)?[\s:.-]*(\d{4,8})\b/i,
    /\b(?:code|pin)[\s:.-]*(\d{4,8})\b/i,
    /\b(\d{6})\b.*(?:otp|sandes|digitalgujarat|dg|verification)/i,
    /(?:otp|sandes|digitalgujarat|dg).*?\b(\d{6})\b/i,
    /\b(\d{6})\b/,
    /\b(\d{4,8})\b/,
  ];

  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m?.[1] && /^\d{4,8}$/.test(m[1])) return m[1];
  }
  return null;
}

export function isLikelyDgOtpSms(text: string, sender?: string | null): boolean {
  const lower = text.toLowerCase();
  const from = (sender || "").toLowerCase();
  return (
    lower.includes("otp") ||
    lower.includes("sandes") ||
    lower.includes("digitalgujarat") ||
    lower.includes("digital gujarat") ||
    from.includes("dg") ||
    from.includes("sandes") ||
    /\b\d{6}\b/.test(text)
  );
}
