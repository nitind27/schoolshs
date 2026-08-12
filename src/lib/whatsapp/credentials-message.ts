import type { MemberCredentialPdfRow } from "@/lib/admin/member-credentials-pdf";

/** Plain-text WhatsApp caption (supports *bold*). */
export function buildCredentialsWhatsAppCaption(
  member: MemberCredentialPdfRow,
  opts?: { note?: string | null },
): string {
  const lines = [
    `Hello *${member.name}*,`,
    "",
    `Your *Codeat Education* portal login for *${member.schoolName}* is ready.`,
    "",
    `📧 *Login email:* ${member.email}`,
    `🔑 *Password:* ${member.password}`,
    `👤 *Role:* ${member.roleLabel}`,
  ];

  if (member.designation) {
    lines.push(`💼 *Designation:* ${member.designation}`);
  }
  if (member.employeeId) {
    lines.push(`🆔 *Employee ID:* ${member.employeeId}`);
  }
  if (member.schoolCode && member.schoolCode !== "-") {
    lines.push(`🏫 *School code:* ${member.schoolCode}`);
  }

  lines.push("", `🔗 *Login:* ${member.loginUrl}`);

  if (opts?.note?.trim()) {
    lines.push("", opts.note.trim());
  }

  lines.push(
    "",
    "📎 Credentials PDF is attached. Please keep this message confidential.",
    "",
    "— Codeat Education",
  );

  return lines.join("\n");
}
