/** Excel serial or common date strings → DD/MM/YYYY */
export function parseImportDate(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "number" && Number.isFinite(value)) {
    const serial = value;
    if (serial > 1 && serial < 200000) {
      const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      const d = utc.getUTCDate();
      const m = utc.getUTCMonth() + 1;
      const y = utc.getUTCFullYear();
      return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
    }
  }

  const s = String(value).trim();
  if (!s) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }

  const slash = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (slash) {
    const [, a, b, c] = slash;
    let day = a;
    let month = b;
    let year = c;
    if (year.length === 2) year = `20${year}`;
    if (parseInt(a, 10) > 12 && parseInt(b, 10) <= 12) {
      day = a;
      month = b;
    } else if (parseInt(b, 10) > 12) {
      day = b;
      month = a;
    }
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }

  return s;
}

export function normalizeGender(value: unknown): string {
  const s = String(value || "").trim().toLowerCase();
  if (["m", "male", "boy", "પુરુષ", "purush"].includes(s)) return "Male";
  if (["f", "female", "girl", "સ્ત્રી", "stri"].includes(s)) return "Female";
  if (["t", "transgender", "other"].includes(s)) return "Transgender";
  return String(value || "").trim();
}
