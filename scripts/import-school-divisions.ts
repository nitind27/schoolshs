/**
 * Import division sheets into school 24261004405 (SARVAJANIK HIGH SCHOOL SONGADH).
 * Sources: file/11-B.xlsx, file/11-C.ods, file/11-E.xlsx, file/9-b.xlsx
 *
 * Run:  npx tsx scripts/import-school-divisions.ts --dry          (print mapped rows only)
 *       npx tsx scripts/import-school-divisions.ts                (write all divisions)
 *       npx tsx scripts/import-school-divisions.ts --only=9-B     (limit divisions)
 */
import path from "path";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { prisma } from "../src/lib/db";
import { fillImportDefaults } from "../src/lib/import/student-import";
import { normalizeStudentRow, validateStudent } from "../src/lib/validation";
import {
  toStudentUncheckedCreate,
  toStudentUncheckedUpdate,
} from "../src/lib/student-write";
import { applyStudentPlacement } from "../src/lib/student-placement";
import { seedClassSubjects } from "../src/lib/class-subjects";
import { standardToCourseName } from "../src/lib/constants";
import { scholarshipSchemesForCategory } from "../src/lib/student-academic-rules";
import {
  assertStudentAccountEmailAvailable,
  syncStudentPortalAccount,
} from "../src/lib/student-account";
import { transliterateToGujarati } from "../src/lib/gujarati/transliterate-core";
import { studentFullNameEn, studentListName } from "../src/lib/student-names";

const SCHOOL_CODE = "24261004405";
const DRY_RUN = process.argv.includes("--dry");
const ONLY = (process.argv.find((a) => a.startsWith("--only="))?.slice(7) || "")
  .toUpperCase()
  .split(",")
  .filter(Boolean);

type RawRow = Record<string, unknown>;
type RowFix = Record<string, string>;

type Division = {
  standard: string;
  section: string;
  /** Std 11/12 divisions at this school are all Arts; Std 9/10 have no stream. */
  stream: string;
  file: string;
  /** IFSC for students with no bank account (matches earlier imports of the same standard). */
  placeholderIfsc: string;
  /** Per-row corrections keyed by the Aadhaar number, or `GR:<number>` when Aadhaar is blank. */
  fixes: Record<string, RowFix>;
};

const STD11 = { standard: "11", stream: "Arts", placeholderIfsc: "SBIN0000281" };
const STD9 = { standard: "9", stream: "", placeholderIfsc: "SBIN0003946" };

const DIVISIONS: Division[] = [
  {
    ...STD11,
    section: "B",
    file: "11-B.xlsx",
    fixes: {
      // Boy (brother of Ariyen, same father and mobile) marked FEMALE in the sheet.
      "963776689427": { Gender: "Male" },
      "484785749597": { Caste: "Gosavi" },
      "739518154264": { "First Name": "PRINCE" },
      "303007845961": { "First Name": "UJJVALKUMAR" },
    },
  },
  {
    ...STD11,
    section: "C",
    file: "11-C.ods",
    fixes: {
      // Row shifted one column left: middle name merged into first name, GR typed into email.
      "525684298880": {
        "First Name": "CHANDNIKUMARI",
        "Middle Name": "RAMESHBHAI",
        Email: "chandnigamit77@gmail.com",
        "GR Number": "16958",
      },
    },
  },
  {
    ...STD11,
    section: "E",
    file: "11-E.xlsx",
    fixes: {
      "282194794226": { "Middle Name": "VINESHBHAI" },
      "799782310569": { Surname: "CHAUDHARI", Caste: "Chaudhari" },
      "340215676354": { "Middle Name": "SHAILESHBHAI" },
      "804690533585": { "First Name": "JINALKUMARI" },
      "957022886793": { "Middle Name": "ARVINBHAI" },
      "464979146798": { Surname: "GAMIT" },
      "304397895766": { "Middle Name": "GIRISHBHAI" },
      "603362254891": {
        "First Name": "ALIM",
        "Middle Name": "AKIL",
        Surname: "KHATIK",
        Religion: "Muslim",
      },
      "898928301334": {
        "First Name": "HAMZA",
        "Middle Name": "ASIF",
        Surname: "MANSURI",
        Religion: "Muslim",
        Caste: "Mansuri",
      },
      "280629503557": { Caste: "Mulla", Religion: "Muslim" },
      // Surname / Aadhaar name are Vasava; caste was copied from the row above.
      "205706118563": { Caste: "Vasava" },
    },
  },
  {
    ...STD9,
    section: "B",
    file: "9-b.xlsx",
    fixes: {
      // Muslim students whose surname alone does not show the religion.
      "704865301512": { Religion: "Muslim" },
      "668193956332": { Religion: "Muslim" },
      "GR:23317": { Religion: "Muslim" },
    },
  },
];

const TEMPLATE_EXAMPLE_AADHAAR = "123456789012";

const CATEGORY_MAP: Record<string, string> = {
  SC: "SC",
  "S.C": "SC",
  "S.C.": "SC",
  ST: "ST",
  "S.T": "ST",
  "S.T.": "ST",
  OBC: "OBC",
  "O.B.C": "OBC",
  "O.B.C.": "OBC",
  SEBC: "OBC",
  "S.E.B.C": "OBC",
  EWS: "EWS",
  OPEN: "Open",
  GENERAL: "Open",
  MINORITY: "Minority",
};

