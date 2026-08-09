import type { UserRole } from "@/lib/roles";
import { getRoleHome } from "@/lib/roles";
import {
  HELP_QUICK_PROMPTS,
  HELP_TOPICS,
  type HelpLang,
  type HelpTopic,
} from "@/lib/help/knowledge-base";
import {
  detectHelpLang,
  filterHrefForRolePublic,
  getHelpSuggestions,
  type HelpReply,
  wantsHumanAgent,
} from "@/lib/help/engine";
import {
  detectHelpIntent,
  expandQueryWithSynonyms,
  type HelpIntent,
} from "@/lib/help/intents";
import {
  HELP_DIAGNOSTICS,
  findBestDiagnostic,
  formatDiagnosticReply,
  type DiagnosticId,
} from "@/lib/help/diagnostics";

/** Topic → related topic ids for natural follow-ups */
export const TOPIC_RELATED: Record<string, string[]> = {
  home: ["language", "profile-password"],
  "admin-students": ["admin-scholarship", "admin-attendance", "admin-idcards"],
  "admin-scholarship": ["admin-students", "clerk-scholarship"],
  "clerk-scholarship": ["admin-students", "admin-scholarship"],
  "admin-attendance": ["admin-timetable", "admin-students"],
  "teacher-attendance": ["teacher-timetable", "teacher-students", "teacher-results"],
  "admin-timetable": ["admin-attendance", "admin-results"],
  "teacher-timetable": ["teacher-attendance", "teacher-results"],
  "admin-results": ["admin-timetable", "admin-certificates"],
  "teacher-results": ["teacher-attendance", "teacher-board"],
  "admin-staff": ["admin-attendance", "chat-admin"],
  "admin-accounting": ["admin-certificates"],
  "admin-certificates": ["admin-letterhead", "admin-idcards"],
  "admin-idcards": ["admin-students", "admin-certificates"],
  "admin-letterhead": ["admin-certificates"],
  "admin-board": ["admin-results", "admin-students"],
  "teacher-board": ["teacher-results", "teacher-students"],
  "teacher-students": ["teacher-attendance", "teacher-results"],
  "ca-audit": ["ca-reports", "admin-accounting"],
  "ca-reports": ["ca-audit"],
  "student-portal": ["profile-password"],
  "chat-admin": ["admin-staff"],
  "chat-clerk": ["clerk-scholarship"],
  "chat-teacher": ["teacher-students"],
};

