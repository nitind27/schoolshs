/** Normalize Indian / international mobile to WhatsApp JID digits (no +). */
export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) digits = `91${digits.slice(1)}`;
  if (digits.length < 11 || digits.length > 15) return null;
  return digits;
}

export function phoneToWhatsAppJid(phoneDigits: string): string {
  return `${phoneDigits.replace(/\D/g, "")}@s.whatsapp.net`;
}
