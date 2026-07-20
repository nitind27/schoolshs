const GUJ_DIGITS = ["૦", "૧", "૨", "૩", "૪", "૫", "૬", "૭", "૮", "૯"];

const DAY_ORDINAL_GU: Record<number, string> = {
  1: "પહેલી",
  2: "બીજી",
  3: "ત્રીજી",
  4: "ચોથી",
  5: "પાંચમી",
  6: "છઠી",
  7: "સાતમી",
  8: "આઠમી",
  9: "નવમી",
  10: "દસમી",
  11: "અગિયારમી",
  12: "બારમી",
  13: "તેરમી",
  14: "ચૌદમી",
  15: "પંદરમી",
  16: "સોળમી",
  17: "સત્તરમી",
  18: "અઢારમી",
  19: "ઓગણીસમી",
  20: "વીસમી",
  21: "એકવીસમી",
  22: "બાવીસમી",
  23: "ત્રેવીસમી",
  24: "ચોવીસમી",
  25: "પચ્ચીસમી",
  26: "છવ્વીસમી",
  27: "સત્તાવીસમી",
  28: "અઠ્ઠાવીસમી",
  29: "ઓગણત્રીસમી",
  30: "ત્રીસમી",
  31: "એકત્રીસમી",
};

const MONTHS_GU = [
  "જાન્યુઆરી",
  "ફેબ્રુઆરી",
  "માર્ચ",
  "એપ્રિલ",
  "મે",
  "જૂન",
  "જુલાઈ",
  "ઑગસ્ટ",
  "સપ્ટેમ્બર",
  "ઑક્ટોબર",
  "નવેમ્બર",
  "ડિસેમ્બર",
];

const ONES_GU = ["", "એક", "બે", "ત્રણ", "ચાર", "પાંચ", "છ", "સાત", "આઠ", "નવ"];
const TENS_GU = ["", "", "વીસ", "ત્રીસ", "ચાલીસ", "પચાસ", "સાઠ", "સિત્તેર", "એંસી", "નેવું"];
const TEENS_GU = [
  "દસ",
  "અગિયાર",
  "બાર",
  "તેર",
  "ચૌદ",
  "પંદર",
  "સોળ",
  "સત્તર",
  "અઢાર",
  "ઓગણીસ",
];

export function toGujaratiDigits(input: string): string {
  return input.replace(/\d/g, (d) => GUJ_DIGITS[parseInt(d, 10)] ?? d);
}

function parseDateParts(dateStr: string): { d: number; m: number; y: number } | null {
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length < 3) return null;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  return { d, m, y };
}

function numberBelowHundredGu(n: number): string {
  if (n < 10) return ONES_GU[n];
  if (n < 20) return TEENS_GU[n - 10];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${TENS_GU[t]} ${ONES_GU[o]}` : TENS_GU[t];
}

function yearToWordsGu(y: number): string {
  if (y >= 2000 && y < 3000) {
    const rest = y - 2000;
    if (rest === 0) return "બે હજાર";
    return `બે હજાર ${numberBelowHundredGu(rest)}`.trim();
  }
  if (y >= 1900 && y < 2000) {
    const rest = y - 1900;
    if (rest === 0) return "ઓગણીસ સો";
    return `ઓગણીસ સો ${numberBelowHundredGu(rest)}`.trim();
  }
  return toGujaratiDigits(String(y));
}

/** DD-MM-YYYY in Gujarati digits */
export function formatDobFigures(dateStr: string): string {
  const p = parseDateParts(dateStr);
  if (!p) return dateStr;
  const dd = String(p.d).padStart(2, "0");
  const mm = String(p.m).padStart(2, "0");
  return `${dd}-${mm}-${p.y}`;
}

export function formatDobFiguresGu(dateStr: string): string {
  return toGujaratiDigits(formatDobFigures(dateStr));
}

/** Register-style Gujarati DOB words e.g. સત્તાવીસમી સપ્ટેમ્બર બે હજાર બાર */
export function dateToWordsGuRegister(dateStr: string): string {
  const p = parseDateParts(dateStr);
  if (!p) return "";
  const dayWord = DAY_ORDINAL_GU[p.d] || `${toGujaratiDigits(String(p.d))}મી`;
  const monthWord = MONTHS_GU[p.m - 1] || "";
  const yearWord = yearToWordsGu(p.y);
  return `${dayWord} ${monthWord} ${yearWord}`.replace(/\s+/g, " ").trim();
}

export function dobDisplayFromDate(dateStr: string, customWordsGu?: string) {
  const figures = formatDobFigures(dateStr);
  const figuresGu = formatDobFiguresGu(dateStr);
  const wordsGu = customWordsGu?.trim() || dateToWordsGuRegister(dateStr);
  return { figures, figuresGu, wordsGu };
}

/** Normalize DD/MM/YYYY from date input value YYYY-MM-DD */
export function fromDateInputValue(value: string): string {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

/** Convert DD/MM/YYYY to YYYY-MM-DD for date input */
export function toDateInputValue(dateStr: string): string {
  const p = parseDateParts(dateStr);
  if (!p) return "";
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}