export type HelpContext = {
  lastTopicId?: string | null;
  lastIntent?: HelpIntent | null;
  lastDiagnosticId?: DiagnosticId | string | null;
  diagnosticStep?: number | null;
  recentMessages?: string[];
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function topicById(id: string) {
  return HELP_TOPICS.find((t) => t.id === id) || null;
}

function topicAllowed(topic: HelpTopic, role: UserRole) {
  return topic.roles.includes(role);
}

function scoreTopic(query: string, topic: HelpTopic, boostId?: string | null): number {
  const expanded = expandQueryWithSynonyms(query);
  const q = normalize(expanded);
  if (!q) return 0;
  let score = 0;
  const tokens = q.split(" ").filter((t) => t.length > 1);

  for (const kw of topic.keywords) {
    const k = normalize(kw);
    if (!k) continue;
    if (q.includes(k)) score += k.length > 6 ? 7 : 4;
    for (const tok of tokens) {
      if (tok.length < 2) continue;
      if (k === tok) score += 4;
      else if (k.includes(tok) || tok.includes(k)) score += 2;
    }
  }

  for (const lang of ["en", "hi", "gu"] as HelpLang[]) {
    const title = normalize(topic.title[lang]);
    if (title && q.includes(title)) score += 6;
    const ans = normalize(topic.answer[lang]).slice(0, 160);
    for (const tok of tokens) {
      if (tok.length > 3 && ans.includes(tok)) score += 1;
    }
  }

  if (boostId && topic.id === boostId) score += 5;
  if (boostId && (TOPIC_RELATED[boostId] || []).includes(topic.id)) score += 3;

  return score;
}

function humanWrap(
  lang: HelpLang,
  body: string,
  opts?: { steps?: string[]; closing?: string; intent?: HelpIntent },
): string {
  const open =
    opts?.intent === "troubleshoot"
      ? lang === "gu"
        ? "સમજાયું — સમસ્યા તરફથી જોઈએ:"
        : lang === "hi"
          ? "समझ गया — समस्या की तरफ से देखें:"
          : "Got it — let’s look at this as a problem to fix:"
      : lang === "gu"
        ? "બરાબર — હું સરળ ભાષામાં સમજાવું:"
        : lang === "hi"
          ? "ठीक है — मैं आसान भाषा में समझाता हूँ:"
          : "Sure — I’ll explain it simply:";

  const parts = [open, "", body];
  if (opts?.steps?.length) {
    parts.push("");
    parts.push(lang === "gu" ? "પગલાં:" : lang === "hi" ? "चरण:" : "Steps:");
    opts.steps.forEach((s, i) => parts.push(`${i + 1}) ${s}`));
  }
  if (opts?.closing) {
    parts.push("");
    parts.push(opts.closing);
  } else {
    parts.push("");
    parts.push(
      lang === "gu"
        ? "સમજાયું ન હોય તો પૂછો — અથવા “સ્ટાફ સાથે વાત” દબાવો."
        : lang === "hi"
          ? "समझ न आए तो पूछें — या “स्टाफ से बात” दबाएँ।"
          : "If anything is unclear, ask me — or tap “Talk to staff”.",
    );
  }
  return parts.join("\n");
}

function buildStepsFromAnswer(answer: string, lang: HelpLang): string[] {
  const chunks = answer
    .split(/(?<=[.।])\s+|(?:\s*[•\-–]\s*)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
  if (chunks.length >= 2 && chunks.length <= 5) return chunks.slice(0, 4);
  if (lang === "gu") {
    return [
      "ડાબી મેનૂમાંથી સંબંધિત પેજ ખોલો.",
      "સ્ક્રીન પર ફિલ્ટર/બટન જુઓ અને જરૂરી વિકલ્પ પસંદ કરો.",
      "સેવ કર્યા પછી યાદી/રિપોર્ટમાં ચેક કરો.",
    ];
  }
  if (lang === "hi") {
    return [
      "बायें मेनू से संबंधित पेज खोलें।",
      "स्क्रीन पर फ़िल्टर/बटन देखकर सही विकल्प चुनें।",
      "सेव के बाद लिस्ट/रिपोर्ट में जाँच करें।",
    ];
  }
  return [
    "Open the related page from the left menu.",
    "Use the filters/buttons on that screen for your task.",
    "Save, then verify in the list or report.",
  ];
}

function relatedSuggestions(
  topicId: string,
  role: UserRole,
  lang: HelpLang,
  includeDiag = true,
): HelpReply["suggestions"] {
  const ids = TOPIC_RELATED[topicId] || [];
  const out: { id: string; label: string; query: string }[] = [];
  for (const id of ids) {
    const topic = topicById(id);
    if (!topic || !topicAllowed(topic, role)) continue;
    out.push({
      id: `rel-${id}`,
      label: topic.title[lang],
      query:
        lang === "gu"
          ? `${topic.title[lang]} વિશે વધુ કહો`
          : lang === "hi"
            ? `${topic.title[lang]} के बारे में और बताओ`
            : `Tell me more about ${topic.title[lang]}`,
    });
  }
  out.push({
    id: "follow-clarify",
    label:
      lang === "gu"
        ? "સમજાયું નહીં — ફરી સમજાવો"
        : lang === "hi"
          ? "समझ नहीं आया — फिर समझाओ"
          : "I don’t understand — explain again",
    query:
      lang === "gu"
        ? "મને સમજાયું નહીં, વધુ સરળ રીતે સમજાવો"
        : lang === "hi"
          ? "मुझे समझ नहीं आया, और आसान भाषा में समझाओ"
          : "I don’t understand, explain more simply",
  });
  out.push({
    id: "follow-steps",
    label: lang === "gu" ? "પગલાં બતાવો" : lang === "hi" ? "चरण दिखाओ" : "Show steps",
    query:
      lang === "gu"
        ? "પગલાંવાર કેવી રીતે કરું?"
        : lang === "hi"
          ? "चरण-दर-चरण कैसे करें?"
          : "Show me step by step how to do it",
  });
  if (includeDiag) {
    out.push({
      id: "follow-broken",
      label:
        lang === "gu"
          ? "કામ નથી થતું"
          : lang === "hi"
            ? "काम नहीं हो रहा"
            : "It’s not working",
      query:
        lang === "gu"
          ? "આ કામ નથી થતું, સમસ્યા તપાસો"
          : lang === "hi"
            ? "यह काम नहीं हो रहा, समस्या जाँचो"
            : "This is not working, please troubleshoot",
    });
  }
  return out.slice(0, 7);
}

function replyFromTopic(
  topic: HelpTopic,
  role: UserRole,
  lang: HelpLang,
  mode: "normal" | "simplify" | "steps",
  score: number,
  intent: HelpIntent,
): HelpReply {
  const href = filterHrefForRolePublic(topic.href, role);
  const links = (topic.links || [])
    .map((l) => {
      const h = filterHrefForRolePublic(l.href, role);
      return h ? { href: h, label: l.label[lang] } : null;
    })
    .filter(Boolean) as { href: string; label: string }[];

  const base = topic.answer[lang];
  const steps = buildStepsFromAnswer(base, lang);
  let text: string;
  if (mode === "simplify") {
    text = humanWrap(lang, base, {
      intent,
      steps: steps.slice(0, 3),
      closing:
        lang === "gu"
          ? "હજુ શંકા હોય તો એક વાક્યમાં પૂછો — હું એ જ ટોપિક પર જવાબ આપીશ."
          : lang === "hi"
            ? "फिर भी शंका हो तो एक वाक्य में पूछें — मैं उसी टॉपिक पर जवाब दूँगा।"
            : "Still unsure? Ask in one short sentence — I’ll stay on this topic.",
    });
  } else if (mode === "steps") {
    text = humanWrap(lang, topic.title[lang], { intent, steps });
  } else {
    text = humanWrap(lang, base, {
      intent,
      steps: steps.length >= 2 ? steps : undefined,
    });
  }

  const confidence = Math.min(100, Math.round((score / 24) * 100));

  return {
    lang,
    role,
    title: topic.title[lang],
    text,
    href,
    links: links.length ? links : undefined,
    suggestions: relatedSuggestions(topic.id, role, lang),
    confidence,
    canEscalate: confidence < 55 || intent === "troubleshoot",
    topicId: topic.id,
    intent,
  };
}

function thanksReply(lang: HelpLang, role: UserRole): HelpReply {
  return {
    lang,
    role,
    text:
      lang === "gu"
        ? "આનંદ થયો! બીજું કંઈ જોઈએ તો પૂછો — હું અહીં છું."
        : lang === "hi"
          ? "खुशी हुई! और कुछ चाहिए तो पूछें — मैं यहीं हूँ।"
          : "Glad that helped! Ask anything else — I’m here.",
    suggestions: getHelpSuggestions(role, lang),
    confidence: 95,
    intent: "thanks",
  };
}

/**
 * Advanced contextual answer — intents, synonyms, diagnostics, follow-ups.
 */
export function answerHelpConversational(
  rawQuery: string,
  role: UserRole,
  preferredLang: HelpLang | undefined,
  context: HelpContext = {},
): HelpReply {
  const lang = detectHelpLang(rawQuery, preferredLang || "gu");
  const q = rawQuery.trim();
  const { intent } = detectHelpIntent(q);
  const lastTopic = context.lastTopicId ? topicById(context.lastTopicId) : null;
  const lastOk = lastTopic && topicAllowed(lastTopic, role) ? lastTopic : null;

  if (intent === "escalate" || wantsHumanAgent(q)) {
    return {
      lang,
      role,
      text:
        lang === "gu"
          ? "બરાબર — હું તમને શાળા સ્ટાફ સાથે જોડું છું. તેઓ મેન્યુઅલી જવાબ આપશે."
          : lang === "hi"
            ? "ठीक है — मैं आपको स्कूल स्टाफ से जोड़ता हूँ। वे मैन्युअल जवाब देंगे।"
            : "Okay — I’ll connect you with school staff for a manual reply.",
      canEscalate: true,
      confidence: 100,
      suggestions: getHelpSuggestions(role, lang),
      intent: "escalate",
    };
  }

  if (intent === "thanks") {
    return thanksReply(lang, role);
  }

  if (intent === "greeting") {
    return {
      lang,
      role,
      text:
        lang === "gu"
          ? "નમસ્તે! હું એડવાન્સ મદદ છું — કેવી રીતે કરવું, ક્યાં છે, અથવા શું ખરાબ થયું તે પૂછો. સમજાય નહીં તો ફરી પૂછો."
          : lang === "hi"
            ? "नमस्ते! मैं एडवांस मदद हूँ — कैसे करें, कहाँ है, या क्या टूटा है पूछें। समझ न आए तो फिर पूछें।"
            : "Hi! I’m advanced help — ask how to do something, where it is, or what’s broken. Confused? Ask again.",
      href: getRoleHome(role),
      suggestions: getHelpSuggestions(role, lang),
      confidence: 92,
      intent: "greeting",
    };
  }

  // Continue active diagnostic flow
  const activeDiagId = context.lastDiagnosticId;
  if (
    activeDiagId &&
    (intent === "affirm" ||
      intent === "negate" ||
      intent === "clarify" ||
      intent === "troubleshoot" ||
      q.length < 40)
  ) {
    const playbook = HELP_DIAGNOSTICS.find((d) => d.id === activeDiagId);
    if (playbook && playbook.roles.includes(role)) {
      const fresh = findBestDiagnostic(q, role);
      if (fresh && fresh.score >= 8 && fresh.playbook.id !== playbook.id) {
        const formatted = formatDiagnosticReply(fresh.playbook, lang, 0);
        return {
          lang,
          role,
          title: fresh.playbook.title[lang],
          text: formatted.text,
          href: filterHrefForRolePublic(fresh.playbook.href, role),
          confidence: Math.min(95, 50 + fresh.score * 5),
          canEscalate: true,
          intent: "troubleshoot",
          diagnosticId: fresh.playbook.id,
          diagnosticStep: formatted.nextStep,
          suggestions: [
            {
              id: "diag-yes",
              label: lang === "gu" ? "હા, થઈ ગયું" : lang === "hi" ? "हाँ, हो गया" : "Yes, done",
              query: lang === "gu" ? "હા" : lang === "hi" ? "हाँ" : "yes",
            },
            {
              id: "diag-staff",
              label: lang === "gu" ? "સ્ટાફ સાથે વાત" : lang === "hi" ? "स्टाफ से बात" : "Talk to staff",
              query:
                lang === "gu"
                  ? "સ્ટાફ સાથે વાત"
                  : lang === "hi"
                    ? "स्टाफ से बात"
                    : "talk to staff",
            },
          ],
        };
      }

      const step = context.diagnosticStep ?? 0;
      if (intent === "negate") {
        return {
          lang,
          role,
          title: playbook.title[lang],
          text:
            lang === "gu"
              ? "બરાબર — શું દેખાય છે / કયો એરર? એક વાક્યમાં લખો, અથવા સ્ટાફ સાથે વાત કરો."
              : lang === "hi"
                ? "ठीक — क्या दिख रहा है / कौन सा एरर? एक वाक्य में लिखें, या स्टाफ से बात करें।"
                : "Okay — what do you see / which error? One sentence, or talk to staff.",
          canEscalate: true,
          confidence: 70,
          intent: "troubleshoot",
          diagnosticId: playbook.id,
          diagnosticStep: step,
          suggestions: getHelpSuggestions(role, lang).slice(0, 3),
        };
      }
      if (intent === "affirm" || intent === "howto" || intent === "unknown" || q.length < 12) {
        const formatted = formatDiagnosticReply(playbook, lang, step);
        return {
          lang,
          role,
          title: playbook.title[lang],
          text: formatted.text,
          href: filterHrefForRolePublic(playbook.href, role),
          confidence: formatted.done ? 88 : 80,
          canEscalate: true,
          intent: "troubleshoot",
          diagnosticId: playbook.id,
          diagnosticStep: formatted.nextStep,
          topicId: playbook.relatedTopicIds?.[0],
          suggestions: [
            {
              id: "diag-yes",
              label: lang === "gu" ? "હા, થઈ ગયું" : lang === "hi" ? "हाँ, हो गया" : "Yes, done",
              query: lang === "gu" ? "હા" : lang === "hi" ? "हाँ" : "yes",
            },
            ...(formatted.done
              ? [
                  {
                    id: "diag-staff",
                    label:
                      lang === "gu"
                        ? "સ્ટાફ સાથે વાત"
                        : lang === "hi"
                          ? "स्टाफ से बात"
                          : "Talk to staff",
                    query:
                      lang === "gu"
                        ? "સ્ટાફ સાથે વાત"
                        : lang === "hi"
                          ? "स्टाफ से बात"
                          : "talk to staff",
                  },
                ]
              : []),
          ],
        };
      }
    }
  }

  // New troubleshooting
  const diagHit = findBestDiagnostic(q, role);
  if (intent === "troubleshoot" || (diagHit?.score ?? 0) >= 5) {
    const found = diagHit;
    if (found && found.score >= 3) {
      const formatted = formatDiagnosticReply(found.playbook, lang, 0);
      return {
        lang,
        role,
        title: found.playbook.title[lang],
        text: formatted.text,
        href: filterHrefForRolePublic(found.playbook.href, role),
        confidence: Math.min(95, 45 + found.score * 6),
        canEscalate: true,
        intent: "troubleshoot",
        diagnosticId: found.playbook.id,
        diagnosticStep: formatted.nextStep,
        topicId: found.playbook.relatedTopicIds?.[0],
        suggestions: [
          {
            id: "diag-yes",
            label: lang === "gu" ? "હા, થઈ ગયું" : lang === "hi" ? "हाँ, हो गया" : "Yes, done",
            query: lang === "gu" ? "હા" : lang === "hi" ? "हाँ" : "yes",
          },
          {
            id: "diag-no",
            label: lang === "gu" ? "ના, અટક્યું" : lang === "hi" ? "नहीं, अटका" : "No, stuck",
            query: lang === "gu" ? "ના" : lang === "hi" ? "नहीं" : "no",
          },
        ],
      };
    }
  }

  // Follow-up on last topic
  if (
    lastOk &&
    (intent === "clarify" || intent === "steps" || intent === "affirm" || q.length < 28)
  ) {
    const mode =
      intent === "steps" || (intent === "affirm" && context.lastIntent !== "troubleshoot")
        ? "steps"
        : "simplify";
    const probe = HELP_TOPICS.filter((t) => topicAllowed(t, role)).map((t) => ({
      t,
      s: scoreTopic(q, t, null),
    }));
    const bestProbe = probe.sort((a, b) => b.s - a.s)[0];
    if (
      intent === "clarify" ||
      intent === "steps" ||
      !bestProbe ||
      bestProbe.s < 6 ||
      bestProbe.t.id === lastOk.id
    ) {
      return replyFromTopic(lastOk, role, lang, mode, 18, intent);
    }
  }

  if (
    role !== "super_admin" &&
    /\b(super.?admin|all schools|register school|smtp|platform|સુપર એડમિન|सुपर एडमिन)\b/i.test(q)
  ) {
    return {
      lang,
      role,
      text:
        lang === "gu"
          ? "આ સુપર એડમિન / પ્લેટફોર્મ વિસ્તાર છે — તમારા પેનલમાં ઉપલબ્ધ નથી. તમારા કામ વિશે પૂછો."
          : lang === "hi"
            ? "यह सुपर एडमिन / प्लेटफ़ॉर्म क्षेत्र है — आपके पैनल में उपलब्ध नहीं। अपने काम के बारे में पूछें।"
            : "That’s a Super Admin / platform area — not in your panel. Ask about your own tasks.",
      suggestions: getHelpSuggestions(role, lang),
      canEscalate: true,
      confidence: 40,
      intent,
    };
  }

  const wantsTeacherPanel = /\b(teacher panel|\/teacher|શિક્ષક પેનલ|टीचर पैनल)\b/i.test(q);
  const wantsClerkPanel = /\b(clerk panel|\/clerk|ક્લાર્ક પેનલ|क्लर्क पैनल)\b/i.test(q);
  const wantsCaPanel = /\b(ca panel|\/ca\b|સીએ પેનલ|सीए पैनल)\b/i.test(q);
  if (
    (wantsTeacherPanel && role !== "teacher") ||
    (wantsClerkPanel && role !== "clerk") ||
    (wantsCaPanel && role !== "ca")
  ) {
    return {
      lang,
      role,
      text:
        lang === "gu"
          ? "આ બીજા પેનલનું છે. સુરક્ષા માટે હું માત્ર તમારા રોલના પેનલના પેજ જ ખોલું છું."
          : lang === "hi"
            ? "यह दूसरे पैनल का है। सुरक्षा के लिए मैं सिर्फ आपके रोल के पैनल के पेज खोलता हूँ।"
            : "That belongs to another panel. For security I only open pages from your own role.",
      href: getRoleHome(role),
      suggestions: getHelpSuggestions(role, lang),
      confidence: 40,
      canEscalate: true,
      intent,
    };
  }

  const allowed = HELP_TOPICS.filter((t) => topicAllowed(t, role));
  let best: HelpTopic | null = null;
  let bestScore = 0;
  let second = 0;
  for (const topic of allowed) {
    const s = scoreTopic(q, topic, context.lastTopicId);
    if (s > bestScore) {
      second = bestScore;
      bestScore = s;
      best = topic;
    } else if (s > second) {
      second = s;
    }
  }

  if (best && bestScore >= 3 && bestScore - second < 2 && second >= 3) {
    const runners = allowed
      .map((t) => ({ t, s: scoreTopic(q, t, context.lastTopicId) }))
      .filter((x) => x.s >= second)
      .sort((a, b) => b.s - a.s)
      .slice(0, 3);

    return {
      lang,
      role,
      title:
        lang === "gu"
          ? "થોડું સ્પષ્ટ કરો"
          : lang === "hi"
            ? "थोड़ा स्पष्ट करें"
            : "Quick clarification",
      text:
        lang === "gu"
          ? `હું સમજ્યો કે મદદ જોઈએ છે, પણ થોડા વિકલ્પ મળે છે:\n${runners.map((r) => r.t.title[lang]).join(" · ")}\n\nકયું જોઈએ? નામ લખો અથવા સૂચન ટેપ કરો.`
          : lang === "hi"
            ? `मैं समझ गया मदद चाहिए, लेकिन कुछ विकल्प हैं:\n${runners.map((r) => r.t.title[lang]).join(" · ")}\n\nकौन सा चाहिए? नाम लिखें या सुझाव चुनें।`
            : `I can help — a few options match:\n${runners.map((r) => r.t.title[lang]).join(" · ")}\n\nWhich one? Type the name or tap a suggestion.`,
      suggestions: runners.map((r) => ({
        id: r.t.id,
        label: r.t.title[lang],
        query: r.t.title[lang],
      })),
      confidence: 48,
      canEscalate: true,
      topicId: best.id,
      intent,
    };
  }

  if (!best || bestScore < 3) {
    return {
      lang,
      role,
      text:
        lang === "gu"
          ? "મને હજુ સ્પષ્ટ નથી.\n\nતમે કહી શકો:\n• “કેવી રીતે…” (કામ)\n• “ક્યાં છે…” (પેજ)\n• “કામ નથી થતું…” (સમસ્યા)\n\nઅથવા સૂચન પસંદ કરો / સ્ટાફ સાથે વાત કરો."
          : lang === "hi"
            ? "मुझे अभी साफ़ नहीं लगा।\n\nआप कह सकते हैं:\n• “कैसे…” (काम)\n• “कहाँ है…” (पेज)\n• “काम नहीं हो रहा…” (समस्या)\n\nसुझाव चुनें / स्टाफ से बात करें।"
            : "I’m not sure yet.\n\nYou can say:\n• “How do I…” (task)\n• “Where is…” (page)\n• “It’s not working…” (problem)\n\nPick a suggestion or talk to staff.",
      suggestions: getHelpSuggestions(role, lang).slice(0, 5),
      confidence: Math.min(bestScore * 10, 30),
      canEscalate: true,
      intent,
    };
  }

  const mode =
    intent === "clarify" ? "simplify" : intent === "steps" ? "steps" : "normal";
  return replyFromTopic(best, role, lang, mode, bestScore, intent);
}

export function conversationalQuickPrompts(role: UserRole, lang: HelpLang) {
  return HELP_QUICK_PROMPTS.filter((p) => p.roles.includes(role)).map((p) => ({
    id: p.id,
    label: p.label[lang],
    query: p.query[lang],
  }));
}
