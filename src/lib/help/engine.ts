import type { UserRole } from "@/lib/roles";
import { getRoleHome, isUserRole } from "@/lib/roles";
import {
  HELP_QUICK_PROMPTS,
  HELP_TOPICS,
  type HelpLang,
  type HelpTopic,
} from "@/lib/help/knowledge-base";

export type { HelpLang };

const GUJARATI_RE = /[\u0A80-\u0AFF]/;
const DEVANAGARI_RE = /[\u0900-\u097F]/;

export function detectHelpLang(text: string, fallback: HelpLang = "gu"): HelpLang {
  if (GUJARATI_RE.test(text)) return "gu";
  if (DEVANAGARI_RE.test(text)) return "hi";
  const t = text.toLowerCase();
  if (/\b(kyu|kya|kaise|kahan|mujhe|nahi|chahiye|dikhao|batao)\b/.test(t)) return "hi";
  if (/\b(kem|kyu|shu|kyare|mane|joie|batavo|kyaare)\b/.test(t)) return "gu";
  return fallback;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function topicAllowed(topic: HelpTopic, role: UserRole) {
  return topic.roles.includes(role);
}

function scoreTopic(query: string, topic: HelpTopic): number {
  const q = normalize(query);
  if (!q) return 0;
  let score = 0;
  const tokens = q.split(" ").filter((t) => t.length > 1);

  for (const kw of topic.keywords) {
    const k = normalize(kw);
    if (!k) continue;
    if (q.includes(k)) score += k.length > 6 ? 6 : 4;
    for (const tok of tokens) {
      if (k.includes(tok) || tok.includes(k)) score += 2;
    }
  }

  for (const lang of ["en", "hi", "gu"] as HelpLang[]) {
    const title = normalize(topic.title[lang]);
    if (title && q.includes(title)) score += 5;
  }

  return score;
}

/** Map shared paths to the correct panel path for this role. */
function canonicalizeHref(href: string, role: UserRole): string {
  if (role === "teacher") {
    if (href === "/attendance" || href.startsWith("/attendance/")) return "/teacher/attendance";
    if (href === "/timetable") return "/teacher/timetable";
    if (href === "/students") return "/teacher/students";
    if (href === "/students/board-records") return "/teacher/board-records";
  }
  if (role === "clerk" && href === "/dashboard") return "/clerk";
  if (role === "school_admin" && href === "/clerk") return "/dashboard";
  if (role === "school_admin" && href.startsWith("/clerk/")) {
    // Clerk-only pages → nearest admin equivalent
    if (href.startsWith("/clerk/scholarship")) return "/bulk-submit";
    return "/dashboard";
  }
  return href;
}

/**
 * Strict panel isolation: never send another role's panel URLs.
 * Admin must not get /teacher/*, teacher must not get /clerk/* or admin ops, etc.
 */
export function isHrefAllowedForRole(href: string, role: UserRole): boolean {
  if (!href.startsWith("/")) return false;
  if (href === "/profile" || href.startsWith("/profile/")) {
    return role !== "super_admin";
  }

  switch (role) {
    case "super_admin":
      return href.startsWith("/admin");
    case "school_admin":
      return (
        !href.startsWith("/admin") &&
        !href.startsWith("/teacher") &&
        !href.startsWith("/clerk") &&
        !href.startsWith("/ca") &&
        !href.startsWith("/student")
      );
    case "clerk":
      return (
        !href.startsWith("/admin") &&
        !href.startsWith("/teacher") &&
        !href.startsWith("/ca") &&
        !href.startsWith("/student")
      );
    case "teacher":
      return (
        href.startsWith("/teacher") ||
        href === "/results" ||
        href.startsWith("/results/") ||
        href === "/chat" ||
        href.startsWith("/chat/") ||
        href.startsWith("/classes") ||
        href.startsWith("/api/certificates") ||
        href.startsWith("/certificates/class-register")
      );
    case "ca":
      return href.startsWith("/ca") || href.startsWith("/accounting");
    case "student":
      return href.startsWith("/student");
    default:
      return false;
  }
}

function filterHrefForRole(href: string | undefined, role: UserRole): string | undefined {
  if (!href) return undefined;
  const mapped = canonicalizeHref(href, role);
  if (!isHrefAllowedForRole(mapped, role)) return undefined;
  return mapped;
}

/** Public helper for UI — strips any cross-panel URL. */
export function sanitizeHelpHref(href: string | undefined, role: string | null | undefined): string | undefined {
  if (!href || !role) return undefined;
  if (!isUserRole(role)) return undefined;
  return filterHrefForRole(href, role);
}

/** Alias used by conversational engine */
export function filterHrefForRolePublic(href: string | undefined, role: UserRole): string | undefined {
  return filterHrefForRole(href, role);
}

const FALLBACK: Record<HelpLang, string> = {
  en: "I can help you find pages and explain features for your role only. Try asking about things in your panel — or tap a suggestion below.",
  hi: "मैं सिर्फ आपके पैनल की चीज़ें ढूँढने में मदद कर सकता हूँ। अपने पैनल के बारे में पूछें — या नीचे सुझाव चुनें।",
  gu: "હું માત્ર તમારા પેનલની વસ્તુઓ શોધવામાં મદદ કરી શકું. તમારા પેનલ વિશે પૂછો — અથવા નીચે સૂચન પસંદ કરો.",
};

const GREET: Record<HelpLang, Record<UserRole, string>> = {
  en: {
    super_admin: "Hi! Ask me anything about platform/school management — like a colleague. If something’s unclear, say “explain again” or talk to staff.",
    school_admin: "Hi! Ask freely about students, scholarship, attendance, accounts, certificates… I’ll explain step by step. If you don’t understand, ask again — or tap Talk to staff for a manual reply.",
    teacher: "Hi! Ask about your class, attendance, timetable, marks… I’ll answer like a person. Confused? Say “explain simply” or talk to staff.",
    clerk: "Hi! Ask about scholarship, students, day-to-day ops… I’ll walk you through it. Don’t understand? Ask follow-ups — or talk to staff.",
    ca: "Hi! Ask about audit, vouchers, reports… I’ll explain clearly. Need a person? Tap Talk to staff.",
    student: "Hi! Ask about your results, profile, and portal pages. If you’re stuck, ask again in simple words.",
  },
  hi: {
    super_admin: "नमस्ते! प्लेटफ़ॉर्म/स्कूल प्रबंधन के बारे में पूछें — जैसे किसी से बात। समझ न आए तो “फिर समझाओ” कहें या स्टाफ से बात करें।",
    school_admin: "नमस्ते! छात्र, छात्रवृत्ति, हाजरी, हिसाब, प्रमाणपत्र… जो चाहें पूछें। चरण-दर-चरण समझाऊँगा। समझ न आए तो फिर पूछें — या स्टाफ से मैन्युअल बात करें।",
    teacher: "नमस्ते! क्लास, हाजरी, समयसारणी, अंक… पूछें। व्यक्ति की तरह जवाब दूँगा। उलझन हो तो “आसान भाषा में समझाओ” या स्टाफ से बात करें।",
    clerk: "नमस्ते! छात्रवृत्ति, छात्र, रोज़ के काम… पूछें। समझ न आए तो फॉलो-अप पूछें — या स्टाफ से बात करें।",
    ca: "नमस्ते! ऑडिट, वाउचर, रिपोर्ट… पूछें। व्यक्ति चाहिए तो स्टाफ से बात करें।",
    student: "नमस्ते! परिणाम, प्रोफ़ाइल, पोर्टल… पूछें। अटक जाएँ तो सरल भाषा में फिर पूछें।",
  },
  gu: {
    super_admin: "નમસ્તે! પ્લેટફોર્મ/શાળા મેનેજમેન્ટ વિશે પૂછો — જેમ કોઈ સાથે વાત. સમજાય નહીં તો “ફરી સમજાવો” કહો અથવા સ્ટાફ સાથે વાત કરો.",
    school_admin: "નમસ્તે! વિદ્યાર્થી, શિષ્યવૃત્તિ, હાજરી, હિસાબ, પ્રમાણપત્ર… જે પૂછવું હોય પૂછો. હું પગલાંવાર સમજાવીશ. સમજાયું ન હોય તો ફરી પૂછો — અથવા સ્ટાફ સાથે મેન્યુઅલ વાત કરો.",
    teacher: "નમસ્તે! વર્ગ, હાજરી, સમયપત્રક, ગુણ… પૂછો. માણસની જેમ જવાબ આપીશ. અટકી જાઓ તો “સરળ રીતે સમજાવો” અથવા સ્ટાફ સાથે વાત કરો.",
    clerk: "નમસ્તે! શિષ્યવૃત્તિ, વિદ્યાર્થી, રોજિંદા કામ… પૂછો. સમજાય નહીં તો ફોલો-અપ પૂછો — અથવા સ્ટાફ સાથે વાત કરો.",
    ca: "નમસ્તે! ઓડિટ, વાઉચર, રિપોર્ટ… પૂછો. વ્યક્તિ જોઈએ તો સ્ટાફ સાથે વાત કરો.",
    student: "નમસ્તે! પરિણામ, પ્રોફાઇલ, પોર્ટલ… પૂછો. અટકી જાઓ તો સરળ ભાષામાં ફરી પૂછો.",
  },
};

const DENY_ADMIN: Record<HelpLang, string> = {
  en: "That area is only for Super Admin / platform management. It is not available in your panel.",
  hi: "वह क्षेत्र सिर्फ सुपर एडमिन के लिए है। आपके पैनल में उपलब्ध नहीं है।",
  gu: "તે વિસ્તાર માત્ર સુપર એડમિન માટે છે. તમારા પેનલમાં ઉપલબ્ધ નથી.",
};

const DENY_CROSS: Record<HelpLang, string> = {
  en: "That belongs to another panel. For security I only open pages from your own role panel.",
  hi: "यह दूसरे पैनल का है। सुरक्षा के लिए मैं सिर्फ आपके रोल के पैनल के पेज खोलता हूँ।",
  gu: "આ બીજા પેનલનું છે. સુરક્ષા માટે હું માત્ર તમારા રોલના પેનલના પેજ જ ખોલું છું.",
};

export type HelpReply = {
  lang: HelpLang;
  text: string;
  title?: string;
  href?: string;
  links?: { href: string; label: string }[];
  suggestions?: { id: string; label: string; query: string }[];
  role: UserRole;
  /** 0–100 match confidence for handoff decisions */
  confidence?: number;
  /** Suggest human handoff when low confidence */
  canEscalate?: boolean;
  /** Last matched topic — used for follow-up context */
  topicId?: string;
  /** Detected conversational intent */
  intent?: string;
  /** Active troubleshooting playbook */
  diagnosticId?: string;
  diagnosticStep?: number;
};

export function getHelpSuggestions(role: UserRole, lang: HelpLang) {
  return HELP_QUICK_PROMPTS.filter((p) => p.roles.includes(role)).map((p) => ({
    id: p.id,
    label: p.label[lang],
    query: p.query[lang],
  }));
}

export function getWelcomeMessage(role: UserRole, lang: HelpLang): HelpReply {
  return {
    lang,
    role,
    text: GREET[lang][role],
    href: getRoleHome(role),
    title:
      lang === "gu"
        ? "તમારું હોમ"
        : lang === "hi"
          ? "आपका होम"
          : "Your home",
    suggestions: getHelpSuggestions(role, lang),
  };
}

export function answerHelpQuery(
  rawQuery: string,
  role: UserRole,
  preferredLang?: HelpLang
): HelpReply {
  const lang = detectHelpLang(rawQuery, preferredLang || "gu");

  if (
    role !== "super_admin" &&
    /\b(super.?admin|all schools|register school|smtp|platform|સુપર એડમિન|सुपर एडमिन)\b/i.test(rawQuery)
  ) {
    return {
      lang,
      role,
      text: DENY_ADMIN[lang],
      suggestions: getHelpSuggestions(role, lang),
    };
  }

  // Block asking to open another role's panel
  const wantsTeacherPanel = /\b(teacher panel|\/teacher|શિક્ષક પેનલ|टीचर पैनल)\b/i.test(rawQuery);
  const wantsClerkPanel = /\b(clerk panel|\/clerk|ક્લાર્ક પેનલ|क्लर्क पैनल)\b/i.test(rawQuery);
  const wantsCaPanel = /\b(ca panel|\/ca\b|સીએ પેનલ|सीए पैनल)\b/i.test(rawQuery);
  if (
    (wantsTeacherPanel && role !== "teacher") ||
    (wantsClerkPanel && role !== "clerk") ||
    (wantsCaPanel && role !== "ca")
  ) {
    return {
      lang,
      role,
      text: DENY_CROSS[lang],
      href: getRoleHome(role),
      suggestions: getHelpSuggestions(role, lang),
    };
  }

  const allowed = HELP_TOPICS.filter((t) => topicAllowed(t, role));
  let best: HelpTopic | null = null;
  let bestScore = 0;
  for (const topic of allowed) {
    const s = scoreTopic(rawQuery, topic);
    if (s > bestScore) {
      bestScore = s;
      best = topic;
    }
  }

  if (!best || bestScore < 3) {
    return {
      lang,
      role,
      text: FALLBACK[lang],
      suggestions: getHelpSuggestions(role, lang),
      confidence: Math.min(bestScore * 10, 25),
      canEscalate: true,
    };
  }

  const href = filterHrefForRole(best.href, role);
  const links = (best.links || [])
    .map((l) => {
      const h = filterHrefForRole(l.href, role);
      return h ? { href: h, label: l.label[lang] } : null;
    })
    .filter(Boolean) as { href: string; label: string }[];

  const confidence = Math.min(100, Math.round((bestScore / 20) * 100));

  return {
    lang,
    role,
    title: best.title[lang],
    text: best.answer[lang],
    href,
    links: links.length ? links : undefined,
    suggestions: getHelpSuggestions(role, lang),
    confidence,
    canEscalate: confidence < 55,
  };
}

/** Detect explicit request to talk to a human */
export function wantsHumanAgent(raw: string): boolean {
  const t = raw.toLowerCase();
  if (
    /\b(human|agent|staff|person|operator|talk to|speak to|manual|live chat|help desk|real person)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // Indic scripts: word-boundary `\b` is unreliable — use includes / loose match
  return /સ્ટાફ|માનવી|વ્યક્તિ|મદદ\s*ડેસ્ક|મેન્યુઅલ|વાત\s*કર|કોઈ\s*વ્યક્તિ|स्टाफ|इंसान|लाइव\s*चैट|मदद\s*डेस्क|बात\s*कर|मैन्युअल|कोई\s*व्यक्ति|मानव/i.test(
    raw,
  );
}
