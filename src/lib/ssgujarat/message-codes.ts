/** Stable codes — map to i18n `ssg.*` on the client (EN/GU). Never return Hindi Hinglish from the scraper. */

export const SSG_MSG = {
  AADHAAR_INVALID: "SSG_AADHAAR_INVALID",
  CHILD_UID_INVALID: "SSG_CHILD_UID_INVALID",
  INVALID_SEARCH_ID: "SSG_INVALID_SEARCH_ID",
  NO_RECORD_AADHAAR: "SSG_NO_RECORD_AADHAAR",
  NO_DATA: "SSG_NO_DATA",
  MULTIPLE_MATCHES: "SSG_MULTIPLE_MATCHES",
  NO_RECORD_CHILD_UID: "SSG_NO_RECORD_CHILD_UID",
  PASTE_TOO_SHORT: "SSG_PASTE_TOO_SHORT",
  PASTE_PARSE_FAILED: "SSG_PASTE_PARSE_FAILED",
  BROWSER_UNAVAILABLE: "SSG_BROWSER_UNAVAILABLE",
} as const;

export type SsgMessageCode = (typeof SSG_MSG)[keyof typeof SSG_MSG];

/** i18n key under `ssg` for each code */
export const SSG_MSG_I18N: Record<SsgMessageCode, string> = {
  SSG_AADHAAR_INVALID: "ssg.aadhaarInvalid",
  SSG_CHILD_UID_INVALID: "ssg.childUidInvalid",
  SSG_INVALID_SEARCH_ID: "ssg.invalidSearchId",
  SSG_NO_RECORD_AADHAAR: "ssg.noRecordAadhaar",
  SSG_NO_DATA: "ssg.noDataHint",
  SSG_MULTIPLE_MATCHES: "ssg.multipleMatches",
  SSG_NO_RECORD_CHILD_UID: "ssg.noRecordChildUid",
  SSG_PASTE_TOO_SHORT: "ssg.pasteTooShort",
  SSG_PASTE_PARSE_FAILED: "ssg.pasteParseFailed",
  SSG_BROWSER_UNAVAILABLE: "ssg.browserUnavailable",
};

export function isSsgMessageCode(value: string): value is SsgMessageCode {
  return value in SSG_MSG_I18N;
}
