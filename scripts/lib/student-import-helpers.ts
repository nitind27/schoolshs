/** Shared cleanup + Gujarati name helpers for Songadh school import scripts. */
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { transliterateToGujarati } from "../../src/lib/gujarati/transliterate-core";

export type RawRow = Record<string, unknown>;

export const TEMPLATE_EXAMPLE_AADHAAR = "123456789012";

export const CATEGORY_MAP: Record<string, string> = {
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

export const ST_CASTES = new Set([
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
export const OBC_CASTES = new Set([
  "BHARVAD",
  "BHARWAD",
  "MANSURI",
  "MANSURY",
  "KHATIK",
  "KUMBHAR",
  "GOSVAMI",
  "GOSWAMI",
]);
export const MUSLIM_SURNAMES = new Set([
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
export const IFSC_BY_ACCOUNT_PREFIX: [RegExp, string][] = [
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
export const GU_WORD_OVERRIDES: Record<string, string> = {
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
  // school 24261004403 — Std 1, 2, 3, 5
  aahan: "આહાન",
  aalam: "આલમ",
  aaradya: "આરાધ્યા",
  aarju: "આરજુ",
  aarohi: "આરોહી",
  aashif: "આસિફ",
  aatke: "આટકે",
  aayushi: "આયુષી",
  abdulla: "અબ્દુલ્લા",
  abuzar: "અબુઝર",
  aditya: "આદિત્ય",
  adyan: "અદ્યાન",
  afkhan: "અફખાન",
  afzal: "અફઝલ",
  agale: "અગલે",
  ahad: "અહદ",
  ajay: "અજય",
  akansha: "આકાંક્ષા",
  akran: "અકરાન",
  alija: "અલીઝા",
  allarakha: "અલ્લારખા",
  altaf: "અલ્તાફ",
  amarjit: "અમરજીત",
  ammar: "અમ્માર",
  anandi: "આનંદી",
  anita: "અનિતા",
  anjali: "અંજલી",
  anjana: "અંજના",
  anjum: "અંજુમ",
  anvi: "અન્વી",
  archit: "અર્ચિત",
  arifa: "આરીફા",
  arsh: "અર્શ",
  aruna: "અરુણા",
  arvi: "આર્વી",
  asaraf: "અસરફ",
  asha: "આશા",
  asraf: "અશરફ",
  avinash: "અવિનાશ",
  bablu: "બબલુ",
  badu: "બાદુ",
  bano: "બાનો",
  banu: "બાનુ",
  begum: "બેગમ",
  bhagavandas: "ભગવાનદાસ",
  bhavya: "ભવ્યા",
  bhola: "ભોલા",
  bhupendrasinh: "ભુપેન્દ્રસિંહ",
  bishnoi: "બિશ્નોઈ",
  champa: "ચંપા",
  chavda: "ચાવડા",
  chaya: "છાયા",
  dahejiya: "દહેજીયા",
  daxesh: "દક્ષેશ",
  deshpande: "દેશપાંડે",
  dev: "દેવ",
  devansh: "દેવાંશ",
  devda: "દેવડા",
  devesh: "દેવેશ",
  devika: "દેવિકા",
  dhairya: "ધૈર્ય",
  dharmishtha: "ધર્મિષ્ઠા",
  dhimmar: "ધીમ્મર",
  dhodiya: "ધોડિયા",
  dhruvanshu: "ધ્રુવાંશુ",
  dhyansh: "ધ્યાંશ",
  dhyey: "ધ્યેય",
  dilza: "દિલઝા",
  ditya: "દિત્યા",
  diva: "દિવા",
  divyanshi: "દિવ્યાંશી",
  eram: "ઇરમ",
  farjana: "ફરજાના",
  farukh: "ફારૂક",
  firdos: "ફિરદોસ",
  gautam: "ગૌતમ",
  gavli: "ગવળી",
  geeta: "ગીતા",
  gela: "ગેલા",
  gita: "ગીતા",
  griva: "ગ્રીવા",
  guddi: "ગુડ્ડી",
  gupta: "ગુપ્તા",
  hadu: "હાડુ",
  hansa: "હંસા",
  haresh: "હરેશ",
  harish: "હરીશ",
  harshit: "હર્ષિત",
  hashim: "હાશીમ",
  hassan: "હસન",
  haveliwala: "હવેલીવાલા",
  hazikh: "હાઝીક",
  hemant: "હેમંત",
  heru: "હેરુ",
  hire: "હિરે",
  humera: "હુમેરા",
  iqbal: "ઇકબાલ",
  irfan: "ઇરફાન",
  irsad: "ઇરશાદ",
  ishika: "ઇશિકા",
  islam: "ઇસ્લામ",
  israr: "ઇસરાર",
  jannat: "જન્નત",
  jannatunnisha: "જન્નતુન્નિશા",
  javed: "જાવેદ",
  jayant: "જયંત",
  jayvant: "જયવંત",
  jebunnisha: "જેબુન્નિશા",
  jeel: "જીલ",
  jitu: "જીતુ",
  jiya: "જીયા",
  jiyan: "જીયાન",
  jyoti: "જ્યોતિ",
  jyotsna: "જ્યોત્સ્ના",
  kabir: "કબીર",
  kamini: "કામિની",
  kapde: "કાપડે",
  kartik: "કાર્તિક",
  kasim: "કાસીમ",
  kaushar: "કૌસર",
  kedar: "કેદાર",
  khairnar: "ખૈરનાર",
  khan: "ખાન",
  khushi: "ખુશી",
  kiran: "કિરણ",
  kishor: "કિશોર",
  komal: "કોમલ",
  krishna: "ક્રિષ્ના",
  krutika: "કૃતિકા",
  kuldip: "કુલદીપ",
  kureshi: "કુરેશી",
  labhu: "લાભુ",
  lata: "લતા",
  lax: "લક્ષ",
  laxman: "લક્ષ્મણ",
  lila: "લીલા",
  lucky: "લકી",
  luhar: "લુહાર",
  madhav: "માધવ",
  mahale: "મહાલે",
  mahamad: "મહમદ",
  mahek: "મહેક",
  mahera: "માહેરા",
  mahi: "માહી",
  mali: "માળી",
  mallah: "મલ્લાહ",
  manav: "માનવ",
  manisha: "મનીષા",
  manthan: "મંથન",
  manyar: "મનિયાર",
  marathe: "મરાઠે",
  mer: "મેર",
  mizba: "મિઝબા",
  mohit: "મોહિત",
  mohite: "મોહિતે",
  moni: "મોની",
  more: "મોરે",
  mosim: "મોસીમ",
  mubarak: "મુબારક",
  mubin: "મુબીન",
  muhammad: "મુહમ્મદ",
  mustakim: "મુસ્તકીમ",
  naisha: "નાયશા",
  naitik: "નૈતિક",
  najiya: "નાઝિયા",
  narayan: "નારાયણ",
  nasir: "નાસીર",
  nazma: "નઝમા",
  nibi: "નીબી",
  nikhil: "નિખિલ",
  nimmedar: "નિમ્મેદાર",
  nirmal: "નિર્મલ",
  nisha: "નિશા",
  nita: "નીતા",
  om: "ઓમ",
  pankesh: "પંકેશ",
  pardhi: "પારધી",
  parmar: "પરમાર",
  partik: "પાર્તિક",
  parvez: "પરવેઝ",
  patil: "પાટીલ",
  patni: "પટણી",
  piyush: "પિયુષ",
  prachi: "પ્રાચી",
  prajapati: "પ્રજાપતિ",
  prasad: "પ્રસાદ",
  prins: "પ્રિન્સ",
  pritesh: "પ્રિતેશ",
  priti: "પ્રીતિ",
  priyanka: "પ્રિયંકા",
  puna: "પુના",
  punam: "પૂનમ",
  purvi: "પૂર્વી",
  puspa: "પુષ્પા",
  radha: "રાધા",
  rahima: "રહીમા",
  rain: "રાઈન",
  ram: "રામ",
  rama: "રામા",
  ramjanali: "રમજાનઅલી",
  ramjit: "રામજીત",
  ratan: "રતન",
  raveena: "રવીના",
  ravi: "રવિ",
  reena: "રીના",
  rehana: "રેહાના",
  rekha: "રેખા",
  ritika: "રિતિકા",
  riyan: "રિયાન",
  rizavan: "રિઝવાન",
  ruhaan: "રુહાન",
  rukhsana: "રૂખસાના",
  rukshanabanu: "રૂકસાનાબાનુ",
  rupali: "રૂપાલી",
  ruzan: "રૂઝાન",
  sabana: "સબાના",
  safina: "સફીના",
  saheba: "સાહેબા",
  sajeda: "સાજેદા",
  sajid: "સાજીદ",
  salve: "સાળવે",
  samsana: "સમસાના",
  sangita: "સંગીતા",
  saniya: "સાનિયા",
  sarfraz: "સરફરાઝ",
  sarla: "સરલા",
  savita: "સવિતા",
  seema: "સીમા",
  shabnam: "શબનમ",
  shaif: "શૈફ",
  shanawaz: "શાનવાઝ",
  shiksha: "શિક્ષા",
  shimpi: "શિંપી",
  shinde: "શિંદે",
  shivani: "શિવાની",
  shraddha: "શ્રદ્ધા",
  shriramchandra: "શ્રીરામચંદ્ર",
  siddharth: "સિદ્ધાર્થ",
  sima: "સીમા",
  simabibi: "સીમાબીબી",
  snehi: "સ્નેહી",
  sohel: "સોહેલ",
  solanki: "સોલંકી",
  sonal: "સોનલ",
  sufiyan: "સુફિયાન",
  sumitra: "સુમિત્રા",
  sunanda: "સુનંદા",
  suraj: "સૂરજ",
  surekha: "સુરેખા",
  tabassum: "તબસ્સુમ",
  tabbsum: "તબસ્સુમ",
  tahoora: "તહૂરા",
  tanay: "તનય",
  tandel: "ટંડેલ",
  tariq: "તારિક",
  tasleem: "તસ્લીમ",
  thakor: "ઠાકોર",
  tina: "ટીના",
  tohit: "તોહિત",
  toufik: "તૌફીક",
  tulshiram: "તુલસીરામ",
  umarvaishya: "ઉમરવૈશ્ય",
  ummehani: "ઉમ્મેહાની",
  urvesh: "ઉર્વેશ",
  urvi: "ઉર્વી",
  usha: "ઉષા",
  ushabai: "ઉષાબાઈ",
  uzera: "ઉઝેરા",
  vadar: "વડાર",
  vaghari: "વાઘરી",
  vaishali: "વૈશાલી",
  vakkarmiya: "વક્કારમિયા",
  varanakar: "વરણકર",
  wankhade: "વાનખેડે",
  yadav: "યાદવ",
  yasir: "યાસીર",
  yug: "યુગ",
  yusuf: "યુસુફ",
  zaid: "ઝૈદ",
  zankhit: "ઝંખિત",
  zed: "ઝેદ",
  zohan: "ઝોહાન",
};

/** Suffixes handled as root + fixed Gujarati ending. */
export const GU_SUFFIXES: [string, string][] = [
  ["kumari", "કુમારી"],
  ["kumar", "કુમાર"],
  ["bhai", "ભાઇ"],
  ["ben", "બેન"],
  ["khan", "ખાન"],
];

export const NAME_SUFFIX_WORDS = new Set(["BHAI", "BEN", "KUMAR", "KUMARI"]);

export function pick(r: RawRow, ...keys: string[]): string {
  for (const key of keys) {
    const v = r[key];
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return "";
}

export function cleanName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** "RAKESH BHAI" → "RAKESHBHAI", "PRIYANSHI KUMARI" → "PRIYANSHIKUMARI". */
export function joinNameSuffixes(value: string): string {
  const words = cleanName(value).split(" ").filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    if (out.length && NAME_SUFFIX_WORDS.has(w.toUpperCase())) out[out.length - 1] += w;
    else out.push(w);
  }
  return out.join(" ");
}

export function titleCaseWords(value: string): string {
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

export function nameWord(value: string): string {
  return titleCaseWords(joinNameSuffixes(value));
}

export const DATE_RE = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/;

export function parseDob(v: unknown): string {
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

export function cleanMobile(v: unknown, gr = ""): string {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (/^[6-9]\d{9}$/.test(d)) return d;
  const g = String(gr || "").replace(/\D/g, "") || "0";
  return `9${g.padStart(9, "0")}`.slice(0, 10);
}

export function cleanAadhaar(v: unknown): string {
  return String(v || "").replace(/\D/g, "");
}

export function cleanEmail(raw: string): string | undefined {
  let e = raw.trim().toLowerCase().replace(/\s/g, "");
  if (!e || e === "@") return undefined;
  e = e
    .replace(/\.c0m$/, ".com")
    .replace(/@(gamail|gmali|gamai|gmai)\.com$/, "@gmail.com");
  if (!e.includes("@") && /gmail\.com$/.test(e)) e = e.replace(/gmail\.com$/, "@gmail.com");
  if (/^[^\s@]+@$/.test(e)) e += "gmail.com";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : undefined;
}

export const NUMERIC_BRANCH_BANKS = /^(SBIN|UBIN|PUNB|SDCB|BKID|MAHB|CBIN)/;

export function cleanIfsc(raw: string, accountNumber: string): string {
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

export function bankNameFromIfsc(ifsc: string): string {
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
export function spaceOutHolder(holder: string, parts: string[]): string {
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
export const untranslatedWords = new Set<string>();

export function guRoot(root: string): string {
  if (GU_WORD_OVERRIDES[root]) return GU_WORD_OVERRIDES[root]!;
  untranslatedWords.add(root);
  return transliterateToGujarati(root);
}

export function guWord(word: string): string {
  const lower = word.toLowerCase();
  if (GU_WORD_OVERRIDES[lower]) return GU_WORD_OVERRIDES[lower]!;
  for (const [suffix, gu] of GU_SUFFIXES) {
    if (lower.endsWith(suffix) && lower.length - suffix.length >= 2) {
      return guRoot(lower.slice(0, -suffix.length)) + gu;
    }
  }
  return guRoot(lower);
}

export function transliterateName(en: string): string | null {
  const e = cleanName(en);
  if (!e || e.toUpperCase() === "NA") return null;
  return e.split(" ").filter(Boolean).map(guWord).join(" ") || null;
}
export function cleanCaste(raw: string, surname: string): string {
  const c = cleanName(raw).replace(/^(HINDU|HINDI|MUSLIM)\s+/i, "");
  return titleCaseWords(c) || surname;
}

export function inferCategory(rawCategory: string, caste: string, surname: string): {
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

export async function writeMappedWorkbook(rows: Record<string, unknown>[], outPath: string) {
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