const ST_CASTES = new Set([
  "GAMIT",
  "VASAVA",
  "VASAVE",
  "VISAVE",
  "CHAUDHARI",
  "CHUDHARI",
  "KONKANI",
  "KATHODI",
  "VALVI",
  "NAYKA",
  "KOTVADIYA",
  "DHODIYA",
  "VAGH",
  "MAVCHI",
  "KATHUD",
  "KOTVALIYA",
]);
const OBC_CASTES = new Set([
  "BHARVAD",
  "BHARWAD",
  "MANSURI",
  "MANSURY",
  "KHATIK",
  "KUMBHAR",
  "GOSVAMI",
  "GOSWAMI",
]);
const MUSLIM_SURNAMES = new Set([
  "PATHAN",
  "SHAIKH",
  "SHEKH",
  "SHEIKH",
  "VORA",
  "ANSARI",
  "SAIYAD",
  "SAYYED",
  "BAGVAN",
  "BAGWAN",
  "KHATIK",
  "MANSURI",
  "MANSURY",
  "MULLA",
  "MALEK",
  "JATMALEK",
  "MANIYAR",
]);

/** Blank IFSC → branch IFSC used by other students of this school with the same account prefix. */
const IFSC_BY_ACCOUNT_PREFIX: [RegExp, string][] = [
  [/^0267/, "BARB0FORTSO"],
  [/^0264/, "BARB0UKAIXX"],
  [/^0280/, "BARB0UCHHAL"],
  [/^30(13|35)/, "BARB0BGGBXX"],
  [/^1710/, "BARB0BANDHA"],
  [/^1767/, "BARB0SINGPU"],
  [/^52/, "UBIN0917851"],
  [/^0580/, "SDCB0000058"],
  [/^8080/, "SDCB0000008"],
  [/^2541/, "BKID0002541"],
];

