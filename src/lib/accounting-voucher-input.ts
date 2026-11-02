import { VOUCHER_TYPES } from "@/lib/accounting";

export const ALLOWED_VOUCHER_TYPES = new Set<string>(VOUCHER_TYPES.map((v) => v.value));

export type VoucherLineInput = {
  accountId?: string;
  debit?: number;
  credit?: number;
  description?: string;
};

export type NormalizedVoucherLine = {
  accountId: string;
  debit: number;
  credit: number;
  description: string | null;
};

export type VoucherBody = {
  voucherType?: string;
  voucherDate?: string;
  narration?: string;
  referenceNo?: string;
  partyName?: string;
  paymentMode?: string;
  chequeNo?: string;
  bankName?: string;
  billNo?: string;
  billDate?: string;
  gstin?: string;
  lines?: VoucherLineInput[];
};

export type ParsedVoucherInput = {
  voucherType: string;
  voucherDate: Date;
  narration: string;
  referenceNo: string | null;
  partyName: string | null;
  paymentMode: string | null;
  chequeNo: string | null;
  bankName: string | null;
  billNo: string | null;
  billDate: Date | null;
  gstin: string | null;
  lines: NormalizedVoucherLine[];
  totalAmount: number;
};

export function parseVoucherInput(
  body: VoucherBody,
  options?: { requireType?: boolean },
): { ok: true; value: ParsedVoucherInput } | { ok: false; error: string } {
  const requireType = options?.requireType !== false;
  const voucherType = String(body.voucherType || "").trim();
  if (requireType && (!voucherType || !ALLOWED_VOUCHER_TYPES.has(voucherType))) {
    return { ok: false, error: "Valid voucher type required (receipt/payment/journal/contra)" };
  }
  if (voucherType && !ALLOWED_VOUCHER_TYPES.has(voucherType)) {
    return { ok: false, error: "Valid voucher type required (receipt/payment/journal/contra)" };
  }

  if (!body.voucherDate || !/^\d{4}-\d{2}-\d{2}/.test(String(body.voucherDate))) {
    return { ok: false, error: "Valid voucher date required" };
  }
  const voucherDate = new Date(body.voucherDate);
  if (Number.isNaN(voucherDate.getTime())) {
    return { ok: false, error: "Invalid voucher date" };
  }

  if (!Array.isArray(body.lines) || body.lines.length < 2) {
    return { ok: false, error: "Minimum 2 ledger entries required (double entry)" };
  }

  const lines: NormalizedVoucherLine[] = [];
  for (const raw of body.lines) {
    const accountId = String(raw.accountId || "").trim();
    const debit = Math.round((Number(raw.debit) || 0) * 100) / 100;
    const credit = Math.round((Number(raw.credit) || 0) * 100) / 100;
    if (!accountId) return { ok: false, error: "Every line must have an account" };
    if (debit < 0 || credit < 0) return { ok: false, error: "Debit/Credit cannot be negative" };
    if (debit > 0 && credit > 0) {
      return { ok: false, error: "A line cannot have both debit and credit" };
    }
    if (debit === 0 && credit === 0) {
      return { ok: false, error: "Each line must have either debit or credit amount" };
    }
    lines.push({
      accountId,
      debit,
      credit,
      description: raw.description?.trim() || null,
    });
  }

  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return { ok: false, error: "Debit and Credit must be equal" };
  }
  if (totalDebit <= 0) {
    return { ok: false, error: "Voucher amount must be greater than zero" };
  }

  let billDate: Date | null = null;
  if (body.billDate) {
    const parsed = new Date(body.billDate);
    if (!Number.isNaN(parsed.getTime())) billDate = parsed;
  }

  return {
    ok: true,
    value: {
      voucherType,
      voucherDate,
      narration: String(body.narration || "").trim(),
      referenceNo: body.referenceNo?.trim() || null,
      partyName: body.partyName?.trim() || null,
      paymentMode: body.paymentMode || null,
      chequeNo: body.chequeNo?.trim() || null,
      bankName: body.bankName?.trim() || null,
      billNo: body.billNo?.trim() || null,
      billDate,
      gstin: body.gstin?.trim() || null,
      lines,
      totalAmount: totalDebit,
    },
  };
}

export function voucherDateInFy(
  voucherDate: Date,
  fy: { label: string; startDate: Date; endDate: Date },
): string | null {
  const fyStart = new Date(fy.startDate);
  const fyEnd = new Date(fy.endDate);
  fyEnd.setHours(23, 59, 59, 999);
  if (voucherDate < fyStart || voucherDate > fyEnd) {
    return `Voucher date must be within FY ${fy.label} (${fyStart.toISOString().slice(0, 10)} → ${fyEnd.toISOString().slice(0, 10)})`;
  }
  return null;
}
