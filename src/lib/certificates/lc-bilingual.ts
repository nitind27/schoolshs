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
  konkani: "કોંકણી",
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
  brahmin: "બ્રાહ્મણ",
  brahman: "બ્રાહ્મણ",
  bhraman: "બ્રાહ્મણ",
  bhrahman: "બ્રાહ્મણ",
  brabman: "બ્રાહ્મણ",
  muslim: "મુસ્લિમ",
  musalman: "મુસલમાન",
  islam: "ઇસ્લામ",
  sunni: "સુન્ની",
  hindu: "હિન્દુ",
  // Category codes typed into the caste field
  sc: "અ.જા.",
  st: "અ.જ.જા.",
  obc: "સા.શૈ.પ.વ.",
  sebc: "સા.શૈ.પ.વ.",
  general: "બિન અનામત",
  aahir: "આહીર",
  aahire: "આહિરે",
  aod: "ઓડ",
  od: "ઓડ",
  badgujar: "બડગુજર",
  bagavan: "બાગવાન",
  bagvan: "બાગવાન",
  barot: "બારોટ",
  baviskar: "બાવિસ્કર",
  beg: "બેગ",
  bha: "ભ",
  bharvad: "ભરવાડ",
  bharwad: "ભરવાડ",
  bhatkejoshi: "ભટકેજોશી",
  bhavsar: "ભાવસાર",
  bhil: "ભીલ",
  bhoi: "ભોઇ",
  bihari: "બિહારી",
  bisnoi: "બિશ્નોઇ",
  bodhdha: "બૌદ્ધ",
  borse: "બોરસે",
  chabhar: "ચાભાર",
  chaudhari: "ચૌધરી",
  chaudhri: "ચૌધરી",
  chudhari: "ચૌધરી",
  chavda: "ચાવડા",
  dakshini: "દક્ષિણી",
  dantani: "દંતાણી",
  darji: "દરજી",
  dehda: "દેહડા",
  devi: "દેવી",
  devre: "દેવરે",
  dhangar: "ધનગર",
  dhivare: "ધીવરે",
  dhivre: "ધીવરે",
  dhobi: "ધોબી",
  diva: "દીવા",
  dorik: "દોરીક",
  fakir: "ફકીર",
  gadhavi: "ગઢવી",
  gadhvi: "ગઢવી",
  gadiluhar: "ગાડીલુહાર",
  gamkit: "ગામીત",
  gangurde: "ગાંગુર્ડે",
  gavit: "ગાવીત",
  ghachi: "ઘાંચી",
  giri: "ગીરી",
  gauswami: "ગોસ્વામી",
  gosvami: "ગોસ્વામી",
  gulale: "ગુલાલે",
  gupta: "ગુપ્તા",
  gurav: "ગુરવ",
  gurjar: "ગુર્જર",
  hadpati: "હળપતિ",
  halpati: "હળપતિ",
  harijan: "હરિજન",
  haveliwala: "હવેલીવાલા",
  jadav: "જાદવ",
  jagtap: "જગતાપ",
  jain: "જૈન",
  jamat: "જમાત",
  jat: "જાટ",
  jatmalek: "જતમલેક",
  johari: "જોહરી",
  joshi: "જોશી",
  kahar: "કહાર",
  kaji: "કાજી",
  kakar: "કાકર",
  kanbi: "કણબી",
  kankar: "કંકર",
  kapade: "કાપડે",
  kapde: "કાપડે",
  kathodi: "કાથોડી",
  kathud: "કાથુડ",
  khalifa: "ખલીફા",
  khatki: "ખાટકી",
  koli: "કોળી",
  konkni: "કોંકણી",
  konnkani: "કોંકણી",
  kotvadiya: "કોટવાળિયા",
  kotvaliya: "કોટવાળિયા",
  kubhar: "કુંભાર",
  kumbhar: "કુંભાર",
  kureshi: "કુરેશી",
  kurmi: "કુર્મી",
  kushwah: "કુશવાહ",
  leuva: "લેઉવા",
  lohar: "લુહાર",
  luhar: "લુહાર",
  machchi: "માછી",
  machhi: "માછી",
  machi: "માછી",
  mahajan: "મહાજન",
  mahale: "મહાલે",
  maisuriya: "મૈસુરીયા",
  makvana: "મકવાણા",
  malek: "મલેક",
  mali: "માળી",
  maniyara: "મનિયાર",
  mansuri: "મન્સુરી",
  manyar: "મનિયાર",
  marathi: "મરાઠી",
  matang: "માતંગ",
  maulana: "મૌલાના",
  maule: "મૌલે",
  mavachi: "માવચી",
  mavchi: "માવચી",
  mir: "મીર",
  mistri: "મિસ્ત્રી",
  more: "મોરે",
  moula: "મૌલા",
  mulla: "મુલ્લા",
  nai: "નાઇ",
  naik: "નાયક",
  nandotiya: "નંદોતીયા",
  nat: "નટ",
  nayak: "નાયક",
  nerkar: "નેરકર",
  nhavi: "ન્હાવી",
  nikam: "નિકમ",
  padhar: "પઢાર",
  padvi: "પાડવી",
  palkar: "પાલકર",
  panchal: "પંચાલ",
  panjabi: "પંજાબી",
  punjabi: "પંજાબી",
  pardhi: "પારધી",
  patani: "પટણી",
  patni: "પટણી",
  patidar: "પાટીદાર",
  pavar: "પવાર",
  pawar: "પવાર",
  pijari: "પિંજારી",
  pimpale: "પિંપળે",
  pinjara: "પિંજારા",
  prajapati: "પ્રજાપતિ",
  pujak: "પૂજક",
  rajbhar: "રાજભર",
  rajpurohit: "રાજપુરોહિત",
  rana: "રાણા",
  sable: "સાબળે",
  sagar: "સાગર",
  sahani: "સાહની",
  sai: "સાઇ",
  saindane: "સૈંદાણે",
  saiyad: "સૈયદ",
  saiyyad: "સૈયદ",
  saktarsinh: "સકતરસિંહ",
  salave: "સાળવે",
  salve: "સાળવે",
  salunkhe: "સાળુંખે",
  savan: "સાવન",
  sharma: "શર્મા",
  shikligar: "સીકલીગર",
  sikligar: "સીકલીગર",
  shimpi: "શિંપી",
  shindhe: "શિંદે",
  siddiki: "સિદ્દીકી",
  sindhi: "સિંધી",
  slima: "સલીમા",
  sonar: "સોનાર",
  soni: "સોની",
  sonvane: "સોનવાણે",
  sutar: "સુતાર",
  suthar: "સુથાર",
  suvaliya: "સુવાળીયા",
  taili: "તેલી",
  talaviya: "તળાવીયા",
  teli: "તેલી",
  thakkar: "ઠક્કર",
  tlapdha: "તળપદા",
  tokre: "ટોકરે",
  vadar: "વડર",
  vaddar: "વડર",
  vadhar: "વડર",
  vagh: "વાઘ",
  vaghari: "વાઘરી",
  vaishy: "વૈશ્ય",
  valand: "વાળંદ",
  valvi: "વળવી",
  vanand: "વાણંદ",
  vaniya: "વાણીયા",
  vanjara: "વણજારા",
  vanjari: "વણજારી",
  vasave: "વસાવે",
  vaykhar: "વાયખર",
  visave: "વિસાવે",
  vishwakarma: "વિશ્વકર્મા",
  wankhede: "વાનખેડે",
  warli: "વારલી",
  yadav: "યાદવ",
  god: "ગોડ",
  ahir: "આહીર",
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
  mallah: "મલ્લાહ",
  malla: "મલ્લાહ",
  umar: "ઉમર",
  vankar: "વણકર",
  wankar: "વણકર",
  sonwane: "સોનવાણે",
  sonavane: "સોનવાણે",
  sonwani: "સોનવાણે",
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
    .split(/(\s+|\/|,|\(|\)|\.|-)/g)
    .map((part) => {
      if (!part.trim() || /^[\s/,().-]+$/.test(part)) return part;
      return safeTransliterate(part) || part;
    })
    .join("")
    .replace(/\s+\.$/, "");
}