/** Gujarati spellings for English name words (sheets have no Gujarati columns). */
const GU_WORD_OVERRIDES: Record<string, string> = {
  // Surnames / castes
  gamit: "ગામીત",
  vasava: "વસાવા",
  patel: "પટેલ",
  bagvan: "બાગવાન",
  bagwan: "બાગવાન",
  bhansi: "ભાંસી",
  bharvad: "ભરવાડ",
  bhavsar: "ભાવસાર",
  chaudhari: "ચૌધરી",
  chauhan: "ચૌહાણ",
  dhivre: "ધિવરે",
  gadge: "ગાડગે",
  gosavi: "ગોસાવી",
  goswami: "ગોસ્વામી",
  jatmalek: "જતમલેક",
  kathodi: "કાથોડી",
  khatik: "ખાટીક",
  konkani: "કોંકણી",
  kotvadiya: "કોટવાડિયા",
  mansuri: "મન્સુરી",
  mansury: "મન્સુરી",
  mavchi: "માવચી",
  mishra: "મિશ્રા",
  mulla: "મુલ્લા",
  nayka: "નાયકા",
  pathan: "પઠાણ",
  rathod: "રાઠોડ",
  saiyad: "સૈયદ",
  shaikh: "શેખ",
  vagh: "વાઘ",
  valvi: "વળવી",
  vaykar: "વાયકર",
  visave: "વિસાવે",
  wagh: "વાઘ",
  // Given names (roots; -bhai / -ben / -kumar / -kumari / -khan endings are added separately)
  aayush: "આયુષ",
  abhishek: "અભિષેક",
  adarsh: "આદર્શ",
  ajit: "અજીત",
  akash: "આકાશ",
  akil: "અકીલ",
  akshay: "અક્ષય",
  akshra: "અક્ષરા",
  alauddin: "અલાઉદ્દીન",
  alim: "અલીમ",
  alkesh: "અલ્કેશ",
  alpesh: "અલ્પેશ",
  alvina: "અલ્વીના",
  amit: "અમિત",
  aniket: "અનિકેત",
  anil: "અનિલ",
  anjal: "અંજલ",
  ankita: "અંકિતા",
  ankur: "અંકુર",
  ansuya: "અનસૂયા",
  anup: "અનુપ",
  archana: "અર્ચના",
  arista: "અરિસ્તા",
  ariyen: "અરિયેન",
  arjun: "અર્જુન",
  arpita: "અર્પિતા",
  arun: "અરુણ",
  arvin: "અરવિન",
  arvind: "અરવિંદ",
  aryan: "આર્યન",
  ashok: "અશોક",
  ashvin: "અશ્વિન",
  asif: "આસિફ",
  asmit: "અસ્મિત",
  aster: "એસ્ટર",
  atul: "અતુલ",
  avesh: "આવેશ",
  avtesh: "અવતેશ",
  ayan: "અયાન",
  ayush: "આયુષ",
  ayushi: "આયુષી",
  azaz: "અઝાઝ",
  babu: "બાબુ",
  badal: "બાદલ",
  bahadur: "બહાદુર",
  bhavesh: "ભાવેશ",
  bhavin: "ભાવિન",
  bhavna: "ભાવના",
  bhilakiya: "ભીલકીયા",
  bipin: "બિપિન",
  chandni: "ચાંદની",
  daksh: "દક્ષ",
  dana: "દાના",
  darshal: "દર્શલ",
  darshna: "દર્શના",
  dharmesh: "ધર્મેશ",
  dhruv: "ધ્રુવ",
  dhruvi: "ધ્રુવી",
  dhruvin: "ધ્રુવિન",
  dilip: "દિલીપ",
  dinesh: "દિનેશ",
  dipak: "દિપક",
  dipsika: "દિપસિકા",
  divya: "દિવ્યા",
  divyansi: "દિવ્યાંશી",
  divyesh: "દિવ્યેશ",
  dnyaneshwar: "જ્ઞાનેશ્વર",
  drashti: "દ્રષ્ટિ",
  dulal: "દુલાલ",
  elishan: "એલિશાન",
  enish: "એનિશ",
  evenjilina: "ઇવેન્જીલીના",
  farhan: "ફરહાન",
  filip: "ફિલિપ",
  gajendra: "ગજેન્દ્ર",
  ganesh: "ગણેશ",
  gangasagar: "ગંગાસાગર",
  gangi: "ગંગી",
  ghugha: "ઘુઘા",
  girish: "ગિરીશ",
  glori: "ગ્લોરી",
  govind: "ગોવિંદ",
  gulab: "ગુલાબ",
  habel: "હાબેલ",
  haju: "હાજુ",
  hamza: "હમઝા",
  hanif: "હનીફ",
  hannan: "હન્નાન",
  harsh: "હર્ષ",
  harshil: "હર્ષિલ",
  harun: "હારુન",
  heman: "હેમન",
  hemangi: "હેમાંગી",
  hetal: "હેતલ",
  hetvi: "હેત્વી",
  himant: "હિંમત",
  hiral: "હિરલ",
  hiren: "હિરેન",
  hitanshi: "હિતાંશી",
  hitesh: "હિતેશ",
  imaran: "ઇમરાન",
  ishavar: "ઇશ્વર",
  ishwar: "ઇશ્વર",
  jala: "જાલા",
  janvi: "જાનવી",
  jastin: "જસ્ટીન",
  jastina: "જસ્ટીના",
  jay: "જય",
  jayesh: "જયેશ",
  jayntilal: "જયંતીલાલ",
  jaysing: "જયસિંગ",
  jayvier: "જયવીર",
  jems: "જેમ્સ",
  jignesh: "જિજ્ઞેશ",
  jinal: "જિનલ",
  jinat: "જીનત",
  jitendra: "જીતેન્દ્ર",
  jitesh: "જીતેશ",
  kalpana: "કલ્પના",
  kalpesh: "કલ્પેશ",
  kamalesh: "કમલેશ",
  kamlesh: "કમલેશ",
  kanu: "કનુ",
  kapil: "કપિલ",
  karan: "કરણ",
  kavita: "કવિતા",
  khandu: "ખાંડુ",
  kishan: "કિશન",
  kristina: "ક્રિસ્ટીના",
  krunal: "કૃણાલ",
  krushna: "કૃષ્ણા",
  laxmi: "લક્ષ્મી",
  madhu: "મધુ",
  mahendra: "મહેન્દ્ર",
  mahesh: "મહેશ",
  mahima: "મહિમા",
  makanji: "મકનજી",
  mamata: "મમતા",
  manesh: "મનેશ",
  manish: "મનીષ",
  manoj: "મનોજ",
  mayank: "મયંક",
  mayur: "મયુર",
  megha: "મેઘા",
  mehul: "મેહુલ",
  mital: "મિતલ",
  mithun: "મિથુન",
  mohan: "મોહન",
  mohil: "મોહિલ",
  mosam: "મોસમ",
  muaaz: "મુઆઝ",
  mujahid: "મુજાહિદ",
  mukesh: "મુકેશ",
  mukeshgiri: "મુકેશગીરી",
  munna: "મુન્ના",
  nainesh: "નૈનેશ",
  naresh: "નરેશ",
  navinchandra: "નવીનચંદ્ર",
  naziya: "નાઝીયા",
  neha: "નેહા",
  nency: "નેન્સી",
  nidhi: "નિધિ",
  nikita: "નિકિતા",
  nilesh: "નિલેશ",
  nirali: "નિરાલી",
  niyati: "નિયતિ",
  pankaj: "પંકજ",
  parmanand: "પરમાનંદ",
  parul: "પારુલ",
  payal: "પાયલ",
  pinesh: "પિનેશ",
  pradip: "પ્રદીપ",
  praful: "પ્રફુલ",
  prakash: "પ્રકાશ",
  pratik: "પ્રતિક",
  prem: "પ્રેમ",
  prince: "પ્રિન્સ",
  pritika: "પ્રિતિકા",
  priya: "પ્રિયા",
  priyans: "પ્રિયાંશ",
  priyanshi: "પ્રિયાંશી",
  priyansi: "પ્રિયાંશી",
  priyesh: "પ્રિયેશ",
  purvika: "પૂર્વિકા",
  radhika: "રાધિકા",
  rahul: "રાહુલ",
  rais: "રઇશ",
  raj: "રાજ",
  rajesh: "રાજેશ",
  raju: "રાજુ",
  rakesh: "રાકેશ",
  raman: "રમણ",
  ramesh: "રમેશ",
  rangji: "રંગજી",
  ranjit: "રણજીત",
  rasid: "રશીદ",
  rasik: "રસિક",
  ravindra: "રવિન્દ્ર",
  ravish: "રવિશ",
  raxa: "રક્ષા",
  richal: "રિચલ",
  rihan: "રિહાન",
  rinal: "રિનલ",
  rohan: "રોહન",
  rohit: "રોહિત",
  ronak: "રોનક",
  roshani: "રોશની",
  rosmin: "રોસ્મીન",
  rudra: "રુદ્ર",
  rumana: "રૂમાના",
  rupsing: "રૂપસિંગ",
  rutvik: "ઋત્વિક",
  sadhana: "સાધના",
  sahil: "સાહિલ",
  sahin: "સાહીન",
  sainath: "સાઇનાથ",
  sajan: "સાજન",
  salim: "સલીમ",
  samir: "સમીર",
  sana: "સના",
  sandip: "સંદીપ",
  sanjay: "સંજય",
  santosh: "સંતોષ",
  sanu: "સાનુ",
  saron: "સરોન",
  sarvin: "સરવિન",
  satish: "સતીશ",
  saul: "શાઉલ",
  sayna: "સાયના",
  shailesh: "શૈલેષ",
  shanta: "શાંતા",
  shantilal: "શાંતિલાલ",
  shirchana: "શિરચના",
  shreya: "શ્રેયા",
  smit: "સ્મિત",
  smital: "સ્મિતલ",
  sneha: "સ્નેહા",
  snehal: "સ્નેહલ",
  soham: "સોહમ",
  somayel: "સોમાયેલ",
  stelin: "સ્ટેલીન",
  suhani: "સુહાની",
  sujit: "સુજીત",
  sukanji: "સુકનજી",
  suman: "સુમન",
  sumit: "સુમિત",
  sunesh: "સુનેશ",
  sunil: "સુનિલ",
  suresh: "સુરેશ",
  sweety: "સ્વીટી",
  taher: "તાહેર",
  tamanna: "તમન્ના",
  tanuj: "તનુજ",
  tanvi: "તન્વી",
  timothi: "તિમોથી",
  tirth: "તીર્થ",
  tofik: "તોફીક",
  tohin: "તોહીન",
  tukesh: "તુકેશ",
  uday: "ઉદય",
  ujjval: "ઉજ્જવલ",
  umesh: "ઉમેશ",
  varun: "વરુણ",
  vasim: "વસીમ",
  vijay: "વિજય",
  vijendra: "વિજેન્દ્ર",
  vikash: "વિકાસ",
  vinesh: "વિનેશ",
  vinod: "વિનોદ",
  vinu: "વિનુ",
  virendra: "વિરેન્દ્ર",
  vishal: "વિશાલ",
  vivek: "વિવેક",
  yahoshuva: "યહોશુવા",
  yakub: "યાકુબ",
  yogesh: "યોગેશ",
  yohan: "યોહાન",
  yuvraj: "યુવરાજ",
  zinal: "ઝીનલ",
  // Std 9-B
  abdul: "અબ્દુલ",
  ahemad: "અહેમદ",
  aksa: "અક્સા",
  akub: "અકુબ",
  alfej: "અલ્ફેજ",
  altamas: "અલ્તમસ",
  amin: "અમીન",
  anish: "અનીશ",
  ankit: "અંકિત",
  ansari: "અન્સારી",
  arbaz: "અરબાઝ",
  arman: "અરમાન",
  arushi: "આરુષી",
  asefa: "આસેફા",
  bagul: "બાગુલ",
  bharat: "ભરત",
  bhavika: "ભાવિકા",
  bhavsaheb: "ભાવસાહેબ",
  bhikan: "ભીકન",
  chandramukhi: "ચંદ્રમુખી",
  daksha: "દક્ષા",
  danish: "દાનીશ",
  daud: "દાઉદ",
  dhaval: "ધવલ",
  dipesh: "દિપેશ",
  fatema: "ફાતેમા",
  gagangiri: "ગગનગીરી",
  gaurav: "ગૌરવ",
  gavle: "ગવળે",
  ghela: "ઘેલા",
  gosvami: "ગોસ્વામી",
  hamja: "હમજા",
  hujefa: "હુજેફા",
  imran: "ઇમરાન",
  itesh: "ઇતેશ",
  jadav: "જાદવ",
  jagadish: "જગદીશ",
  jagdish: "જગદીશ",
  jagtap: "જગતાપ",
  jakariya: "જકરીયા",
  janavi: "જાનવી",
  juber: "જુબેર",
  kajal: "કાજલ",
  kakar: "કાકર",
  kana: "કાના",
  karina: "કરીના",
  kathud: "કાથુડ",
  kinjal: "કિંજલ",
  kotvaliya: "કોટવાળિયા",
  krupesh: "કૃપેશ",
  kuddus: "કુદ્દુસ",
  kulsumbanu: "કુલસુમબાનુ",
  kunvar: "કુંવર",
  lala: "લાલા",
  lalit: "લલિત",
  mahajan: "મહાજન",
  mahemud: "મહેમુદ",
  malek: "મલેક",
  maniyar: "મણિયાર",
  mihir: "મિહિર",
  "mo.": "મો.",
  mohamad: "મોહમદ",
  mohammad: "મોહમ્મદ",
  mohmmadali: "મોહમ્મદઅલી",
  mojesh: "મોજેશ",
  navaz: "નવાઝ",
  nitesh: "નિતેશ",
  palsingh: "પાલસિંગ",
  panpatil: "પાનપાટીલ",
  parth: "પાર્થ",
  parvati: "પાર્વતી",
  pavar: "પવાર",
  pratigna: "પ્રતિજ્ઞા",
  pratixa: "પ્રતિક્ષા",
  pravin: "પ્રવિણ",
  ranchod: "રણછોડ",
  rashi: "રાશી",
  raviya: "રવિયા",
  ridhdhi: "રિદ્ધિ",
  sakil: "સકીલ",
  sakir: "સાકીર",
  samsudin: "સમસુદ્દીન",
  sanjana: "સંજના",
  sanju: "સંજુ",
  santosi: "સંતોષી",
  sara: "સારા",
  sarfaraj: "સરફરાજ",
  sharif: "શરીફ",
  sharma: "શર્મા",
  shekh: "શેખ",
  shesharam: "શેષારામ",
  shirish: "શિરીષ",
  shoeb: "શોએબ",
  subham: "શુભમ",
  subhashchandra: "સુભાષચંદ્ર",
  sujal: "સુજલ",
  surhaim: "સુરહૈમ",
  switin: "સ્વિટીન",
  tanavi: "તનવી",
  teja: "તેજા",
  tosib: "તોસીબ",
  urval: "ઉર્વલ",
  varsha: "વર્ષા",
  vikesh: "વિકેશ",
  viren: "વિરેન",
  vora: "વોરા",
  yunus: "યુનુસ",
};

