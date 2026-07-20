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

export function isGsebErrorPage(html: string): boolean {
  return (
    /An error occurred while processing your request/i.test(html) ||
    /<h1[^>]*>\s*Error\.?\s*<\/h1>/i.test(html) ||
    /Invalid\s+Seat/i.test(html) ||
    /invalid\s+seat/i.test(html) ||
    /Invalid\s+Captcha/i.test(html) ||
    /No Record Found/i.test(html) ||
    /Seat\s*No\.?\s*is\s*not\s*valid/i.test(html)
  );
}

export function hasValidGsebResult(parsed: {
  percentage?: number | null;
  studentName?: string | null;
  result?: string | null;
  subjects?: Record<string, number | null>;
}): boolean {
  if (parsed.percentage != null && Number.isFinite(parsed.percentage)) return true;
  const subVals = Object.values(parsed.subjects || {}).filter((v) => v != null);
  if (subVals.length >= 3) return true;
  if (parsed.studentName && parsed.studentName.length > 2 && parsed.result) return true;
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

export function parseResultHtml(html: string): Omit<GsebResult, "seatNo" | "prefix" | "number" | "rawHtml"> {
  const pctMatch =
    html.match(/Percentage\s*[:\-]?\s*<[^>]*>\s*([\d.]+)/i) ||
    html.match(/PERCENTAGE[^0-9]*([\d.]+)/i) ||
    html.match(/Overall\s*[%]?\s*[:\-]?\s*([\d.]+)/i) ||
    html.match(/([\d]{2,3}\.[\d]{1,2})\s*%/);
  const gradeMatch =
    html.match(/Grade\s*[:\-]?\s*<[^>]*>\s*([A-Z0-9]+)/i) ||
    html.match(/\b(A1|A2|B1|B2|C1|C2|D|E|F)\b/);
  const nameMatch = html.match(/(?:Name|Student\s*Name)\s*[:\-]?\s*<[^>]*>\s*([^<]+)/i);
  const schoolMatch = html.match(/School\s*[:\-]?\s*<[^>]*>\s*([^<]+)/i);
  const resultMatch = html.match(/Result\s*[:\-]?\s*<[^>]*>\s*([^<]+)/i);

  const subjects = parseSubjectMarksFromHtml(html);
  const subVals = Object.values(subjects).filter((v) => v != null) as number[];
  const totalMarks = subVals.length ? subVals.reduce((a, b) => a + b, 0) : null;

  let percentage = pctMatch ? parseFloat(pctMatch[1]) : null;
  if (percentage == null && subVals.length >= 4) {
    percentage = Math.round((subVals.reduce((a, b) => a + b, 0) / subVals.length) * 100) / 100;
  }

  const resultText = resultMatch?.[1]?.trim() || null;
  const normalizedResult =
    resultText ||
    (percentage != null ? (percentage >= 35 ? "પાસ" : "નાપાસ") : null);

  return {
    percentage,
    grade: gradeMatch?.[1] ?? null,
    studentName: nameMatch?.[1]?.trim() ?? null,
    schoolName: schoolMatch?.[1]?.trim() ?? null,
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

  if (!resultRes.ok || isGsebErrorPage(resultHtml)) {
    if (/Invalid\s+Seat|invalid\s+seat/i.test(resultHtml)) {
      throw new Error(`GSEB invalid seat — ${seatLabel} not on official portal`);
    }
    throw new Error(`No GSEB result for ${seatLabel} — invalid or not published`);
  }

  const parsed = parseResultHtml(resultHtml);
  if (!hasValidGsebResult(parsed)) {
    throw new Error(`GSEB returned no marks for ${seatLabel}`);
  }

  return resultHtml;
}
