type EmailLayoutOptions = {
  title: string;
  preheader?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

export function buildEmailHtml(opts: EmailLayoutOptions): string {
  const preheader = opts.preheader || opts.title;
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<tr><td style="padding:28px 32px 8px;text-align:center;">
          <a href="${opts.ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#1d4ed8);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;box-shadow:0 8px 20px rgba(29,78,216,.25);">${opts.ctaLabel}</a>
        </td></tr>
        <tr><td style="padding:8px 32px 0;text-align:center;font-size:12px;color:#64748b;word-break:break-all;">${opts.ctaUrl}</td></tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dbe3ef;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(15,35,65,.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f2341,#1e40af);padding:24px 32px;">
              <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#fbbf24;font-weight:700;">SHS Education Hub</div>
              <div style="font-size:22px;font-weight:700;color:#ffffff;margin-top:6px;line-height:1.3;">${opts.title}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 16px 8px;color:#334155;font-size:15px;line-height:1.7;">${opts.bodyHtml}</td>
          </tr>
          ${cta}
          <tr>
            <td style="padding:24px 32px 28px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;line-height:1.6;">
              ${opts.footerNote || "This is an automated message from SHS Education Portal. Please do not reply directly unless a reply-to address is configured."}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Mobile-safe OTP — single cell, no flex/boxes (Gmail Android breaks those) */
export function buildOtpDisplayHtml(otp: string): string {
  const digits = otp.replace(/\D/g, "").slice(0, 6);
  const spaced = digits.split("").join("&nbsp;&nbsp;");

  return `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:0;margin:0;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;max-width:300px;border-collapse:collapse;">
        <tr>
          <td align="center" bgcolor="#dbeafe" style="background-color:#dbeafe;border:2px solid #3b82f6;border-radius:12px;padding:16px 8px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;">
              <tr>
                <td align="center" style="padding:0 0 12px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#1d4ed8;font-family:Segoe UI,Roboto,Arial,sans-serif;">
                  Verification Code
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:4px 0;font-family:'Courier New',Courier,monospace;">
                  <font color="#1e3a8a" face="Courier New, Courier, monospace" style="font-size:32px;font-weight:800;color:#1e3a8a !important;line-height:1.3;letter-spacing:4px;word-break:keep-all;white-space:nowrap;">${spaced}</font>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:10px 0 0;font-family:'Courier New',Courier,monospace;">
                  <font color="#1e40af" face="Courier New, Courier, monospace" style="font-size:18px;font-weight:700;color:#1e40af !important;letter-spacing:2px;">${digits}</font>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

export function buildOtpVerificationEmail(params: {
  name: string;
  schoolName?: string | null;
  otp: string;
  expiresMinutes: number;
  /** When true, copy is for super-admin school registration (admin not created yet). */
  pendingSchoolRegistration?: boolean;
}) {
  const schoolLine = params.schoolName
    ? `<p style="margin:0 0 20px;">School: <strong>${params.schoolName}</strong></p>`
    : "";

  const bodyIntro = params.pendingSchoolRegistration
    ? `<p style="margin:0 0 20px;color:#334155;">You are registering as school admin on the SHS Education Portal. Use the verification code below to confirm this email before the school is created.</p>`
    : `<p style="margin:0 0 20px;color:#334155;">Your school admin account has been created on the SHS Education Portal. Use the verification code below to activate your account and sign in.</p>`;

  const otpBlock = buildOtpDisplayHtml(params.otp);

  const html = buildEmailHtml({
    title: "Email Verification OTP",
    preheader: `Your verification code is ${params.otp}`,
    bodyHtml: `
      <p style="margin:0 0 16px;color:#334155;">Hello <strong>${params.name}</strong>,</p>
      ${bodyIntro}
      ${schoolLine}
      ${otpBlock}
      <p style="margin:16px 0 8px;text-align:center;color:#64748b;font-size:13px;">Enter this code on the school registration page to verify your email.</p>
      <p style="margin:0;text-align:center;color:#94a3b8;font-size:12px;">This code expires in <strong>${params.expiresMinutes} minutes</strong>. Do not share it with anyone.</p>
    `,
    footerNote:
      "If you did not request this account, you can ignore this email. For help, contact your super administrator.",
  });

  const text = `Hello ${params.name},

Your SHS Education Portal email verification code is: ${params.otp}
${params.schoolName ? `School: ${params.schoolName}\n` : ""}
Enter this code on the login page. It expires in ${params.expiresMinutes} minutes.

Do not share this code with anyone.`;

  return {
    subject: `${params.otp} — SHS Email Verification Code`,
    html,
    text,
  };
}

export function buildTestEmail(params: { toName: string }) {
  const html = buildEmailHtml({
    title: "SMTP test successful",
    preheader: "Your platform email settings are working",
    bodyHtml: `
      <p style="margin:0 0 16px;">Hello <strong>${params.toName}</strong>,</p>
      <p style="margin:0;">This is a test email from the SHS Super Admin panel. If you received this message, SMTP host, port, credentials, and sender details are configured correctly.</p>
    `,
  });

  return {
    subject: "SHS Portal — SMTP test email",
    html,
    text: "SMTP test successful. Your email settings are working.",
  };
}
