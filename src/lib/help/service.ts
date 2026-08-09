import { prisma } from "@/lib/db";
import type { HelpLang, HelpReply } from "@/lib/help/engine";
import type { UserRole } from "@/lib/roles";

export type HelpConversationStatus = "bot" | "waiting" | "active" | "closed";

const ESCALATE_COPY: Record<HelpLang, string> = {
  en: "Connecting you to school staff. Please wait — an admin or clerk will reply here soon.",
  hi: "आपको स्कूल स्टाफ से जोड़ रहे हैं। कृपया प्रतीक्षा करें — एडमिन या क्लर्क जल्द जवाब देंगे।",
  gu: "તમને શાળા સ્ટાફ સાથે જોડી રહ્યા છીએ. કૃપા કરી રાહ જુઓ — એડમિન અથવા ક્લાર્ક ટૂંક સમયમાં જવાબ આપશે.",
};

const STAFF_JOINED: Record<HelpLang, string> = {
  en: "A staff member joined this chat and can reply manually.",
  hi: "एक स्टाफ सदस्य इस चैट में जुड़े — अब मैन्युअल जवाब दे सकते हैं।",
  gu: "સ્ટાફ સભ્ય આ ચેટમાં જોડાયા — હવે મેન્યુઅલ જવાબ આપી શકે.",
};

export function escalateSystemText(lang: HelpLang) {
  return ESCALATE_COPY[lang] || ESCALATE_COPY.en;
}

export function staffJoinedText(lang: HelpLang) {
  return STAFF_JOINED[lang] || STAFF_JOINED.en;
}

export async function getOrCreateOpenConversation(params: {
  userId: string;
  schoolId: string | null;
  role: UserRole;
  lang: HelpLang;
}) {
  const existing = await prisma.helpConversation.findFirst({
    where: {
      userId: params.userId,
      status: { in: ["bot", "waiting", "active"] },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) {
    if (existing.lang !== params.lang) {
      return prisma.helpConversation.update({
        where: { id: existing.id },
        data: { lang: params.lang },
      });
    }
    return existing;
  }
  return prisma.helpConversation.create({
    data: {
      userId: params.userId,
      schoolId: params.schoolId,
      role: params.role,
      lang: params.lang,
      status: "bot",
    },
  });
}

export async function appendHelpMessage(params: {
  conversationId: string;
  senderRole: "user" | "bot" | "staff" | "system";
  senderId?: string | null;
  content: string;
  meta?: Record<string, unknown> | null;
}) {
  const msg = await prisma.helpMessage.create({
    data: {
      conversationId: params.conversationId,
      senderRole: params.senderRole,
      senderId: params.senderId || null,
      content: params.content,
      metaJson: params.meta ? JSON.stringify(params.meta) : null,
    },
  });
  await prisma.helpConversation.update({
    where: { id: params.conversationId },
    data: { updatedAt: new Date() },
  });
  return msg;
}

export function replyMeta(reply: HelpReply) {
  return {
    title: reply.title,
    href: reply.href,
    links: reply.links,
    confidence: reply.confidence,
    canEscalate: reply.canEscalate,
    topicId: reply.topicId,
    intent: reply.intent,
    diagnosticId: reply.diagnosticId,
    diagnosticStep: reply.diagnosticStep,
  };
}

export async function loadConversationMessages(conversationId: string) {
  const rows = await prisma.helpMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
  });
  return rows.map((m) => {
    let meta: Record<string, unknown> | null = null;
    if (m.metaJson) {
      try {
        meta = JSON.parse(m.metaJson) as Record<string, unknown>;
      } catch {
        meta = null;
      }
    }
    return {
      id: m.id,
      senderRole: m.senderRole as "user" | "bot" | "staff" | "system",
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      senderName: m.sender?.name || null,
      meta,
    };
  });
}

export async function notifySchoolHelpStaff(params: {
  schoolId: string;
  conversationId: string;
  askerName: string;
  preview: string;
}) {
  const staff = await prisma.user.findMany({
    where: {
      schoolId: params.schoolId,
      isActive: true,
      role: { in: ["school_admin", "clerk"] },
    },
    select: { id: true },
  });
  if (!staff.length) return;
  await prisma.notification.createMany({
    data: staff.map((u) => ({
      schoolId: params.schoolId,
      userId: u.id,
      type: "help_desk",
      title: "Help desk — human requested",
      body: `${params.askerName}: ${params.preview.slice(0, 140)}`,
      href: `/help-desk?id=${params.conversationId}`,
      metaJson: JSON.stringify({ conversationId: params.conversationId }),
    })),
  });
}

export async function notifyAskerStaffReply(params: {
  userId: string;
  schoolId: string | null;
  conversationId: string;
  preview: string;
}) {
  await prisma.notification.create({
    data: {
      schoolId: params.schoolId,
      userId: params.userId,
      type: "help_desk",
      title: "Staff replied in Help chat",
      body: params.preview.slice(0, 160),
      href: undefined,
      metaJson: JSON.stringify({ conversationId: params.conversationId, openHelp: true }),
    },
  });
}
