import type { UserRole } from "@/lib/roles";
import type { HelpLang } from "@/lib/help/knowledge-base";

export type DiagnosticId =
  | "data-missing-fy"
  | "button-missing"
  | "submit-ca"
  | "login-password"
  | "attendance-not-saving"
  | "scholarship-ready"
  | "roll-order"
  | "subjects-assign"
  | "import-failed"
  | "generic-broken";

export type DiagnosticPlaybook = {
  id: DiagnosticId;
  roles: UserRole[];
  keywords: string[];
  title: Record<HelpLang, string>;
  /** Ordered clarifying questions / checks */
  checks: Record<HelpLang, string[]>;
  /** Final fix summary after checks */
  fix: Record<HelpLang, string>;
  href?: string;
  relatedTopicIds?: string[];
};

export const HELP_DIAGNOSTICS: DiagnosticPlaybook[] = [
  {
    id: "data-missing-fy",
    roles: ["school_admin", "clerk", "ca"],
    keywords: [
      "data missing", "data gone", "data nahi", "empty", "blank", "fy", "financial year",
      "year change", "2025", "2026", "ડેટા નથી", "ગાયબ", "વર્ષ", "डेटा नहीं", "गायब", "वर्ष",
    ],
    title: {
      en: "Data looks missing after year change",
      hi: "वर्ष बदलने पर डेटा गायब लगता है",
      gu: "વર્ષ બદલ્યા પછી ડેટા ગાયબ લાગે",
    },
    checks: {
      en: [
        "Check the Academic / Financial Year filter on the page (top or dashboard year bar).",
        "Confirm you are on the Active FY — older FY keeps its own vouchers/students links.",
        "If Accounting: open Accounting → pick the FY that had vouchers — data is per-year, not deleted.",
      ],
      hi: [
        "पेज पर Academic / Financial Year फ़िल्टर जाँचें (ऊपर या डैशबोर्ड ईयर बार)।",
        "Active FY चुनें — पुराने FY का अपना डेटा रहता है।",
        "Accounting में: उसी FY को खोलें जहाँ वाउचर थे — डेटा साल के हिसाब से अलग होता है, डिलीट नहीं।",
      ],
      gu: [
        "પેજ પર Academic / Financial Year ફિલ્ટર ચેક કરો (ઉપર અથવા ડેશબોર્ડ યર બાર).",
        "Active FY પસંદ કરો — જૂના FYનો પોતાનો ડેટા રહે છે.",
        "Accountingમાં: જે FYમાં વાઉચર હતા તે ખોલો — ડેટા વર્ષ મુજબ અલગ છે, ડિલીટ નથી થતો.",
      ],
    },
    fix: {
      en: "Switch to the correct year filter first. If still empty in the right FY, tell staff which page + year — they can check seed/init.",
      hi: "पहले सही वर्ष फ़िल्टर लगाएँ। सही FY में भी खाली हो तो स्टाफ को पेज + वर्ष बताएँ।",
      gu: "પહેલા સાચું વર્ષ ફિલ્ટર લગાવો. સાચા FYમાં પણ ખાલી હોય તો સ્ટાફને પેજ + વર્ષ કહો.",
    },
    href: "/accounting",
    relatedTopicIds: ["admin-accounting"],
  },
  {
    id: "button-missing",
    roles: ["school_admin", "clerk", "teacher", "ca"],
    keywords: [
      "button", "not showing", "not visible", "disabled", "grey", "submit button",
      "બટન નથી", "દેખાતું નથી", "બંધ", "बटन नहीं", "नहीं दिख",
    ],
    title: {
      en: "Button not showing / disabled",
      hi: "बटन नहीं दिख रहा / बंद है",
      gu: "બટન દેખાતું નથી / બંધ છે",
    },
    checks: {
      en: [
        "Confirm your role — some buttons are Admin-only (e.g. Submit to CA).",
        "Complete checklist items above the button (green checks) — incomplete steps keep it disabled.",
        "Hard refresh (Ctrl+F5) and retry; still stuck → Talk to staff with screenshot.",
      ],
      hi: [
        "अपना रोल जाँचें — कुछ बटन सिर्फ Admin के लिए (जैसे Submit to CA)।",
        "बटन के ऊपर चेकलिस्ट पूरी करें (हरे टिक) — अधूरा हो तो बटन बंद रहता है।",
        "Ctrl+F5 से रिफ्रेश करें; फिर भी न खुले तो स्टाफ से बात करें।",
      ],
      gu: [
        "તમારો રોલ ચેક કરો — અમુક બટન ફક્ત Admin માટે (જેમ કે Submit to CA).",
        "બટન ઉપરની ચેકલિસ્ટ પૂરી કરો (લીલા ટિક) — અધૂરું હોય તો બટન બંધ રહે.",
        "Ctrl+F5થી રિફ્રેશ કરો; તો પણ ના ખુલે તો સ્ટાફ સાથે વાત કરો.",
      ],
    },
    fix: {
      en: "Most “missing” buttons are role or checklist locks — fix those first, then refresh.",
      hi: "ज़्यादातर छुपे बटन रोल या चेकलिस्ट की वजह से बंद होते हैं — पहले वह ठीक करें।",
      gu: "મોટા ભાગે છુપા બટન રોલ અથવા ચેકલિસ્ટને કારણે બંધ હોય — પહેલા તે ઠીક કરો.",
    },
  },
  {
    id: "submit-ca",
    roles: ["school_admin"],
    keywords: [
      "submit to ca", "ca submit", "send to ca", "audit submit", "સીએને મોકલો", "सीए को भेजो",
    ],
    title: {
      en: "Submit to CA checklist",
      hi: "CA को सबमिट चेकलिस्ट",
      gu: "CAને સબમિટ ચેકલિસ્ટ",
    },
    checks: {
      en: [
        "Accounting → Active FY selected.",
        "Accounts initialized (chart of accounts present).",
        "At least some vouchers entered for that FY.",
        "Then green “Submit to CA” appears for Admin.",
      ],
      hi: [
        "Accounting → Active FY चुना हो।",
        "अकाउंट्स इनिशियलाइज़ हों।",
        "उस FY में कुछ वाउचर हों।",
        "फिर Admin को हरा Submit to CA दिखेगा।",
      ],
      gu: [
        "Accounting → Active FY પસંદ હોય.",
        "એકાઉન્ટ્સ ઇનિશિયલાઇઝ થયા હોય.",
        "તે FYમાં અમુક વાઉચર હોય.",
        "પછી Adminને લીલું Submit to CA દેખાશે.",
      ],
    },
    fix: {
      en: "Complete FY + accounts + vouchers, then Submit to CA. Clerk cannot submit — Admin only.",
      hi: "FY + अकाउंट + वाउचर पूरा करें, फिर Submit to CA। क्लर्क नहीं कर सकता — सिर्फ Admin।",
      gu: "FY + એકાઉન્ટ + વાઉચર પૂરું કરો, પછી Submit to CA. ક્લાર્ક નહીં કરી શકે — ફક્ત Admin.",
    },
    href: "/accounting",
    relatedTopicIds: ["admin-accounting"],
  },
  {
    id: "login-password",
    roles: ["school_admin", "teacher", "clerk", "ca", "student", "super_admin"],
    keywords: [
      "login", "password", "cant login", "forgot", "પાસવર્ડ", "લૉગિન", "पासवर्ड", "लॉगिन",
    ],
    title: {
      en: "Login / password trouble",
      hi: "लॉगिन / पासवर्ड समस्या",
      gu: "લૉગિન / પાસવર્ડ સમસ્યા",
    },
    checks: {
      en: [
        "Use the correct school portal URL and role account.",
        "If already logged in elsewhere, log out and retry.",
        "Logged-in users: Profile → change password. Locked out → ask Admin/staff to reset.",
      ],
      hi: [
        "सही स्कूल पोर्टल URL और अपना रोल अकाउंट उपयोग करें।",
        "दूसरी जगह लॉगिन हो तो लॉगआउट कर फिर कोशिश करें।",
        "लॉगिन हैं तो Profile से पासवर्ड बदलें। लॉक हो तो Admin/स्टाफ से रीसेट करवाएँ।",
      ],
      gu: [
        "સાચું શાળા પોર્ટલ URL અને તમારું રોલ અકાઉન્ટ વાપરો.",
        "બીજી જગ્યાએ લૉગિન હોય તો લૉગઆઉટ કરી ફરી પ્રયાસ કરો.",
        "લૉગિન હો તો Profileથી પાસવર્ડ બદલો. લૉક હોય તો Admin/સ્ટાફ પાસે રીસેટ કરાવો.",
      ],
    },
    fix: {
      en: "Profile password change works when logged in; otherwise school Admin must reset the account.",
      hi: "लॉगिन होने पर Profile से पासवर्ड बदले; वरना स्कूल Admin अकाउंट रीसेट करे।",
      gu: "લૉગિન હોય ત્યારે Profileથી પાસવર્ડ બદલો; નહીંતર શાળા Admin અકાઉન્ટ રીસેટ કરે.",
    },
    href: "/profile",
    relatedTopicIds: ["profile-password"],
  },
  {
    id: "attendance-not-saving",
    roles: ["teacher", "school_admin", "clerk"],
    keywords: [
      "attendance not", "hajri save", "not saving", "હાજરી સેવ", "हाजरी सेव",
    ],
    title: {
      en: "Attendance not saving",
      hi: "हाजरी सेव नहीं हो रही",
      gu: "હાજરી સેવ થતી નથી",
    },
    checks: {
      en: [
        "Select correct class + date before marking.",
        "Tap Save / Submit after marking — don’t leave the page early.",
        "Teachers: use Teacher → Attendance. Admins: school Attendance page.",
      ],
      hi: [
        "मार्क करने से पहले सही क्लास + तारीख चुनें।",
        "मार्क के बाद Save दबाएँ — पेज जल्दी न छोड़ें।",
        "टीचर: Teacher → Attendance। एडमिन: स्कूल Attendance पेज।",
      ],
      gu: [
        "માર્ક કરતા પહેલા સાચો વર્ગ + તારીખ પસંદ કરો.",
        "માર્ક પછી Save દબાવો — પેજ વહેલું ન છોડો.",
        "શિક્ષક: Teacher → Attendance. એડમિન: શાળા Attendance પેજ.",
      ],
    },
    fix: {
      en: "Class + date + Save is required. If Save fails with an error toast, copy that message for staff.",
      hi: "क्लास + तारीख + Save ज़रूरी है। एरर आए तो मैसेज स्टाफ को भेजें।",
      gu: "વર્ગ + તારીખ + Save જરૂરી છે. એરર આવે તો મેસેજ સ્ટાફને મોકલો.",
    },
    relatedTopicIds: ["teacher-attendance", "admin-attendance"],
  },
  {
    id: "scholarship-ready",
    roles: ["school_admin", "clerk"],
    keywords: [
      "ready", "not ready", "scholarship fail", "submit fail", "શિષ્યવૃત્તિ", "छात्रवृत्ति",
    ],
    title: {
      en: "Scholarship submit / Ready status",
      hi: "छात्रवृत्ति सबमिट / Ready स्टेटस",
      gu: "શિષ્યવૃત્તિ સબમિટ / Ready સ્ટેટસ",
    },
    checks: {
      en: [
        "Student profile must be complete (docs/fields required by your flow).",
        "Set status to Ready before Bulk Submit / Auto Apply.",
        "Use your role’s Scholarship menu (Admin vs Clerk paths differ).",
      ],
      hi: [
        "छात्र प्रोफ़ाइल पूरी हो।",
        "Bulk Submit / Auto Apply से पहले Ready स्टेटस लगाएँ।",
        "अपने रोल का Scholarship मेनू उपयोग करें (Admin/Clerk अलग)।",
      ],
      gu: [
        "વિદ્યાર્થી પ્રોફાઇલ પૂરી હોય.",
        "Bulk Submit / Auto Apply પહેલા Ready સ્ટેટસ લગાવો.",
        "તમારા રોલનું Scholarship મેનૂ વાપરો (Admin/Clerk અલગ).",
      ],
    },
    fix: {
      en: "Fix incomplete students → Ready → then Bulk Submit. Still failing → escalate with student GR.",
      hi: "अधूरे छात्र ठीक करें → Ready → Bulk Submit। फिर भी फेल हो तो GR बताकर स्टाफ से बात करें।",
      gu: "અધૂરા વિદ્યાર્થી ઠીક કરો → Ready → Bulk Submit. ફરી ફેલ થાય તો GR કહી સ્ટાફ સાથે વાત કરો.",
    },
    relatedTopicIds: ["admin-scholarship", "clerk-scholarship"],
  },
  {
    id: "roll-order",
    roles: ["school_admin", "clerk"],
    keywords: [
      "roll", "roll number", "auto roll", "a to z", "રોલ", "रोल नंबर",
    ],
    title: {
      en: "Roll numbers A→Z",
      hi: "रोल नंबर A→Z",
      gu: "રોલ નંબર A→Z",
    },
    checks: {
      en: [
        "Open the class students list / Roll manager.",
        "Use “Auto by name A→Z” — sorts by first name then assigns 1…n.",
        "Save/confirm if the screen asks — refresh list to verify order.",
      ],
      hi: [
        "क्लास छात्र सूची / रोल मैनेजर खोलें।",
        "“Auto by name A→Z” दबाएँ — नाम से सॉर्ट कर 1…n लगाता है।",
        "सेव के बाद सूची जाँचें।",
      ],
      gu: [
        "વર્ગ વિદ્યાર્થી યાદી / રોલ મેનેજર ખોલો.",
        "“Auto by name A→Z” દબાવો — નામથી સોર્ટ કરી 1…n લગાડે.",
        "સેવ પછી યાદી ચેક કરો.",
      ],
    },
    fix: {
      en: "Auto by name A→Z is the intended path — manual edit only for exceptions.",
      hi: "सामान्यतः Auto by name A→Z उपयोग करें — अपवाद में ही मैन्युअल।",
      gu: "સામાન્ય રીતે Auto by name A→Z વાપરો — અપવાદમાં જ મેન્યુઅલ.",
    },
    relatedTopicIds: ["admin-students"],
  },
  {
    id: "subjects-assign",
    roles: ["school_admin", "clerk"],
    keywords: [
      "subject", "subjects", "assign subject", "subjects assign", "class subject",
      "વિષય", "विषय", "વિષય અસાઇન",
    ],
    title: {
      en: "Subjects: master → class assign",
      hi: "विषय: मास्टर → क्लास असाइन",
      gu: "વિષય: માસ્ટર → વર્ગ અસાઇન",
    },
    checks: {
      en: [
        "Step 1: create/check all subjects in “All subjects”.",
        "Step 2: open “By class”, pick class, tick subjects, set order, Save.",
        "Validation errors (duplicate code / empty name) block save — fix those first.",
      ],
      hi: [
        "चरण 1: All subjects में विषय बनाएँ/जाँचें।",
        "चरण 2: By class → क्लास चुनें → टिक → क्रम → Save।",
        "डुप्लिकेट कोड/खाली नाम सेव रोकते हैं — पहले ठीक करें।",
      ],
      gu: [
        "પગલું 1: All subjectsમાં વિષય બનાવો/ચેક કરો.",
        "પગલું 2: By class → વર્ગ પસંદ → ટિક → ક્રમ → Save.",
        "ડુપ્લિકેટ કોડ/ખાલી નામ સેવ રોકે — પહેલા ઠીક કરો.",
      ],
    },
    fix: {
      en: "Use the 2-tab Subjects hub only — old 3-step flow is removed.",
      hi: "सिर्फ 2-टैब Subjects हब उपयोग करें — पुराना 3-स्टेप हटा दिया गया।",
      gu: "ફક્ત 2-ટૅબ Subjects હબ વાપરો — જૂનું 3-સ્ટેપ હટાવ્યું છે.",
    },
    href: "/subjects",
  },
  {
    id: "import-failed",
    roles: ["school_admin", "clerk"],
    keywords: [
      "import", "excel", "csv", "upload fail", "આયાત", "आयात", "एक्सेल",
    ],
    title: {
      en: "Excel / CSV import failed",
      hi: "Excel / CSV आयात फेल",
      gu: "Excel / CSV આયાત ફેલ",
    },
    checks: {
      en: [
        "Download/use the template columns exactly — extra/missing headers fail.",
        "Check required fields (name, class, GR) are filled.",
        "Open Import page errors list — fix row numbers shown, re-upload.",
      ],
      hi: [
        "टेम्प्लेट कॉलम ठीक वैसे रखें।",
        "ज़रूरी फ़ील्ड (नाम, क्लास, GR) भरे हों।",
        "Import पेज की एरर लिस्ट देखकर पंक्ति ठीक कर फिर अपलोड करें।",
      ],
      gu: [
        "ટેમ્પલેટ કૉલમ એ જ રાખો.",
        "જરૂરી ફીલ્ડ (નામ, વર્ગ, GR) ભરેલા હોય.",
        "Import પેજની એરર યાદી જોઈ પંક્તિ ઠીક કરી ફરી અપલોડ કરો.",
      ],
    },
    fix: {
      en: "Template + required columns + fix reported rows. Still failing → send file to staff.",
      hi: "टेम्प्लेट + ज़रूरी कॉलम + बताई पंक्तियाँ ठीक करें। फिर भी फेल → फ़ाइल स्टाफ को दें।",
      gu: "ટેમ્પલેટ + જરૂરી કૉલમ + કહેલી પંક્તિઓ ઠીક કરો. ફરી ફેલ → ફાઇલ સ્ટાફને આપો.",
    },
    href: "/import",
    relatedTopicIds: ["admin-students"],
  },
  {
    id: "generic-broken",
    roles: ["school_admin", "teacher", "clerk", "ca", "student", "super_admin"],
    keywords: [
      "not working", "broken", "error", "bug", "કામ નથી", "ભૂલ", "काम नहीं", "एरर",
    ],
    title: {
      en: "Something isn’t working",
      hi: "कुछ काम नहीं कर रहा",
      gu: "કંઈક કામ નથી કરતું",
    },
    checks: {
      en: [
        "Which page? (name from sidebar)",
        "What did you click / expect?",
        "Any red error text? Soft refresh once.",
      ],
      hi: [
        "कौन सा पेज? (साइडबार नाम)",
        "क्या क्लिक किया / क्या उम्मीद थी?",
        "लाल एरर दिखे तो कॉपी करें; एक बार रिफ्रेश करें।",
      ],
      gu: [
        "કયું પેજ? (સાઇડબાર નામ)",
        "શું ક્લિક કર્યું / શું અપેક્ષા હતી?",
        "લાલ એરર હોય તો કૉપિ કરો; એક વાર રિફ્રેશ કરો.",
      ],
    },
    fix: {
      en: "Reply with the page name and what failed — I’ll guide the next check.",
      hi: "पेज का नाम और क्या फेल हुआ लिखें — अगला चेक बताऊँगा।",
      gu: "પેજનું નામ અને શું ફેલ થયું લખો — આગળનું ચેક કહીશ.",
    },
  },
];