/** Suffixes handled as root + fixed Gujarati ending. */
const GU_SUFFIXES: [string, string][] = [
  ["kumari", "કુમારી"],
  ["kumar", "કુમાર"],
  ["bhai", "ભાઇ"],
  ["ben", "બેન"],
  ["khan", "ખાન"],
];

const NAME_SUFFIX_WORDS = new Set(["BHAI", "BEN", "KUMAR", "KUMARI"]);

function pick(r: RawRow, ...keys: string[]): string {
  for (const key of keys) {
    const v = r[key];
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function cleanName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** "RAKESH BHAI" → "RAKESHBHAI", "PRIYANSHI KUMARI" → "PRIYANSHIKUMARI". */
function joinNameSuffixes(value: string): string {
  const words = cleanName(value).split(" ").filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    if (out.length && NAME_SUFFIX_WORDS.has(w.toUpperCase())) out[out.length - 1] += w;
    else out.push(w);
  }
  return out.join(" ");
}

function titleCaseWords(value: string): string {
  return cleanName(value)
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      if (/^[A-Z]\.?$/.test(w)) return w.toUpperCase();
      return w
        .split(".")
        .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p))
        .join(".");
    })
    .join(" ");
}

function nameWord(value: string): string {
  return titleCaseWords(joinNameSuffixes(value));
}

