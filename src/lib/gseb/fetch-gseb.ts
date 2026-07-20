/**
 * Unified GSEB fetch — SSC (Class 10) and HSC (Class 12)
 */
import {
  parseResultHtml,
  postGsebForm,
  type GsebResult,
} from "./gseb-shared";

export type { GsebResult };

const SSC_PREFIXES = ["A", "B", "C", "S", "P"];
const HSC_PREFIXES = ["B", "E", "G", "P", "A", "C", "T", "H", "D", "S"];

export function normalizeGsebSeat(
  standard: "10" | "12",
  prefix: string,
  number: string,
): { prefix: string; number: string } | null {
  const p = (prefix || (standard === "12" ? "B" : "A")).trim().toUpperCase();
  const digits = number.replace(/\D/g, "");
  const allowed = standard === "12" ? HSC_PREFIXES : SSC_PREFIXES;
  const len = standard === "12" ? 6 : 7;
  if (!allowed.includes(p)) return null;
  if (digits.length !== len) return null;
  return { prefix: p, number: digits };
}

export function parseSeatForStandard(
  input: string,
  standard: "10" | "12",
): { prefix: string; number: string } | null {
  const v = input.trim().toUpperCase().replace(/\s/g, "");
  const len = standard === "12" ? 6 : 7;
  const prefixes = standard === "12" ? HSC_PREFIXES.join("") : SSC_PREFIXES.join("");
  const m = v.match(new RegExp(`^([${prefixes}])(\\d{${len}})$`));
  if (m) return { prefix: m[1], number: m[2] };
  if (new RegExp(`^\\d{${len}}$`).test(v)) {
    return { prefix: standard === "12" ? "B" : "A", number: v };
  }
  return null;
}

/** SSC legacy 7-digit seat parser */
export function parseSeatInput(input: string): { prefix: string; number: string } | null {
  return parseSeatForStandard(input, "10");
}

export async function fetchGsebResult(
  standard: "10" | "12",
  prefix: string,
  seatNumber: string,
): Promise<GsebResult> {
  const seat = normalizeGsebSeat(standard, prefix, seatNumber);
  if (!seat) {
    const len = standard === "12" ? 6 : 7;
    throw new Error(`Invalid GSEB seat — Class ${standard} needs ${len}-digit seat with valid prefix`);
  }

  const isSsc = standard === "10";
  const pageUrl = isSsc ? "https://result.gseb.org/" : "https://result.gseb.org/Result/HSCPurak";
  const postUrl = isSsc
    ? "https://result.gseb.org/Result/SSCResultViewPurak"
    : "https://result.gseb.org/Result/ResultViewHSCPurak";

  const resultHtml = await postGsebForm({
    pageUrl,
    postUrl,
    prefix: seat.prefix,
    seatNumber: seat.number,
    digitLen: isSsc ? 7 : 6,
  });

  const parsed = parseResultHtml(resultHtml);
  return {
    seatNo: `${seat.prefix}${seat.number}`,
    prefix: seat.prefix,
    number: seat.number,
    ...parsed,
    rawHtml: resultHtml.slice(0, 50000),
  };
}
