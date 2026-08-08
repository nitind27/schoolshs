/**
 * Default official letterhead payloads keyed by school code.
 * Used when a school has never saved letterheadJson yet.
 */

export type LetterheadDocumentState = {
  headerTop?: string;
  schoolName?: string;
  leftTitle?: string;
  leftName?: string;
  leftMobile?: string;
  centerTitle?: string;
  centerAddress?: string;
  rightTitle?: string;
  rightName?: string;
  rightMobile?: string;
  footerLeft?: string;
  footerCenter?: string;
  footerRight?: string;
  serialNo?: string;
  dateDay?: string;
  dateMonth?: string;
  dateYear?: string;
  pageContents?: string[];
  pageCount?: number;
  logo?: string | null;
  stamps?: unknown[];
};

/** Joint Songadh Primary letterhead (403 + 404 on one pad) — from official scan */
export const SONGADH_PRIMARY_LETTERHEAD: LetterheadDocumentState = {
  headerTop: "સાર્વજનિક એજ્યુકેશન સોસાયટી સોનગઢ, સંચાલિત",
  schoolName: "સાર્વજનિક હાઈસ્કુલ ફોર્ટ-સોનગઢ",
  leftTitle: "આચાર્યશ્રી (નોન ગ્રાન્ટેડ)",
  leftName: "શ્રીમતિ વૈશાલીબેન એમ. ગામીત",
  leftMobile: "Mo. 9979278886",
  centerTitle: "પ્રાથમિક વિભાગ (ગ્રાન્ટેડ અને નોનગ્રાન્ટેડ)",
  centerAddress: "ફોર્ટ-સોનગઢ, જી. તાપી",
  rightTitle: "આચાર્યશ્રી (ગ્રાન્ટેડ)",
  rightName: "શ્રી એન. આર. ગામીત",
  rightMobile: "Mo. 9426539035",
  footerLeft: "શાળા કોડ : 24261004403",
  footerCenter: "Email : nilesh198333@mail.com",
  footerRight: "શાળા કોડ : 24261004404",
  serialNo: "\u00a0",
  dateDay: "\u00a0",
  dateMonth: "\u00a0",
  dateYear: "\u00a0",
  pageContents: [""],
  pageCount: 1,
  logo: "/shs/logo.png",
  stamps: [],
};

const BY_CODE: Record<string, LetterheadDocumentState> = {
  "24261004403": SONGADH_PRIMARY_LETTERHEAD,
  "24261004404": SONGADH_PRIMARY_LETTERHEAD,
};

export function defaultLetterheadForSchoolCode(
  code: string | null | undefined,
  fallback?: {
    name?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  },
): LetterheadDocumentState {
  const c = (code || "").trim();
  if (c && BY_CODE[c]) {
    return { ...BY_CODE[c], pageContents: [""], stamps: [] };
  }

  const name = (fallback?.name || "સાર્વજનિક શાળા").trim();
  const address = (fallback?.address || "").trim();
  const phone = (fallback?.phone || "").trim();
  const email = (fallback?.email || "").trim();

  return {
    headerTop: "",
    schoolName: name,
    leftTitle: "આચાર્યશ્રી",
    leftName: "",
    leftMobile: phone ? `Mo. ${phone}` : "",
    centerTitle: "",
    centerAddress: address,
    rightTitle: "",
    rightName: "",
    rightMobile: "",
    footerLeft: c ? `શાળા કોડ : ${c}` : "",
    footerCenter: email ? `Email : ${email}` : "",
    footerRight: "",
    serialNo: "\u00a0",
    dateDay: "\u00a0",
    dateMonth: "\u00a0",
    dateYear: "\u00a0",
    pageContents: [""],
    pageCount: 1,
    logo: "/shs/logo.png",
    stamps: [],
  };
}

export function isLetterheadDocumentState(v: unknown): v is LetterheadDocumentState {
  return Boolean(v && typeof v === "object" && !Array.isArray(v));
}
