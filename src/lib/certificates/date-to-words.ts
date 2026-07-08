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

/** DD/MM/YYYY → words */
export function dateToWords(dateStr: string, lang: "en" | "gu" = "en"): string {
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length < 3) return dateStr;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (isNaN(d) || isNaN(m) || isNaN(y)) return dateStr;

  const monthsEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthsGu = ["જાન્યુઆરી", "ફેબ્રુઆરી", "માર્ચ", "એપ્રિલ", "મે", "જૂન", "જુલાઈ", "ઑગસ્ટ", "સપ્ટેમ્બર", "ઑક્ટોબર", "નવેમ્બર", "ડિસેમ્બર"];

  const day = twoDigits(d, lang);
  const month = lang === "en" ? monthsEn[m - 1] : monthsGu[m - 1];
  const year = lang === "en" ? `${y}` : `${y}`;

  if (lang === "gu") {
    return `${day} ${month} ${year}`;
  }
  return `${day} ${month} ${year}`;
}

export function studentFullName(s: { firstName: string; middleName?: string | null; surname: string }): string {
  return [s.firstName, s.middleName, s.surname].filter(Boolean).join(" ");
}

export function formatToday(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
