/**
 * SSC (Class 10) — backwards-compatible exports
 */
import { fetchGsebResult, normalizeGsebSeat, parseSeatForStandard, parseSeatInput } from "./fetch-gseb";
import type { GsebResult } from "./gseb-shared";

export type GsebSscResult = GsebResult;

export { parseSeatInput, parseSeatForStandard, normalizeGsebSeat };

export async function fetchGsebSscResult(prefix: string, seatNumber: string): Promise<GsebSscResult> {
  return fetchGsebResult("10", prefix, seatNumber);
}
