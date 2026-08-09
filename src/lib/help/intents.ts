import type { HelpLang } from "@/lib/help/knowledge-base";

export type HelpIntent =
  | "greeting"
  | "thanks"
  | "howto"
  | "where"
  | "troubleshoot"
  | "clarify"
  | "steps"
  | "escalate"
  | "affirm"
  | "negate"
  | "chitchat"
  | "unknown";

const INTENT_PATTERNS: { intent: HelpIntent; re: RegExp; weight: number }[] = [
  {
    intent: "escalate",
    re: /staff|human|manual|help desk|સ્ટાફ|મેન્યુઅલ|વાત\s*કર|स्टाफ|मैन्युअल|बात\s*कर/i,
    weight: 10,
  },
  {
    intent: "thanks",
    re: /^(thanks|thank you|thx|dhanyavad|शुक्रिया|धन्यवाद|આભાર|ધન્યવાદ)\b/i,
    weight: 9,
  },
  {
    intent: "greeting",
    re: /^(hi|hello|hey|namaste|namaskar|kem cho|hola|હેલો|નમસ્તે|नमस्ते|नमस्कार)\b/i,
    weight: 9,
  },
  {
    intent: "clarify",
    re: /samajh|samjh|nahi aaya|not understand|don'?t understand|confused|explain|fir se|dubara|સમજાયું નહીં|સમજાવો|સરળ|समझ नहीं|दोबारा|विस्तार|आसान/i,
    weight: 8,
  },
  {
    intent: "steps",
    re: /step|pagla|પગલાં|चरण|step by step|one by one|ક્રમથી|क्रम से/i,
    weight: 8,
  },
  {
    intent: "troubleshoot",
    re: /not work|doesn't work|error|issue|problem|bug|missing|gone|disappear|blank|can't|cannot|unable|fail|nahi aa|dikhat|button nahi|data nahi|ખોટું|કામ નથી|ભૂલ|સમસ્યા|ગાયબ|દેખાતું નથી|નથી આવતું|काम नहीं|गलत|समस्या|नहीं दिख|गायब|एरर/i,
    weight: 8,
  },
  {
    intent: "where",
    re: /where|kahan|kyāre|ક્યાં|ક્યારે|कहाँ|कहां|find|locate|open page|menu/i,
    weight: 6,
  },
  {
    intent: "howto",
    re: /how|kaise|કેવી રીતે|कैसे|guide|help me|batao|કહો|बताओ|karu|કરું|करूँ/i,
    weight: 6,
  },
  {
    intent: "affirm",
    re: /^(h+|ha+|haan|yes|ok|okay|ji|haanji|sahi|theek|જી|હા|ઓકે|हाँ|ठीक|हां)(\s|$|[!.])/i,
    weight: 7,
  },
  {
    intent: "negate",
    re: /^(no|nahi|na|nope|નહીં|नहीं)(\s|$|[!.])/i,
    weight: 7,
  },
];

export function detectHelpIntent(raw: string): { intent: HelpIntent; score: number } {
  const q = raw.trim();
  if (!q) return { intent: "unknown", score: 0 };
  // Exact short affirm/negate (Indic-safe)
  if (/^(હા|हाँ|हां|ji|હા જી|हाँ जी)$/i.test(q)) {
    return { intent: "affirm", score: 9 };
  }
  if (/^(ના|नहीं|ना|no)$/i.test(q)) {
    return { intent: "negate", score: 9 };
  }
  let best: HelpIntent = "unknown";
  let bestScore = 0;
  for (const p of INTENT_PATTERNS) {
    if (p.re.test(q) && p.weight > bestScore) {
      best = p.intent;
      bestScore = p.weight;
    }
  }
  if (best === "unknown" && q.length < 40) {
    // Short noun-ish queries → treat as where/howto hybrid
    return { intent: "howto", score: 2 };
  }
  return { intent: best, score: bestScore };
}

/** Expand query with multilingual synonyms before topic scoring */
const SYNONYM_GROUPS: string[][] = [
  ["student", "students", "vidyarthi", "વિદ્યાર્થી", "विद्यार्थी", "छात्र"],
  ["attendance", "hajri", "હાજરી", "हाजरी", "उपस्थिति", "present", "absent"],
  ["scholarship", "shishyavrutti", "શિષ્યવૃત્તિ", "छात्रवृत्ति", "digital gujarat", "dg"],
  ["timetable", "time table", "schedule", "સમયપત્રક", "समयसारणी"],
  ["result", "results", "marks", "exam", "ગુણ", "પરીક્ષા", "अंक", "परीक्षा", "परिणाम"],
  ["accounting", "accounts", "voucher", "ledger", "fy", "financial year", "હિસાબ", "લેખાકારી", "हिसाब", "वित्तीय वर्ष"],
  ["certificate", "certificates", "bonafide", "પ્રમાણપત્ર", "प्रमाणपत्र"],
  ["id card", "idcard", "identity", "આઈડી કાર્ડ", "आईडी कार्ड"],
  ["letterhead", "letter head", "લેટરહેડ", "लेटरहेड"],
  ["roll", "roll number", "રોલ નંબર", "रोल नंबर"],
  ["subject", "subjects", "વિષય", "विषय"],
  ["password", "login", "profile", "પાસવર્ડ", "पासवर्ड", "लॉगिन"],
  ["staff", "teacher", "employee", "કર્મચારી", "શિક્ષક", "स्टाफ", "शिक्षक"],
  ["chat", "message", "ચેટ", "चैट"],
  ["dashboard", "home", "ડેશબોર્ડ", "होम", "डैशबोर्ड"],
  ["import", "excel", "csv", "bulk", "આયાત", "आयात"],
  ["ca", "audit", "auditor", "ઓડિટ", "ऑडिट"],
];

export function expandQueryWithSynonyms(query: string): string {
  const lower = query.toLowerCase();
  const extras: string[] = [];
  for (const group of SYNONYM_GROUPS) {
    if (group.some((w) => lower.includes(w.toLowerCase()))) {
      extras.push(...group);
    }
  }
  if (!extras.length) return query;
  return `${query} ${[...new Set(extras)].join(" ")}`;
}

export function intentModeLabel(intent: HelpIntent, lang: HelpLang): string | null {
  if (intent === "troubleshoot") {
    return lang === "gu"
      ? "સમસ્યા તપાસ"
      : lang === "hi"
        ? "समस्या जाँच"
        : "Troubleshooting";
  }
  if (intent === "steps") {
    return lang === "gu" ? "પગલાં" : lang === "hi" ? "चरण" : "Steps";
  }
  return null;
}
