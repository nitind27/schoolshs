import type { SsgujaratFetchResult } from "./types";
import { detectSsgujaratSearchType, normalizeSsgSearchId } from "./id-utils";
import { fetchSsgujaratByAadhaar } from "./fetch-by-aadhaar";
import { fetchSsgujaratByChildUid } from "./fetch-by-child-uid";
import { SSG_MSG } from "./message-codes";

export { detectSsgujaratSearchType, normalizeSsgSearchId, describeSsgSearchType } from "./id-utils";

/** 12-digit Aadhaar → search list · 18-digit Child UID → full profile report */
export async function fetchSsgujaratById(id: string): Promise<SsgujaratFetchResult> {
  const searchType = detectSsgujaratSearchType(id);
  const clean = normalizeSsgSearchId(id);

  if (!searchType) {
    throw new Error(SSG_MSG.INVALID_SEARCH_ID);
  }

  if (searchType === "aadhaar") {
    const result = await fetchSsgujaratByAadhaar(clean);
    return { ...result, searchType: "aadhaar", searchId: clean };
  }

  return fetchSsgujaratByChildUid(clean);
}
