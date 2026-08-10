import { buildSchoolAdminWelcomeEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mail";
import { isEmailEnabled } from "@/lib/platform-settings";
import { SCHOOL_FEATURES, type SchoolFeatureKey } from "@/lib/school-features";

export type SendSchoolAdminWelcomeParams = {
  adminName: string;
  loginEmail: string;
  password: string;
  loginUrl: string;
  emailVerified?: boolean;
  school: {
    name: string;
    code: string;
    udiseCode?: string | null;
    district?: string | null;
    taluka?: string | null;
    city?: string | null;
    pincode?: string | null;
    address?: string | null;
    phone?: string | null;
    alternatePhone?: string | null;
    email?: string | null;
    website?: string | null;
    principalName?: string | null;
    schoolType?: string | null;
    boardAffiliation?: string | null;
  };
  subscription?: {
    planName?: string | null;
    contractNumber?: string | null;
    contractStartDate?: Date | string | null;
    contractEndDate?: Date | string | null;
    paymentStatus?: string | null;
    totalAmount?: string | number | null;
    paidAmount?: string | number | null;
    nextDueDate?: Date | string | null;
  } | null;
  enabledFeatures?: string[];
};

function featureLabels(keys: string[] | undefined): string[] {
  if (!keys?.length) return [];
  const map = new Map(SCHOOL_FEATURES.map((f) => [f.key, f.label]));
  return keys
    .map((k) => map.get(k as SchoolFeatureKey) || k)
    .filter(Boolean);
}

/** Send formatted welcome + credentials email to new school admin (non-blocking for callers). */
export async function sendSchoolAdminWelcomeEmail(
  params: SendSchoolAdminWelcomeParams,
): Promise<{ sent: boolean; error?: string }> {
  try {
    const enabled = await isEmailEnabled();
    if (!enabled) {
      return { sent: false, error: "smtp_disabled" };
    }

    const mail = buildSchoolAdminWelcomeEmail({
      ...params,
      enabledFeatureLabels: featureLabels(params.enabledFeatures),
    });

    await sendMail({
      to: params.loginEmail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send welcome email";
    console.error("School admin welcome email failed:", err);
    return { sent: false, error: message };
  }
}