const CATEGORY_CODE: Record<string, string> = {
  sc: "SC",
  st: "ST",
  obc: "OBC",
  sebc: "SEBC",
  ews: "EWS",
  open: "OPEN",
  general: "OPEN",
  gen: "OPEN",
  minority: "MINORITY",
  ntdnt: "NT-DNT",
  "અજા": "SC",
  "અજજા": "ST",
  "સાશૈપવ": "SEBC",
  "આનવ": "EWS",
  "બિનઅનામત": "OPEN",
  "લઘુમતી": "MINORITY",
  "વિવિજા": "NT-DNT",
};

/** Register / patrak કેટેગરી column always shows the English code: SC, ST, OBC, SEBC, EWS, OPEN … */
export function formatCategoryCode(category?: string | null): string {
  const raw = String(category || "").trim();
  if (!raw) return "";
  const key = raw.toLowerCase().replace(/[\s./-]+/g, "");
  return CATEGORY_CODE[key] || raw.toUpperCase();
}

const MUSLIM_CASTE_GU = /^(મુ\.|મુસ્લિમ|મુસલમાન|ઇસ્લામ|ઈસ્લામ)/;

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

function titleCaseEn(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/(^|[\s\-/(])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());
}

/** "Hindu Chaudhari" — no slash; skips religion when caste already starts with it. */
export function lcReligionCasteEn(s: { religion?: string | null; caste?: string | null }): string {
  const rel = titleCaseEn(String(s.religion || ""));
  const caste = titleCaseEn(String(s.caste || ""));
  if (!rel) return caste;
  if (!caste) return rel;
  if (caste.toLowerCase().startsWith(rel.toLowerCase())) return caste;
  return `${rel} ${caste}`;
}

/** "હિન્દુ ચૌધરી" — same format as register જ્ઞાતિ column. */
export function lcReligionCasteGu(s: { religion?: string | null; caste?: string | null }): string {
  return formatReligionCasteGu(s);
}

/** Register / patrak જ્ઞાતિ column: e.g. "હિન્દુ પાટીલ" (space, Gujarati). */
export function formatReligionCasteGu(s: {
  religion?: string | null;
  caste?: string | null;
}): string {
  const rel = lcGuText(s.religion);
  const caste = lcGuText(s.caste);
  if (!rel && !caste) return "";
  if (!rel) return caste;
  if (!caste) return rel;
  // Avoid "હિન્દુ હિન્દુ પાટીલ" when caste already includes religion
  if (caste.startsWith(rel) || caste.includes(` ${rel}`) || caste.includes(`${rel}-`)) {
    return caste;
  }
  // Caste already names the religion ("મુ.પઠાણ", "જૈન") — don't prefix a second one
  if (MUSLIM_CASTE_GU.test(caste) || Object.values(RELIGION_GU).includes(caste)) return caste;
  const casteEn = String(s.caste || "").trim().toLowerCase();
  const relEn = String(s.religion || "").trim().toLowerCase();
  if (relEn && casteEn.startsWith(relEn)) {
    return caste;
  }
  return `${rel} ${caste}`;
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
