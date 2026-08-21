import { isGujaratiScript, transliterateToGujarati } from "@/lib/gujarati/transliterate-core";
import { studentFullNameGu, type StudentNameLike } from "@/lib/student-names";
import { studentFullName } from "@/lib/certificates/date-to-words";

const RELIGION_GU: Record<string, string> = {
  hindu: "હિન્દુ",
  muslim: "મુસ્લિમ",
  christian: "ખ્રિસ્તી",
  sikh: "શીખ",
  buddhist: "બૌદ્ધ",
  jain: "જૈન",
  parsi: "પારસી",
  other: "અન્ય",
};

const CASTE_GU: Record<string, string> = {
  maratha: "મરાઠા",
  gamit: "ગામીત",
  patel: "પટેલ",
  patil: "પાટીલ",
  pathan: "પઠાણ",
  bagwan: "બાગવાન",
  shekh: "શેખ",
  shaikh: "શેખ",
  sheikh: "શેખ",
  shinde: "શિંદે",
  thakor: "ઠાકોર",
  shah: "શાહ",
  wagh: "વાઘ",
  khatik: "ખાટીક",
  maniyar: "મનિયાર",
  goswami: "ગોસ્વામી",
  gosavi: "ગોસાવી",
  suryavanshi: "સુર્યવંશી",
  kokani: "કોંકણી",
  nayka: "નાયકા",
  naika: "નાયકા",
  mishra: "મિશ્રા",
  purohit: "પુરોહિત",
  saiyed: "સૈયદ",
  syed: "સૈયદ",
  ahire: "આહિરે",
  pinjari: "પિંજારી",
  bedse: "બેડસે",
  khan: "ખાન",
  kunbi: "કુનબી",
  mahar: "મહાર",
  chamar: "ચમાર",
  dhodiya: "ઢોડિયા",
  dhodia: "ઢોડિયા",
  brahmin: "બ્રાહમણ",
  muslim: "મુસ્લિમ",
  god: "ગોડ",
  ahir: "આહિર",
  solanki: "સોલંકી",
  rathod: "રાઠોડ",
  parmar: "પરમાર",
  chauhan: "ચૌહાણ",
  vasava: "વસાવા",
  tadvi: "તડવી",
  bariya: "બારિયા",
  desai: "દેસાઈ",
  mehta: "મહેતા",
  vala: "વાળા",
};

const PLACE_GU: Record<string, string> = {
  tapi: "તાપી",
  songadh: "સોનગઢ",
  "fort-songadh": "ફોર્ટ-સોનગઢ",
  "fort songadh": "ફોર્ટ-સોનગઢ",
  surat: "સુરત",
  navsari: "નવસારી",
  valsad: "વલસાડ",
  dang: "ડાંગ",
  bharuch: "ભરૂચ",
};

const PHRASE_GU: Record<string, string> = {
  "further education": "આગળ અભ્યાસ",
  good: "સારી",
  satisfactory: "સંતોષકારક",
  excellent: "ઉત્તમ",
  average: "સામાન્ય",
  fair: "સાધારણ",
  std: "ધોરણ",
  "std.": "ધોરણ",
  "ta.": "તા.",
  "dist.": "જિ.",
};

function lookup(map: Record<string, string>, raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return map[key] || null;
}

function looksLikeGujarati(text: string): boolean {
  return /[\u0A80-\u0AFF]/.test(text) && !/[A-Za-z]/.test(text) && !/[\u0900-\u097F]/.test(text);
}

function mappedGu(en: string): string | null {
  return lookup(CASTE_GU, en) || lookup(RELIGION_GU, en) || lookup(PLACE_GU, en) || lookup(PHRASE_GU, en);
}

function safeTransliterate(en: string): string {
  const mapped = mappedGu(en);
  if (mapped) return mapped;
  const gu = transliterateToGujarati(en.toLowerCase());
  return looksLikeGujarati(gu) ? gu : "";
}

/** Prefer stored Gujarati; else map known English; else transliterate. Never show mixed-script junk. */
export function lcGuText(en?: string | null, gu?: string | null): string {
  const stored = String(gu || "").trim();
  if (stored && looksLikeGujarati(stored)) return stored;
  if (stored && isGujaratiScript(stored) && !/[A-Za-z]/.test(stored)) return stored;

  const raw = String(en || "").trim();
  if (!raw) return "";
  if (looksLikeGujarati(raw)) return raw;

  const phrase = mappedGu(raw);
  if (phrase) return phrase;

  return raw
    .split(/(\s+|\/|,)/g)
    .map((part) => {
      if (!part.trim() || /^[\s/,]+$/.test(part)) return part;
      return safeTransliterate(part) || part;
    })
    .join("");
}

export type LCPrintText = {
  nameEn?: string;
  nameGu?: string;
  religionCasteEn?: string;
  religionCasteGu?: string;
  motherEn?: string;
  motherGu?: string;
  birthPlaceEn?: string;
  birthPlaceGu?: string;
  lastSchoolEn?: string;
  lastSchoolGu?: string;
  reasonGu?: string;
  progressGu?: string;
  conductGu?: string;
  remarksGu?: string;
};

export function lcPrinted(override: string | undefined, fallback: string): string {
  return typeof override === "string" ? override : fallback;
}

export function lcNameEn(s: {
  firstName: string;
  middleName?: string | null;
  surname: string;
}): string {
  return studentFullName(s);
}

export function lcNameGu(s: StudentNameLike & { firstName: string; surname: string }): string {
  return studentFullNameGu(s) || lcGuText(studentFullName(s));
}

export function lcMotherEn(s: { motherName?: string | null }): string {
  return String(s.motherName || "").trim();
}

export function lcMotherGu(s: StudentNameLike): string {
  return lcGuText(s.motherName, s.motherNameGu);
}

export function lcReligionCasteEn(s: { religion?: string | null; caste?: string | null }): string {
  return [s.religion, s.caste].filter(Boolean).join(" / ");
}

export function lcReligionCasteGu(s: { religion?: string | null; caste?: string | null }): string {
  const rel = lcGuText(s.religion);
  const caste = lcGuText(s.caste);
  return [rel, caste].filter(Boolean).join(" / ");
}

export function lcBirthPlaceEn(s: {
  currentCity?: string | null;
  birthTaluka?: string | null;
  currentDistrict?: string | null;
}): string {
  return [
    s.currentCity,
    s.birthTaluka ? `Ta. ${s.birthTaluka}` : null,
    s.currentDistrict ? `Dist. ${s.currentDistrict}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export function lcPlaceGu(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => String(p || "").trim())
    .filter(Boolean)
    .map((p) => lcGuText(p))
    .join(", ");
}

export function lcBirthPlaceGu(s: {
  currentCity?: string | null;
  birthTaluka?: string | null;
  currentDistrict?: string | null;
}): string {
  return lcPlaceGu([
    s.currentCity,
    s.birthTaluka ? `Ta. ${s.birthTaluka}` : null,
    s.currentDistrict ? `Dist. ${s.currentDistrict}` : null,
  ]);
}
