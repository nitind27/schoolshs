/** Shared GSEB result.gseb.org helpers */

export type GsebResult = {
  seatNo: string;
  prefix: string;
  number: string;
  percentage: number | null;
  grade: string | null;
  result: string | null;
  studentName: string | null;
  schoolName: string | null;
  subjects: Record<string, number | null>;
  totalMarks: number | null;
  rawHtml: string;
};

export function parseCaptcha(html: string): { question: string; answer: string; hdnCaptcha: string } | null {
  const qMatch =
    html.match(/Total of\s+(\d+)\s*(?:&#x2B;|&#43;|\+)\s*(\d+)\s*=/i) ||
    html.match(/lblCaptcha[^>]*>\s*Total of\s+(\d+)\s*(?:&#x2B;|&#43;|\+)\s*(\d+)\s*=/i);

  const hdnMatch =
    html.match(/name=["']hdnCaptcha["'][^>]*\bvalue=["']([^"']+)["']/i) ||
    html.match(/\bvalue=["']([^"']+)["'][^>]*name=["']hdnCaptcha["']/i) ||
    html.match(/id=["']hdnCaptchaAns["'][^>]*\bvalue=["']([^"']+)["']/i);

  if (!qMatch || !hdnMatch) return null;
  const answer = String(Number(qMatch[1]) + Number(qMatch[2]));
  return { question: `${qMatch[1]} + ${qMatch[2]}`, answer, hdnCaptcha: hdnMatch[1] };
}

export function extractToken(html: string): string | null {
  const m =
    html.match(/name=["']__RequestVerificationToken["'][^>]*\bvalue=["']([^"']+)["']/i) ||
    html.match(/\bvalue=["']([^"']+)["'][^>]*name=["']__RequestVerificationToken["']/i);
  return m?.[1] ?? null;
}

/** Still on the search form (captcha page) — not a result sheet */
export function isGsebSearchForm(html: string): boolean {
  return (
    /name=["']InitialCharacter["']/i.test(html) ||
    /name=["']SeatNo["']/i.test(html) ||
    /id=["']SeatNo["']/i.test(html)
  ) && /name=["']Captcha["']|lblCaptcha|hdnCaptcha/i.test(html);
}

export function isGsebErrorPage(html: string): boolean {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  return (
    /An error occurred while processing your request/i.test(html) ||
    /<h1[^>]*>\s*Error\.?\s*<\/h1>/i.test(html) ||
    /Invalid\s+Seat/i.test(text) ||
    /invalid\s+seat/i.test(text) ||
    /Seat\s*No\.?\s*(is\s*)?not\s*valid/i.test(text) ||
    /Invalid\s+Captcha/i.test(text) ||
    /No Record Found/i.test(text) ||
    /Record\s+not\s+found/i.test(text) ||
    /પરિણામ\s*મળ્યું\s*નથી/i.test(text) ||
    /સીટ\s*નંબર\s*(ખોટો|અમાન્ય|મળ્યો\s*નથી)/i.test(text) ||
    /અમાન્ય\s*સીટ/i.test(text) ||
    /Seat\s*number\s*(is\s*)?(invalid|incorrect|not\s*found)/i.test(text)
  );
}

export function looksLikeGsebResultPage(html: string): boolean {
  if (isGsebErrorPage(html) || isGsebSearchForm(html)) return false;
  // Real result pages usually show percentage / result / subject mark table
  const hasPctLabel = /Percentage|PERCENTAGE|ટકાવારી/i.test(html);
  const hasResultLabel = /\bResult\b|પરિણામ|પાસ|નાપાસ|PASS|FAIL/i.test(html);
  const hasNameLabel = /Student\s*Name|Candidate\s*Name|વિદ્યાર્થી/i.test(html);
  const hasSubjectTable = /gujarati|english|mathematics|science|ગુજરાતી|અંગ્રેજી|ગણિત/i.test(html);
  return (hasPctLabel || hasResultLabel) && (hasNameLabel || hasSubjectTable);
}

export function hasValidGsebResult(parsed: {
  percentage?: number | null;
  studentName?: string | null;
  result?: string | null;
  subjects?: Record<string, number | null>;
  schoolName?: string | null;
}): boolean {
  const subVals = Object.values(parsed.subjects || {}).filter((v) => v != null);
  const hasSubjects = subVals.length >= 3;
  const hasName = !!(parsed.studentName && parsed.studentName.replace(/\s+/g, "").length >= 3);
  const hasExplicitResult = !!(parsed.result && /pass|fail|પાસ|નાપાસ|atkt|a\.?t\.?k\.?t/i.test(parsed.result));
  const pctOk =
    parsed.percentage != null &&
    Number.isFinite(parsed.percentage) &&
    parsed.percentage >= 0 &&
    parsed.percentage <= 100;

  // Never accept percentage alone — that caused fake PASS on error/form pages
  if (hasSubjects && (pctOk || hasName || hasExplicitResult)) return true;
  if (hasName && (pctOk || hasExplicitResult)) return true;
  if (hasName && hasSubjects) return true;
  return false;
}

const SUBJECT_PATTERNS: { code: string; patterns: RegExp[] }[] = [
  { code: "GUJ", patterns: [/gujarati/i, /ગુજરાતી/] },
  { code: "ENG", patterns: [/english/i, /અંગ્રેજી/] },
  { code: "HIN", patterns: [/hindi/i, /હિન્દી/] },
  { code: "MATH", patterns: [/mathematics/i, /maths/i, /ગણિત/] },
  { code: "SCI", patterns: [/science/i, /વિજ્ઞાન/] },
  { code: "SS", patterns: [/social\s*science/i, /સા\.?\s*વિ/i] },
  { code: "SAN", patterns: [/sanskrit/i, /સંસ્કૃત/] },
  { code: "ECO", patterns: [/economics/i, /અર્થ/i] },
  { code: "BOM", patterns: [/organisation\s*of\s*commerce/i, /વા\.?\s*વ્ય/i, /business/i] },
  { code: "STAT", patterns: [/statistics/i, /આંકડા/] },
  { code: "ACC", patterns: [/account/i, /નામું/] },
  { code: "SP", patterns: [/secretarial/i, /એસ\.?\s*પી/i] },
  { code: "HIS", patterns: [/history/i, /ઇતિહાસ/] },
  { code: "GEO", patterns: [/geography/i, /ભૂગોળ/] },
  { code: "PSY", patterns: [/psychology/i, /મનો/i] },
];

function matchSubjectCode(label: string): string | null {
  const t = label.trim();
  if (!t) return null;
  for (const { code, patterns } of SUBJECT_PATTERNS) {
    if (patterns.some((p) => p.test(t))) return code;
  }
  return null;
}

/** Parse subject marks from GSEB result HTML table rows */
export function parseSubjectMarksFromHtml(html: string): Record<string, number | null> {
  const subjects: Record<string, number | null> = {};
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const cells = [...rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
      c[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    );
    if (cells.length < 2) continue;
    for (let i = 0; i < cells.length - 1; i++) {
      const code = matchSubjectCode(cells[i]);
      const markStr = cells[i + 1].match(/\b(\d{1,3})\b/);
      if (code && markStr) {
        const mark = Number(markStr[1]);
        if (mark >= 0 && mark <= 100) subjects[code] = mark;
      }
    }
  }
  return subjects;
}

function extractLabeledValue(html: string, labels: RegExp): string | null {
  const re = new RegExp(
    `(?:${labels.source})\\s*[:\\-]?\\s*(?:<[^>]*>\\s*)*([^<\\n]{1,80})`,
    "i",
  );
  const m = html.match(re);
  if (!m?.[1]) return null;
  const v = m[1].replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  if (!v || /^(n\/?a|-|—)$/i.test(v)) return null;
  return v;
}

export function parseResultHtml(html: string): Omit<GsebResult, "seatNo" | "prefix" | "number" | "rawHtml"> {
  // Refuse to invent results from search/error pages
  if (isGsebErrorPage(html) || isGsebSearchForm(html) || !looksLikeGsebResultPage(html)) {
    return {
      percentage: null,
      grade: null,
      studentName: null,
      schoolName: null,
      result: null,
      subjects: {},
      totalMarks: null,
    };
  }

  const pctRaw =
    extractLabeledValue(html, /Percentage|PERCENTAGE|Overall\s*%?|ટકાવારી/) ||
    (() => {
      const m = html.match(/Percentage\s*[:\-]?\s*<[^>]*>\s*([\d.]+)/i);
      return m?.[1] ?? null;
    })();

  let percentage: number | null = null;
  if (pctRaw) {
    const n = parseFloat(pctRaw.replace(/[^\d.]/g, ""));
    if (Number.isFinite(n) && n >= 0 && n <= 100) percentage = n;
  }

  const gradeRaw = extractLabeledValue(html, /Grade|ગ્રેડ/);
  const grade =
    gradeRaw && /^(A1|A2|B1|B2|C1|C2|C|D|E|F)$/i.test(gradeRaw.trim())
      ? gradeRaw.trim().toUpperCase()
      : null;

  const studentName =
    extractLabeledValue(html, /Student\s*Name|Candidate\s*Name|Name\s*of\s*(?:the\s*)?Student|વિદ્યાર્થી(?:નું)?\s*નામ/) ||
    null;
  const schoolName = extractLabeledValue(html, /School(?:\s*Name)?|શાળા/) || null;
  const resultText = extractLabeledValue(html, /Result|પરિણામ/) || null;

  const subjects = parseSubjectMarksFromHtml(html);
  const subVals = Object.values(subjects).filter((v) => v != null) as number[];
  const totalMarks = subVals.length ? subVals.reduce((a, b) => a + b, 0) : null;

  // Only derive % from subjects when we already trust this is a result page AND have enough marks
  if (percentage == null && subVals.length >= 5) {
    percentage = Math.round((subVals.reduce((a, b) => a + b, 0) / subVals.length) * 100) / 100;
  }

  let normalizedResult: string | null = resultText;
  if (!normalizedResult && percentage != null && (studentName || subVals.length >= 3)) {
    normalizedResult = percentage >= 35 ? "પાસ" : "નાપાસ";
  }

  return {
    percentage,
    grade,
    studentName,
    schoolName,
    result: normalizedResult,
    subjects,
    totalMarks,
  };
}

export function cookieHeaderFromResponse(res: Response): string {
  const cookies = res.headers.getSetCookie?.() ?? [];
  return cookies.map((c) => c.split(";")[0]).join("; ");
}

export async function postGsebForm(opts: {
  pageUrl: string;
  postUrl: string;
  prefix: string;
  seatNumber: string;
  digitLen: 6 | 7;
}): Promise<string> {
  const homeRes = await fetch(opts.pageUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  if (!homeRes.ok) throw new Error("GSEB portal unreachable");
  const homeHtml = await homeRes.text();

  const captcha = parseCaptcha(homeHtml);
  const token = extractToken(homeHtml);
  if (!captcha) throw new Error("Could not read GSEB captcha — portal may have changed");
  if (!token) throw new Error("Could not read GSEB security token — try again");

  const cookieHeader = cookieHeaderFromResponse(homeRes);

  const body = new URLSearchParams({
    InitialCharacter: opts.prefix,
    SeatNo: opts.seatNumber,
    Captcha: captcha.answer,
    hdnCaptcha: captcha.hdnCaptcha,
    __RequestVerificationToken: token,
    go: "  Go  ",
  });

  const resultRes = await fetch(opts.postUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Cookie: cookieHeader,
      Referer: opts.pageUrl,
    },
    body: body.toString(),
    redirect: "follow",
  });

  const resultHtml = await resultRes.text();
  const seatLabel = `${opts.prefix}${opts.seatNumber}`;

  if (!resultRes.ok) {
    throw new Error(`GSEB portal error for ${seatLabel}`);
  }

  if (isGsebErrorPage(resultHtml)) {
    if (/Invalid\s+Seat|invalid\s+seat|Seat\s*No\.?\s*(is\s*)?not\s*valid|અમાન્ય\s*સીટ|સીટ\s*નંબર/i.test(resultHtml)) {
      throw new Error(`Invalid GSEB seat — ${seatLabel} not found on official portal`);
    }
    throw new Error(`No GSEB result for ${seatLabel} — invalid seat or not published`);
  }

  // Invalid seat often just redisplays the search form
  if (isGsebSearchForm(resultHtml)) {
    throw new Error(`Invalid GSEB seat — ${seatLabel} rejected by result.gseb.org`);
  }

  if (!looksLikeGsebResultPage(resultHtml)) {
    throw new Error(`GSEB did not return a result page for ${seatLabel}`);
  }

  const parsed = parseResultHtml(resultHtml);
  if (!hasValidGsebResult(parsed)) {
    throw new Error(`Invalid GSEB seat or empty result for ${seatLabel}`);
  }

  return resultHtml;
}
