const onesEn = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tensEn = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const onesGu = ["", "એક", "બે", "ત્રણ", "ચાર", "પાંચ", "છ", "સાત", "આઠ", "નવ", "દસ", "અગિયાર", "બાર", "તેર", "ચૌદ", "પંદર", "સોળ", "સત્તર", "અઢાર", "ઓગણીસ"];
const tensGu = ["", "", "વીસ", "ત્રીસ", "ચાલીસ", "પચાસ", "સાઠ", "સિત્તેર", "એંસી", "નેવું"];

function twoDigits(n: number, lang: "en" | "gu"): string {
  if (n < 20) return lang === "en" ? onesEn[n] : onesGu[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  const tWord = lang === "en" ? tensEn[t] : tensGu[t];
  const oWord = lang === "en" ? onesEn[o] : onesGu[o];
  return oWord ? `${tWord} ${oWord}` : tWord;
}

const ordinalOnesEn = ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth"];
const ordinalTensEn = ["", "", "Twentieth", "Thirtieth"];

function dayOrdinalEn(n: number): string {
  if (n < 20) return ordinalOnesEn[n] ?? String(n);
  const t = Math.floor(n / 10);
  const o = n % 10;
  if (o === 0) return ordinalTensEn[t] ?? String(n);
  return `${tensEn[t]} ${ordinalOnesEn[o]}`;
}

function yearWordsEn(y: number): string {
  if (y <= 0 || y > 9999) return String(y);
  const thousands = Math.floor(y / 1000);
  const hundreds = Math.floor((y % 1000) / 100);
  const rest = y % 100;
  const parts: string[] = [];
  if (thousands) parts.push(`${onesEn[thousands]} Thousand`);
  if (hundreds) parts.push(`${onesEn[hundreds]} Hundred`);
  if (rest) parts.push(twoDigits(rest, "en"));
  return parts.join(" ");
}

/** DD/MM/YYYY → words (en: "Fourth January Two Thousand Fourteen") */
export function dateToWords(dateStr: string, lang: "en" | "gu" = "en"): string {
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length < 3) return dateStr;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (isNaN(d) || isNaN(m) || isNaN(y)) return dateStr;

  const monthsEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthsGu = ["જાન્યુઆરી", "ફેબ્રુઆરી", "માર્ચ", "એપ્રિલ", "મે", "જૂન", "જુલાઈ", "ઑગસ્ટ", "સપ્ટેમ્બર", "ઑક્ટોબર", "નવેમ્બર", "ડિસેમ્બર"];

  if (lang === "gu") {
    return `${twoDigits(d, "gu")} ${monthsGu[m - 1]} ${y}`;
  }
  return `${dayOrdinalEn(d)} ${monthsEn[m - 1]} ${yearWordsEn(y)}`;
}

export function studentFullName(s: {
  firstName: string;
  middleName?: string | null;
  surname: string;
  fatherName?: string | null;
}): string {
  const middle =
    (s.middleName && String(s.middleName).trim()) ||
    (s.fatherName && String(s.fatherName).trim()) ||
    "";
  const weak = !middle || middle === "—" || middle.toUpperCase() === "NA";
  return [s.firstName, weak ? null : middle, s.surname].filter(Boolean).join(" ");
}

export function formatToday(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
