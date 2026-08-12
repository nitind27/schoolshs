import { buildPortalCredentialsEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mail";
import { isEmailEnabled } from "@/lib/platform-settings";
import { ROLE_LABELS, type UserRole } from "@/lib/roles";

export function portalRoleLabel(role: string): string {
  if (role in ROLE_LABELS) return ROLE_LABELS[role as UserRole];
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function sendMemberCredentialsEmail(params: {
  memberName: string;
  schoolName: string;
  schoolCode?: string | null;
  loginEmail: string;
  password: string;
  role: string;
  designation?: string | null;
  loginUrl: string;
  note?: string | null;
}): Promise<{ sent: boolean; error?: string }> {
  try {
    const enabled = await isEmailEnabled();
    if (!enabled) {
      return { sent: false, error: "Email / SMTP is not enabled. Configure it in Admin → Email settings." };
    }

    const mail = buildPortalCredentialsEmail({
      memberName: params.memberName,
      schoolName: params.schoolName,
      schoolCode: params.schoolCode,
      loginEmail: params.loginEmail,
      password: params.password,
      roleLabel: portalRoleLabel(params.role),
      designation: params.designation,
      loginUrl: params.loginUrl,
      note: params.note,
    });

    await sendMail({
      to: params.loginEmail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send credentials email";
    console.error("[sendMemberCredentialsEmail]", err);
    return { sent: false, error: message };
  }
}