export function scoreDiagnostic(query: string, d: DiagnosticPlaybook): number {
  const q = query.toLowerCase();
  let score = 0;
  /** Generic words alone should not win over topic-specific playbooks */
  const weak = new Set([
    "not saving",
    "error",
    "bug",
    "broken",
    "not working",
    "કામ નથી",
    "ભૂલ",
    "काम नहीं",
    "एरर",
  ]);
  for (const kw of d.keywords) {
    const k = kw.toLowerCase();
    if (!q.includes(k)) continue;
    if (weak.has(k)) score += 1;
    else score += k.length > 10 ? 8 : k.length > 6 ? 5 : 3;
  }
  return score;
}

export function findBestDiagnostic(
  query: string,
  role: UserRole,
): { playbook: DiagnosticPlaybook; score: number } | null {
  let best: DiagnosticPlaybook | null = null;
  let bestScore = 0;
  for (const d of HELP_DIAGNOSTICS) {
    if (!d.roles.includes(role)) continue;
    const s = scoreDiagnostic(query, d);
    if (s > bestScore) {
      best = d;
      bestScore = s;
    }
  }
  if (!best || bestScore < 3) return null;
  return { playbook: best, score: bestScore };
}

export function formatDiagnosticReply(
  playbook: DiagnosticPlaybook,
  lang: HelpLang,
  step: number,
): { text: string; nextStep: number; done: boolean } {
  const checks = playbook.checks[lang];
  const open =
    lang === "gu"
      ? "ચાલો સાથે તપાસીએ — હું એક-એક પગલું પૂછીશ:"
      : lang === "hi"
        ? "चलो साथ जाँचते हैं — मैं एक-एक कदम पूछूँगा:"
        : "Let’s check together — I’ll go step by step:";

  if (step <= 0) {
    const first = checks[0] || playbook.fix[lang];
    return {
      text: [
        open,
        "",
        `1/${checks.length}) ${first}`,
        "",
        lang === "gu"
          ? "થઈ ગયું? “હા” લખો — નહીં તો શું દેખાય છે તે લખો."
          : lang === "hi"
            ? "हो गया? “हाँ” लिखें — नहीं तो क्या दिख रहा है लिखें।"
            : "Done? Reply “yes” — or describe what you see.",
      ].join("\n"),
      nextStep: 1,
      done: false,
    };
  }

  if (step < checks.length) {
    return {
      text: [
        lang === "gu"
          ? "સારું — આગળ:"
          : lang === "hi"
            ? "अच्छा — आगे:"
            : "Good — next:",
        "",
        `${step + 1}/${checks.length}) ${checks[step]}`,
        "",
        lang === "gu"
          ? "પૂરું થાય તો “હા” — અટકે તો વિગત લખો."
          : lang === "hi"
            ? "पूरा हो तो “हाँ” — अटके तो विवरण लिखें।"
            : "If done, say “yes” — if stuck, describe it.",
      ].join("\n"),
      nextStep: step + 1,
      done: false,
    };
  }

  return {
    text: [
      lang === "gu"
        ? "તપાસ પૂરી — સારાંશ:"
        : lang === "hi"
          ? "जाँच पूरी — सार:"
          : "Checks done — summary:",
      "",
      playbook.fix[lang],
      "",
      lang === "gu"
        ? "હજુ પણ ન થાય તો વધુ વિગત લખો — કયું પેજ, શું ક્લિક કર્યું."
        : lang === "hi"
          ? "फिर भी न सुलझे तो और विवरण लिखें — कौन सा पेज, क्या क्लिक किया।"
          : "Still stuck? Add detail — which page, what you clicked.",
    ].join("\n"),
    nextStep: step,
    done: true,
  };
}