const DATE_RE = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/;

function parseDob(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v) && v > 20000 && v < 80000) {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (parsed) {
      return `${String(parsed.d).padStart(2, "0")}/${String(parsed.m).padStart(2, "0")}/${parsed.y}`;
    }
  }
  const s = String(v || "").trim();
  const m = s.match(DATE_RE);
  if (m) return `${m[1]!.padStart(2, "0")}/${m[2]!.padStart(2, "0")}/${m[3]}`;
  return s;
}

function cleanMobile(v: unknown, gr = ""): string {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (/^[6-9]\d{9}$/.test(d)) return d;
  const g = String(gr || "").replace(/\D/g, "") || "0";
  return `9${g.padStart(9, "0")}`.slice(0, 10);
}

function cleanAadhaar(v: unknown): string {
  return String(v || "").replace(/\D/g, "");
}

function cleanEmail(raw: string): string | undefined {
  let e = raw.trim().toLowerCase().replace(/\s/g, "");
  if (!e || e === "@") return undefined;
  e = e
    .replace(/\.c0m$/, ".com")
    .replace(/@(gamail|gmali|gamai|gmai)\.com$/, "@gmail.com");
  if (!e.includes("@") && /gmail\.com$/.test(e)) e = e.replace(/gmail\.com$/, "@gmail.com");
  if (/^[^\s@]+@$/.test(e)) e += "gmail.com";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : undefined;
}

const NUMERIC_BRANCH_BANKS = /^(SBIN|UBIN|PUNB|SDCB|BKID|MAHB|CBIN)/;

function cleanIfsc(raw: string, accountNumber: string): string {
  let s = raw.toUpperCase().replace(/\s/g, "").slice(0, 11);
  const fixes: Record<string, string> = {
    BARO0FORTS0: "BARB0FORTSO",
    BARB0FORTS0: "BARB0FORTSO",
    BAEB0FORTSO: "BARB0FORTSO",
    BARO0UKAIXX: "BARB0UKAIXX",
    BKIB0002541: "BKID0002541",
    MAHB000515: "MAHB0000515",
  };
  s = fixes[s] || s;
  if (s.length === 11) {
    s = s.slice(0, 4) + s.slice(4, 5).replace("O", "0") + s.slice(5);
    if (NUMERIC_BRANCH_BANKS.test(s)) s = s.slice(0, 5) + s.slice(5).replace(/O/g, "0");
    s = fixes[s] || s;
  }
  const byPrefix = IFSC_BY_ACCOUNT_PREFIX.find(([re]) => re.test(accountNumber))?.[1];
  if (!s && accountNumber) {
    if (byPrefix) return byPrefix;
    if (accountNumber.length === 11) return "SBIN0000281";
  }
  // SBI accounts are 11 digits; a 13+ digit account with a known branch prefix carries a wrong SBI IFSC.
  if (s.startsWith("SBIN") && byPrefix && accountNumber.length >= 13) return byPrefix;
  return s;
}

function bankNameFromIfsc(ifsc: string): string {
  if (ifsc.startsWith("SBIN")) return "State Bank of India";
  if (ifsc.startsWith("UBIN") || ifsc.startsWith("CORP")) return "Union Bank of India";
  if (ifsc.startsWith("BARB0BGG")) return "Baroda Gujarat Gramin Bank";
  if (ifsc.startsWith("BARB")) return "Bank of Baroda";
  if (ifsc.startsWith("MAHB")) return "Bank of Maharashtra";
  if (ifsc.startsWith("SDCB")) return "Surat District Co-op Bank";
  if (ifsc.startsWith("DCBL")) return "DCB Bank";
  if (ifsc.startsWith("BKID")) return "Bank of India";
  if (ifsc.startsWith("PUNB")) return "Punjab National Bank";
  if (ifsc.startsWith("CBIN")) return "Central Bank of India";
  return "Bank of Baroda";
}

/** Split words like "GAMITAKSHRABENANILBHAI" into the student's own name tokens. */
function spaceOutHolder(holder: string, parts: string[]): string {
  const tokens = [...new Set(parts.map((p) => p.toUpperCase().replace(/\s/g, "")))]
    .filter((t) => t.length >= 3)
    .sort((a, b) => b.length - a.length);
  const validRest = (rest: string) => rest.length >= 3 && !NAME_SUFFIX_WORDS.has(rest);
  const split = (word: string): string[] => {
    for (const t of tokens) {
      if (word === t) return [word];
      if (word.startsWith(t) && validRest(word.slice(t.length))) {
        return [t, ...split(word.slice(t.length))];
      }
      if (word.endsWith(t) && validRest(word.slice(0, -t.length))) {
        return [...split(word.slice(0, -t.length)), t];
      }
    }
    return [word];
  };
  return cleanName(holder)
    .split(" ")
    .flatMap((w) => split(w.toUpperCase()))
    .join(" ");
}

function getScholarshipScheme(cat: string, standard: string): string {
  if (Number(standard) <= 10) return scholarshipSchemesForCategory(cat)[0] || "";
  if (cat === "ST") return "Post Matric Scholarship - ST";
  if (cat === "SC") return "Post Matric Scholarship - SC";
  if (cat === "OBC") return "Post Matric Scholarship - OBC";
  return "";
}

function divisionLabel(division: Division): string {
  return `${division.standard}-${division.section}`;
}

const untranslatedWords = new Set<string>();

