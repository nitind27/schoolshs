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

export function detectHelpLang(text: string, fallback: HelpLang = "en"): HelpLang {
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

const FALLBACK: Record<HelpLang, string> = {
  en: "I can help you find pages and explain features for your role only. Try asking about things in your panel — or tap a suggestion below.",
  hi: "मैं सिर्फ आपके पैनल की चीज़ें ढूँढने में मदद कर सकता हूँ। अपने पैनल के बारे में पूछें — या नीचे सुझाव चुनें।",
  gu: "હું માત્ર તમારા પેનલની વસ્તુઓ શોધવામાં મદદ કરી શકું. તમારા પેનલ વિશે પૂછો — અથવા નીચે સૂચન પસંદ કરો.",
};

const GREET: Record<HelpLang, Record<UserRole, string>> = {
  en: {
    super_admin: "Hi! I’m the Super Admin help assistant. I only cover platform/school management — not school staff panels.",
    school_admin: "Hi! I’m your School Admin help assistant. I only show admin panel pages — not teacher/clerk/CA panels.",
    teacher: "Hi! I’m your Teacher help assistant. I only cover your teacher panel (classes, attendance, results, chat).",
    clerk: "Hi! I’m your Clerk help assistant. I only cover clerk/school operations in your panel.",
    ca: "Hi! I’m your CA help assistant. I only cover audit & accounting in your CA panel.",
    student: "Hi! I’m your Student help assistant. I only show your own student portal pages.",
  },
  hi: {
    super_admin: "नमस्ते! मैं सुपर एडमिन हेल्प हूँ — सिर्फ प्लेटफ़ॉर्म/स्कूल प्रबंधन। स्टाफ पैनल नहीं।",
    school_admin: "नमस्ते! मैं स्कूल एडमिन हेल्प हूँ — सिर्फ एडमिन पैनल। टीचर/क्लर्क/CA पैनल नहीं खोलूँगा।",
    teacher: "नमस्ते! मैं टीचर हेल्प हूँ — सिर्फ आपका टीचर पैनल (क्लास, हाजरी, परिणाम, चैट)।",
    clerk: "नमस्ते! मैं क्लर्क हेल्प हूँ — सिर्फ आपके क्लर्क पैनल की चीज़ें।",
    ca: "नमस्ते! मैं CA हेल्प हूँ — सिर्फ ऑडिट और अकाउंटिंग।",
    student: "नमस्ते! मैं छात्र हेल्प हूँ — सिर्फ आपका छात्र पोर्टल।",
  },
  gu: {
    super_admin: "નમસ્તે! હું સુપર એડમિન હેલ્પ છું — માત્ર પ્લેટફોર્મ/શાળા મેનેજમેન્ટ. સ્ટાફ પેનલ નહીં.",
    school_admin: "નમસ્તે! હું સ્કૂલ એડમિન હેલ્પ છું — માત્ર એડમિન પેનલ. શિક્ષક/ક્લાર્ક/CA પેનલ નહીં ખોલું.",
    teacher: "નમસ્તે! હું શિક્ષક હેલ્પ છું — માત્ર તમારું ટીચર પેનલ (વર્ગ, હાજરી, પરિણામ, ચેટ).",
    clerk: "નમસ્તે! હું ક્લાર્ક હેલ્પ છું — માત્ર તમારા ક્લાર્ક પેનલની વસ્તુઓ.",
    ca: "નમસ્તે! હું CA હેલ્પ છું — માત્ર ઓડિટ અને એકાઉન્ટિંગ.",
    student: "નમસ્તે! હું વિદ્યાર્થી હેલ્પ છું — માત્ર તમારું સ્ટુડન્ટ પોર્ટલ.",
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
  const lang = detectHelpLang(rawQuery, preferredLang || "en");

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
    };
  }

  const href = filterHrefForRole(best.href, role);
  const links = (best.links || [])
    .map((l) => {
      const h = filterHrefForRole(l.href, role);
      return h ? { href: h, label: l.label[lang] } : null;
    })
    .filter(Boolean) as { href: string; label: string }[];

  return {
    lang,
    role,
    title: best.title[lang],
    text: best.answer[lang],
    href,
    links: links.length ? links : undefined,
    suggestions: getHelpSuggestions(role, lang),
  };
}
