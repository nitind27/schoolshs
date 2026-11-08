/**
 * School voucher words typed in English letters, including common wrong spellings.
 * The value is the Gujarati we want in the narration box.
 */
const WORDS: Record<string, string> = {
  safai: "સફાઈ",
  saphai: "સફાઈ",
  safay: "સફાઈ",
  safayi: "સફાઈ",
  sfai: "સફાઈ",
  kharch: "ખર્ચ",
  kharcha: "ખર્ચ",
  kharach: "ખર્ચ",
  kharchh: "ખર્ચ",
  kharac: "ખર્ચ",
  kharidi: "ખરીદી",
  rokad: "રોકડ",
  rokda: "રોકડ",
  rokdo: "રોકડ",
  rokada: "રોકડ",
  rokado: "રોકડ",
  rokadaa: "રોકડ",
  cash: "રોકડ",
  payment: "ચુકવણી",
  paid: "ચૂકવ્યા",
  salary: "પગાર",
  water: "પાણી",
  cleaning: "સફાઈ",
  electricity: "બિજલી",
  chukavya: "ચૂકવ્યા",
  chukavyu: "ચૂકવ્યા",
  chukavio: "ચૂકવ્યા",
  chukaviyo: "ચૂકવ્યા",
  chukaviyu: "ચૂકવ્યા",
  chukavyaa: "ચૂકવ્યા",
  aapya: "આપ્યા",
  aapyaa: "આપ્યા",
  apiya: "આપ્યા",
  aapyu: "આપ્યું",
  malyu: "મળ્યું",
  malyo: "મળ્યો",
  malya: "મળ્યા",
  maliyu: "મળ્યું",
  pani: "પાણી",
  paani: "પાણી",
  bijli: "બિજલી",
  bijali: "બિજલી",
  bijlee: "બિજલી",
  vijli: "બિજલી",
  bill: "બિલ",
  bil: "બિલ",
  pagar: "પગાર",
  paghar: "પગાર",
  pagaar: "પગાર",
  fee: "ફી",
  fees: "ફી",
  fi: "ફી",
  vidyarthi: "વિદ્યાર્થી",
  vidhyarthi: "વિદ્યાર્થી",
  vidyarthy: "વિદ્યાર્થી",
  petrol: "પેટ્રોલ",
  diesel: "ડીઝલ",
  disel: "ડીઝલ",
  tel: "તેલ",
  mithai: "મીઠાઈ",
  mithayi: "મીઠાઈ",
  marammat: "મરામત",
  maramat: "મરામત",
  repair: "મરામત",
  uniform: "યુનિફોર્મ",
  stationery: "સ્ટેશનરી",
  stationary: "સ્ટેશનરી",
  donation: "દાન",
  dan: "દાન",
  anudan: "અનુદાન",
  grant: "અનુદાન",
  bank: "બેંક",
  cheque: "ચેક",
  check: "ચેક",
  chek: "ચેક",
  na: "ના",
  naa: "ના",
  nu: "નું",
  nuu: "નું",
  ni: "ની",
  no: "નો",
  ma: "માં",
  maa: "માં",
  thi: "થી",
  thhi: "થી",
  mate: "માટે",
  maate: "માટે",
  ane: "અને",
  par: "પર",
  hoy: "હોય",
  hatu: "હતું",
  advans: "એડવાન્સ",
  advance: "એડવાન્સ",
  udhar: "ઉધાર",
  jama: "જમા",
  jamaa: "જમા",
  baki: "બાકી",
  baaki: "બાકી",
  kul: "કુલ",
  rkm: "રકમ",
  rkam: "રકમ",
  rakam: "રકમ",
};

function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/ph/g, "f")
    .replace(/w/g, "v")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/aa/g, "a")
    .replace(/(.)\1+/g, "$1");
}

const FOLDED = new Map<string, string>();
for (const [latin, gujarati] of Object.entries(WORDS)) {
  FOLDED.set(fold(latin), gujarati);
}

function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  if (a === b) return 0;
  if (!a.length || !b.length || a[0] !== b[0]) return max + 1;
  const prev = new Array<number>(b.length + 1);
  const next = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    next[0] = i;
    let rowMin = next[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      next[j] = Math.min(prev[j] + 1, next[j - 1] + 1, prev[j - 1] + cost);
      if (next[j] < rowMin) rowMin = next[j];
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = next[j];
  }
  return prev[b.length];
}

/** Known school word, including a slightly wrong spelling. Short words only match exactly. */
export function gujaratiForNarrationWord(word: string): string | null {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!clean) return null;
  if (WORDS[clean]) return WORDS[clean];
  const folded = fold(clean);
  if (FOLDED.has(folded)) return FOLDED.get(folded) || null;
  if (clean.length < 4) return null;
  const max = clean.length >= 6 ? 2 : 1;
  let best: { gu: string; dist: number } | null = null;
  for (const [key, gu] of FOLDED) {
    if (key.length < 4) continue;
    const dist = editDistance(folded, key, max);
    if (dist > max) continue;
    if (!best || dist < best.dist) best = { gu, dist };
  }
  return best?.gu || null;
}

export type NarrationToken = {
  raw: string;
  gujarati: string | null;
};

export function spellNarrationTokens(text: string): NarrationToken[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({ raw, gujarati: gujaratiForNarrationWord(raw) }));
}