function guRoot(root: string): string {
  if (GU_WORD_OVERRIDES[root]) return GU_WORD_OVERRIDES[root]!;
  untranslatedWords.add(root);
  return transliterateToGujarati(root);
}

function guWord(word: string): string {
  const lower = word.toLowerCase();
  if (GU_WORD_OVERRIDES[lower]) return GU_WORD_OVERRIDES[lower]!;
  for (const [suffix, gu] of GU_SUFFIXES) {
    if (lower.endsWith(suffix) && lower.length - suffix.length >= 2) {
      return guRoot(lower.slice(0, -suffix.length)) + gu;
    }
  }
  return guRoot(lower);
}

function transliterateName(en: string): string | null {
  const e = cleanName(en);
  if (!e || e.toUpperCase() === "NA") return null;
  return e.split(" ").filter(Boolean).map(guWord).join(" ") || null;
}

function applyRowFixes(r: RawRow, division: Division): RawRow {
  const aadhaar = cleanAadhaar(r["Aadhaar Number"]);
  const gr = pick(r, "GR Number").replace(/\s/g, "");
  const fix = (aadhaar && division.fixes[aadhaar]) || division.fixes[`GR:${gr}`] || {};
  const row: RawRow = { ...r, ...fix };

  const ifscCell = pick(row, "IFSC Code");
  if (ifscCell.length > 11 && /^[A-Z]{4}[0O][A-Z0-9]{6}/i.test(ifscCell)) {
    row["IFSC Code"] = ifscCell.slice(0, 11);
    if (!pick(row, "Account Holder Name")) row["Account Holder Name"] = ifscCell.slice(11);
  }

  if (!pick(row, "Date of Birth (DD/MM/YYYY)")) {
    const m = pick(row, "Name (As per Aadhaar)").match(DATE_RE);
    if (m) row["Date of Birth (DD/MM/YYYY)"] = m[0];
  }
  return row;
}

function cleanCaste(raw: string, surname: string): string {
  const c = cleanName(raw).replace(/^(HINDU|HINDI|MUSLIM)\s+/i, "");
  return titleCaseWords(c) || surname;
}

function inferCategory(rawCategory: string, caste: string, surname: string): {
  category: string;
  inferred: boolean;
} {
  const key = rawCategory.toUpperCase().trim();
  if (key) return { category: CATEGORY_MAP[key] || key, inferred: false };
  const keys = [caste.toUpperCase(), surname.toUpperCase()];
  if (keys.some((k) => ST_CASTES.has(k))) return { category: "ST", inferred: true };
  if (keys.some((k) => OBC_CASTES.has(k))) return { category: "OBC", inferred: true };
  return { category: "Open", inferred: true };
}

async function writeMappedWorkbook(rows: Record<string, unknown>[], outPath: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Students");
  const keys = Object.keys(rows[0] || {}).filter((k) => !k.startsWith("_"));
  ws.columns = keys.map((key) => ({ header: key, key, width: Math.max(16, key.length + 2) }));
  for (const row of rows) {
    ws.addRow(keys.map((k) => (row[k] as string | number | undefined) ?? ""));
  }
  ws.getRow(1).font = { bold: true };
  await wb.xlsx.writeFile(outPath);
}

async function ensureClass(
  schoolId: string,
  division: Division,
  academicYear: string,
  institutionName: string,
  institutionDistrict: string,
) {
  const { standard, section, stream } = division;
  let cls = await prisma.schoolClass.findFirst({
    where: { schoolId, standard, section, academicYear },
  });
  if (!cls) {
    cls = await prisma.schoolClass.create({
      data: {
        schoolId,
        name: stream ? `Class ${standard} ${stream}-${section}` : `Class ${standard}-${section}`,
        standard,
        section,
        stream,
        academicYear,
        institutionName,
        institutionDistrict,
      },
    });
    console.log(`Created class "${cls.name}" (${cls.id})`);
  } else {
    console.log(`Using existing class "${cls.name}" (${cls.id})`);
  }
  await seedClassSubjects(cls.id, standard, cls.stream || stream);
  return cls;
}

