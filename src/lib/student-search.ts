/** Navbar + student list search: GR, roll, and full name (EN + GU). */

const NAME_FIELDS = [
  "firstName",
  "middleName",
  "surname",
  "firstNameGu",
  "middleNameGu",
  "surnameGu",
  "aadhaarName",
  "aadhaarNameGu",
  "fatherName",
  "fatherNameGu",
  "motherName",
  "motherNameGu",
  "guardianName",
  "guardianNameGu",
] as const;

const ID_FIELDS = [
  "grNumber",
  "rollNumber",
  "aadhaarNumber",
  "mobileNumber",
  "childUid",
  "apaarId",
  "panNumber",
] as const;

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function tokenVariants(token: string): string[] {
  const lower = token.toLowerCase();
  const upper = token.toUpperCase();
  const titled = token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
  return uniqueStrings([token, lower, upper, titled]);
}

function fieldContains(field: string, value: string) {
  return { [field]: { contains: value } };
}

function tokenClause(token: string): Record<string, unknown> {
  const or: Record<string, unknown>[] = [];
  for (const variant of tokenVariants(token)) {
    for (const field of NAME_FIELDS) {
      or.push(fieldContains(field, variant));
    }
  }
  for (const field of ID_FIELDS) {
    or.push(fieldContains(field, token));
    or.push({ [field]: token });
  }

  const digits = token.replace(/\D/g, "");
  if (digits) {
    or.push({ grNumber: digits }, { grNumber: { contains: digits } });
    or.push({ rollNumber: digits }, { rollNumber: { contains: digits } });
    const stripped = digits.replace(/^0+/, "") || "0";
    if (stripped !== digits) {
      or.push({ grNumber: stripped }, { grNumber: { contains: stripped } });
    }
  }

  return { OR: or };
}

/** Prisma `where` fragment for student text search (name, GR, roll, IDs). */
export function studentSearchWhere(search: string): Record<string, unknown> | null {
  const q = String(search || "").trim();
  if (!q) return null;
  const tokens = q.split(/\s+/).filter(Boolean).slice(0, 6);
  if (tokens.length === 1) return tokenClause(tokens[0]);
  return { AND: tokens.map(tokenClause) };
}

export function looksLikeGrQuery(search: string): boolean {
  const q = String(search || "").trim();
  if (!q) return false;
  const digits = q.replace(/\D/g, "");
  if (!digits) return false;
  const letters = q.replace(/[0-9\s./-]/g, "");
  return digits.length >= 1 && letters.length === 0;
}