function mapDivision(
  division: Division,
  academicYear: string,
  institutionName: string,
  institutionDistrict: string,
) {
  const wb = XLSX.readFile(path.join(process.cwd(), "file", division.file), {
    cellDates: false,
    raw: true,
  });
  const sheetName = wb.SheetNames.find((n) => /students/i.test(n)) || wb.SheetNames[0]!;
  const rawRows = XLSX.utils.sheet_to_json<RawRow>(wb.Sheets[sheetName]!, {
    defval: "",
    raw: true,
  });

  const mapped: Record<string, any>[] = [];
  const notes: string[] = [];
  const isHigherSecondary = Number(division.standard) >= 11;

  for (const source of rawRows) {
    const r = applyRowFixes(source, division);
    const firstNameRaw = pick(r, "First Name");
    let aadhaarNumber = cleanAadhaar(pick(r, "Aadhaar Number"));
    if (!firstNameRaw && !aadhaarNumber) continue;
    if (aadhaarNumber === TEMPLATE_EXAMPLE_AADHAAR) continue;

    const rollNumber = String(mapped.length + 1);
    const firstName = nameWord(firstNameRaw);
    const middleName = nameWord(pick(r, "Middle Name"));
    const surname = nameWord(pick(r, "Surname"));
    const aadhaarName = [firstName, middleName, surname].filter(Boolean).join(" ");
    const label = `${divisionLabel(division)} roll ${rollNumber} ${aadhaarName}`;

    const dob = parseDob(pick(r, "Date of Birth (DD/MM/YYYY)"));
    if (!DATE_RE.test(dob)) notes.push(`${label}: date of birth missing`);
    const genderRaw = pick(r, "Gender").toLowerCase();
    const gender = genderRaw.startsWith("f") ? "Female" : genderRaw.startsWith("m") ? "Male" : "Other";
    const gr = pick(r, "GR Number").replace(/\s/g, "");

    const mobileRaw = pick(r, "Mobile Number");
    const mobileNumber = cleanMobile(mobileRaw, gr);
    if (mobileNumber !== mobileRaw.replace(/\D/g, "")) {
      notes.push(`${label}: mobile "${mobileRaw}" invalid → placeholder ${mobileNumber}`);
    }
    const emailRaw = pick(r, "Email");
    const email = cleanEmail(emailRaw);
    if (emailRaw && emailRaw !== "@" && !email) notes.push(`${label}: email "${emailRaw}" dropped`);
    const apaarId = pick(r, "APAAR / UPPAR ID").replace(/\s/g, "") || null;

    if (!/^\d{12}$/.test(aadhaarNumber)) {
      const placeholder = `9${String(gr || rollNumber).padStart(11, "0")}`.slice(0, 12);
      notes.push(`${label}: Aadhaar "${aadhaarNumber}" invalid → placeholder ${placeholder}`);
      aadhaarNumber = placeholder;
    }

    const caste = cleanCaste(pick(r, "Caste"), surname);
    const { category, inferred } = inferCategory(
      pick(r, "Category (SC/ST/OBC/SEBC/EWS/Open)"),
      caste,
      surname,
    );
    if (inferred && category === "Open") notes.push(`${label}: category blank → Open`);

    let religion = titleCaseWords(pick(r, "Religion"));
    if (/muslim|islam/i.test(religion)) religion = "Muslim";
    if (!religion) {
      religion = MUSLIM_SURNAMES.has(surname.toUpperCase()) ? "Muslim" : "Hindu";
    }

    let accountNumber = pick(r, "Account Number").replace(/\D/g, "");
    const ifscRaw = pick(r, "IFSC Code");
    if (/^SBIN/i.test(ifscRaw) && /^000/.test(accountNumber)) {
      accountNumber = accountNumber.replace(/^0+/, "").padStart(11, "0");
    }
    let ifscCode = cleanIfsc(ifscRaw, accountNumber);
    if (ifscRaw && ifscCode.slice(0, 4) !== ifscRaw.toUpperCase().slice(0, 4).replace("BARO", "BARB").replace("BAEB", "BARB")) {
      notes.push(`${label}: IFSC "${ifscRaw}" does not match account ${accountNumber} → ${ifscCode}`);
    }
    if (!accountNumber) {
      accountNumber = `9${String(gr || rollNumber).padStart(11, "0")}`.slice(0, 12);
      ifscCode = ifscCode || division.placeholderIfsc;
      notes.push(`${label}: no bank account → placeholder ${accountNumber}`);
    }
    if (!ifscCode) {
      ifscCode = division.placeholderIfsc;
      notes.push(`${label}: IFSC blank (account ${accountNumber}) → ${ifscCode}`);
    }
    const bankName = bankNameFromIfsc(ifscCode);

    const holderSpaced = spaceOutHolder(pick(r, "Account Holder Name"), [firstName, middleName, surname]);
    const holderWords = holderSpaced.split(" ").filter((w) => w && !/^(MISS|MR|MRS|MS)\.?$/i.test(w));
    const accountHolderName = holderWords.length >= 2 ? holderSpaced : aadhaarName;

    const firstNameGu = transliterateName(firstName);
    const middleNameGu = transliterateName(middleName);
    const surnameGu = transliterateName(surname);
    const aadhaarNameGu = [firstNameGu, middleNameGu, surnameGu].filter(Boolean).join(" ") || null;

    mapped.push({
      firstName,
      middleName: middleName || null,
      surname,
      aadhaarName,
      firstNameGu,
      middleNameGu,
      surnameGu,
      aadhaarNameGu,
      motherName: "—",
      fatherName: middleName || "—",
      motherNameGu: null,
      fatherNameGu: middleNameGu,
      dateOfBirth: dob,
      gender,
      aadhaarNumber,
      mobileNumber,
      email,
      apaarId,
      grNumber: gr,
      standard: division.standard,
      section: division.section,
      rollNumber,
      category,
      caste,
      religion,
      maritalStatus: "Unmarried",
      parentOccupation: "Daily Wage Labour",
      isOrphan: "No",
      annualFamilyIncome: category === "ST" || category === "SC" ? 60000 : 120000,
      currentAddress: "Songadh, Tapi, Gujarat",
      currentDistrict: "Tapi",
      currentCity: "Songadh",
      currentPincode: "394670",
      permanentAddress: "Songadh, Tapi, Gujarat",
      permanentDistrict: "Tapi",
      permanentCity: "Songadh",
      permanentPincode: "394670",
      habitationType: "Own",
      familySize: 5,
      residentType: "Rural",
      isHosteler: "No",
      scholarshipScheme: getScholarshipScheme(category, division.standard),
      financialYear: academicYear,
      courseType: isHigherSecondary ? "Higher Secondary" : "Secondary",
      courseName: standardToCourseName(division.standard),
      currentYear: "1st Year",
      admissionType: "Regular",
      accountNumber,
      ifscCode,
      accountHolderName,
      bankName,
      branchName: "SONGADH",
      institutionName,
      institutionDistrict,
      ...(isHigherSecondary ? { board10th: "GSEB", percentage10th: 65, year10th: "2026" } : {}),
    });
  }

  const grCount = new Map<string, number>();
  for (const s of mapped) if (s.grNumber) grCount.set(s.grNumber, (grCount.get(s.grNumber) || 0) + 1);
  for (const [gr, n] of grCount) if (n > 1) notes.push(`${divisionLabel(division)}: GR ${gr} used by ${n} rows`);

  return { mapped, notes };
}

async function importDivision(
  schoolId: string,
  division: Division,
  mapped: Record<string, any>[],
  academicYear: string,
  institutionName: string,
  institutionDistrict: string,
) {
  const outExcelPath = path.join(process.cwd(), "file", `${divisionLabel(division)}-mapped.xlsx`);
  await writeMappedWorkbook(mapped, outExcelPath);
  console.log(`Saved mapped Excel to: ${outExcelPath}`);

  const cls = await ensureClass(
    schoolId,
    division,
    academicYear,
    institutionName,
    institutionDistrict,
  );

  const stats = { created: 0, updated: 0, failed: 0, ready: 0, draft: 0 };
  const errorList: { roll: string; name: string; errors: string[] }[] = [];

  for (const raw of mapped) {
    const withDefaults = fillImportDefaults({
      ...raw,
      institutionName,
      institutionDistrict,
      financialYear: academicYear,
    });
    const dataRow = normalizeStudentRow(withDefaults);
    applyStudentPlacement(dataRow as Record<string, unknown>, {
      id: cls.id,
      standard: cls.standard,
      section: cls.section,
      academicYear: cls.academicYear,
      institutionName: cls.institutionName,
      institutionDistrict: cls.institutionDistrict,
    });

    const validationErrors = validateStudent(dataRow);
    const status = validationErrors.length === 0 ? "ready" : "draft";

    try {
      const existing = await prisma.student.findUnique({
        where: {
          schoolId_aadhaarNumber: { schoolId, aadhaarNumber: String(dataRow.aadhaarNumber) },
        },
      });

      if (!existing && dataRow.grNumber) {
        const grClash = await prisma.student.findFirst({
          where: { schoolId, grNumber: String(dataRow.grNumber), status: { not: "archived" } },
          select: { firstName: true, surname: true, standard: true, section: true },
        });
        if (grClash) {
          console.warn(
            `  ! GR ${dataRow.grNumber} is also used by ${grClash.firstName} ${grClash.surname} (${grClash.standard}-${grClash.section}); creating a separate student`,
          );
        }
      }

      if (dataRow.email) {
        try {
          await assertStudentAccountEmailAvailable(String(dataRow.email), existing?.id);
        } catch {
          console.warn(`  ! Email ${dataRow.email} already used by another account; skipped`);
          dataRow.email = null;
        }
      }

      const payload = {
        schoolId,
        status,
        validationErrors: validationErrors.length > 0 ? JSON.stringify(validationErrors) : null,
      };

      const student = existing
        ? await prisma.student.update({
            where: { id: existing.id },
            data: toStudentUncheckedUpdate(dataRow as Record<string, unknown>, payload),
          })
        : await prisma.student.create({
            data: toStudentUncheckedCreate(dataRow as Record<string, unknown>, payload),
          });

      if (existing) stats.updated++;
      else stats.created++;

      if (status === "ready") stats.ready++;
      else {
        stats.draft++;
        errorList.push({
          roll: String(dataRow.rollNumber),
          name: `${dataRow.firstName} ${dataRow.surname}`,
          errors: validationErrors.map((e) => `${e.field}: ${e.message}`),
        });
      }

      await syncStudentPortalAccount(student);

      console.log(
        `✓ Roll ${String(dataRow.rollNumber).padStart(2, " ")}: ${studentFullNameEn(student)} | ${studentListName(student)} [GR: ${dataRow.grNumber}] [${status}]`,
      );
    } catch (err: unknown) {
      stats.failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`✗ Failed Roll ${raw.rollNumber} (${raw.firstName} ${raw.surname}):`, message);
    }
  }

  const finalCount = await prisma.student.count({
    where: {
      schoolId,
      standard: division.standard,
      section: division.section,
      status: { not: "archived" },
    },
  });

  console.log(`\n=== ${divisionLabel(division)} SUMMARY ===`);
  console.log(
    `Processed ${mapped.length} | created ${stats.created} | updated ${stats.updated} | failed ${stats.failed} | ready ${stats.ready} | draft ${stats.draft}`,
  );
  console.log(`Students now in Class ${divisionLabel(division)}: ${finalCount}`);
  for (const e of errorList) console.log(` - Roll ${e.roll} (${e.name}): ${e.errors.join("; ")}`);
}

async function main() {
  const school = await prisma.school.findFirst({
    where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
    include: { settings: true },
  });
  if (!school) throw new Error(`School with code ${SCHOOL_CODE} not found in database`);

  const academicYear = school.settings?.academicYear || "2026-27";
  const institutionName =
    school.settings?.schoolName || school.name || "SARVAJANIK HIGH SCHOOL SONGADH";
  const institutionDistrict = school.district || "Tapi";

  console.log(`School: ${school.name} (${school.code}) | Academic Year: ${academicYear}`);

  const divisions = DIVISIONS.filter((d) => !ONLY.length || ONLY.includes(divisionLabel(d)));
  for (const division of divisions) {
    console.log(`\n##### Class ${divisionLabel(division)} from file/${division.file}${DRY_RUN ? " (DRY RUN)" : ""}`);
    const { mapped, notes } = mapDivision(division, academicYear, institutionName, institutionDistrict);
    console.log(`Students parsed: ${mapped.length}`);
    if (!mapped.length) throw new Error(`No student rows found in ${division.file}`);

    if (DRY_RUN) {
      for (const s of mapped) {
        console.log(
          `${String(s.rollNumber).padStart(2)} GR ${s.grNumber} | ${s.aadhaarName} | ${s.aadhaarNameGu} | ${s.dateOfBirth} ${s.gender[0]} ${s.category} ${s.caste} ${s.religion} | ${s.accountNumber} ${s.ifscCode} | ${s.accountHolderName} | ${s.email ?? "-"}`,
        );
      }
      for (const n of notes) console.log(`  note: ${n}`);
      continue;
    }

    await importDivision(school.id, division, mapped, academicYear, institutionName, institutionDistrict);
    for (const n of notes) console.log(`  note: ${n}`);
  }

  if (DRY_RUN) {
    console.log(`\nWords without a Gujarati override (${untranslatedWords.size}):`);
    console.log([...untranslatedWords].sort().join(", ") || "none");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
