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

export function buildStudentFirstLoginOtpEmail(params: {
  name: string;
  schoolName?: string | null;
  otp: string;
  expiresMinutes: number;
}) {
  const schoolLine = params.schoolName
    ? `<p style="margin:0 0 20px;">School: <strong>${params.schoolName}</strong></p>`
    : "";
  const html = buildEmailHtml({
    title: "Student Portal Verification",
    preheader: `Your student portal verification code is ${params.otp}`,
    bodyHtml: `
      <p style="margin:0 0 16px;color:#334155;">Hello <strong>${params.name}</strong>,</p>
      <p style="margin:0 0 20px;color:#334155;">Use this OTP to verify your email and replace the temporary password for your SHS Student Portal account.</p>
      ${schoolLine}
      ${buildOtpDisplayHtml(params.otp)}
      <p style="margin:16px 0 8px;text-align:center;color:#64748b;font-size:13px;">Enter this code on the login page together with your new password.</p>
      <p style="margin:0;text-align:center;color:#94a3b8;font-size:12px;">This code expires in <strong>${params.expiresMinutes} minutes</strong>. Do not share it with anyone.</p>
    `,
    footerNote:
      "If you did not try to access this student account, contact your school immediately.",
  });

  return {
    subject: `${params.otp} — Student Portal Verification Code`,
    html,
    text: `Hello ${params.name},

Your SHS Student Portal verification code is: ${params.otp}
${params.schoolName ? `School: ${params.schoolName}\n` : ""}
Enter this code on the login page and choose a new password. It expires in ${params.expiresMinutes} minutes.

Do not share this code with anyone.`,
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

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Welcome email after school admin creates a staff portal login */
export function buildStaffCredentialsEmail(params: {
  staffName: string;
  schoolName: string;
  schoolCode?: string | null;
  loginEmail: string;
  password: string;
  roleLabel: string;
  designation: string;
  employeeId?: string | null;
  loginUrl: string;
}) {
  const name = escapeHtml(params.staffName);
  const school = escapeHtml(params.schoolName);
  const email = escapeHtml(params.loginEmail);
  const password = escapeHtml(params.password);
  const role = escapeHtml(params.roleLabel);
  const designation = escapeHtml(params.designation);
  const emp = params.employeeId ? escapeHtml(params.employeeId) : "";
  const code = params.schoolCode ? escapeHtml(params.schoolCode) : "";

  const credBox = `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 20px;border-collapse:collapse;">
  <tr>
    <td style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:16px 18px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#0f766e;margin-bottom:10px;">Your login details</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px;color:#334155;">
        <tr>
          <td style="padding:6px 0;width:120px;color:#64748b;">Username</td>
          <td style="padding:6px 0;font-weight:700;color:#0f172a;">${email}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;">Password</td>
          <td style="padding:6px 0;font-weight:800;font-size:20px;letter-spacing:3px;font-family:'Courier New',Courier,monospace;color:#0f766e;">${password}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;">Role</td>
          <td style="padding:6px 0;font-weight:600;color:#0f172a;">${role}</td>
        </tr>
        ${
          code
            ? `<tr>
          <td style="padding:6px 0;color:#64748b;">School code</td>
          <td style="padding:6px 0;font-weight:600;color:#0f172a;">${code}</td>
        </tr>`
            : ""
        }
      </table>
    </td>
  </tr>
</table>`;

  const html = buildEmailHtml({
    title: "Your school portal login",
    preheader: `Login created for ${params.schoolName} — username ${params.loginEmail}`,
    bodyHtml: `
      <div style="padding:0 16px;">
        <p style="margin:0 0 14px;color:#334155;">Hello <strong>${name}</strong>,</p>
        <p style="margin:0 0 14px;color:#334155;">
          Your staff account has been created for <strong>${school}</strong>
          ${emp ? ` (Employee ID: <strong>${emp}</strong>)` : ""}.
          Designation: <strong>${designation}</strong>.
        </p>
        <p style="margin:0 0 8px;color:#334155;">Use the details below to sign in to the SHS Education Portal:</p>
        ${credBox}
        <p style="margin:0 0 12px;color:#64748b;font-size:13px;">
          Keep this email private. Contact your school admin if you need help signing in.
        </p>
      </div>
    `,
    ctaLabel: "Open Portal Login",
    ctaUrl: params.loginUrl,
    footerNote:
      "Keep this email private. Do not share your password. If you need help, contact your school admin.",
  });

  const text = `Hello ${params.staffName},

Your staff account has been created for ${params.schoolName}.
Designation: ${params.designation}
${params.employeeId ? `Employee ID: ${params.employeeId}\n` : ""}
Login (username): ${params.loginEmail}
Password: ${params.password}
Role: ${params.roleLabel}
${params.schoolCode ? `School code: ${params.schoolCode}\n` : ""}
Sign in: ${params.loginUrl}

Keep this email private. Do not share your password.`;

  return {
    subject: `${params.schoolName} — Your portal login credentials`,
    html,
    text,
  };
}

function detailRow(label: string, value: string | null | undefined) {
  if (!value?.trim()) return "";
  return `<tr>
    <td style="padding:5px 10px 5px 0;width:38%;color:#64748b;font-size:13px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:5px 0;font-size:13px;font-weight:600;color:#0f172a;vertical-align:top;">${escapeHtml(value.trim())}</td>
  </tr>`;
}

function detailsTable(title: string, rowsHtml: string) {
  if (!rowsHtml.trim()) return "";
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 0;border-collapse:collapse;">
  <tr>
    <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#475569;margin-bottom:10px;">${escapeHtml(title)}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${rowsHtml}</table>
    </td>
  </tr>
</table>`;
}

function formatEmailDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Welcome email when Super Admin registers a school + admin account */
export function buildSchoolAdminWelcomeEmail(params: {
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
  enabledFeatureLabels?: string[];
}) {
  const admin = escapeHtml(params.adminName);
  const schoolName = escapeHtml(params.school.name);
  const email = escapeHtml(params.loginEmail);
  const password = escapeHtml(params.password);
  const code = escapeHtml(params.school.code);

  const location = [params.school.city, params.school.taluka, params.school.district]
    .filter(Boolean)
    .join(", ");

  const credBox = `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 4px;border-collapse:collapse;">
  <tr>
    <td style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 18px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#1d4ed8;margin-bottom:10px;">Portal login credentials</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px;color:#334155;">
        <tr>
          <td style="padding:6px 0;width:130px;color:#64748b;">Login URL</td>
          <td style="padding:6px 0;font-weight:600;color:#0f172a;word-break:break-all;">${escapeHtml(params.loginUrl)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;">Username (Email)</td>
          <td style="padding:6px 0;font-weight:700;color:#0f172a;">${email}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;">Password</td>
          <td style="padding:6px 0;font-weight:800;font-size:20px;letter-spacing:3px;font-family:'Courier New',Courier,monospace;color:#1d4ed8;">${password}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;">School code</td>
          <td style="padding:6px 0;font-weight:700;color:#0f172a;">${code}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;">Role</td>
          <td style="padding:6px 0;font-weight:600;color:#0f172a;">School Admin</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  const schoolRows =
    detailRow("School name", params.school.name) +
    detailRow("School code", params.school.code) +
    detailRow("UDISE code", params.school.udiseCode) +
    detailRow("School type", params.school.schoolType) +
    detailRow("Board / affiliation", params.school.boardAffiliation) +
    detailRow("Principal", params.school.principalName) +
    detailRow("Address", params.school.address) +
    detailRow("Location", location) +
    detailRow("PIN code", params.school.pincode) +
    detailRow("Phone", params.school.phone) +
    detailRow("Alternate phone", params.school.alternatePhone) +
    detailRow("School email", params.school.email) +
    detailRow("Website", params.school.website);

  const sub = params.subscription;
  const subscriptionRows =
    detailRow("Plan", sub?.planName) +
    detailRow("Contract no.", sub?.contractNumber) +
    detailRow("Contract start", formatEmailDate(sub?.contractStartDate ?? null)) +
    detailRow("Contract end", formatEmailDate(sub?.contractEndDate ?? null)) +
    detailRow("Payment status", sub?.paymentStatus) +
    detailRow("Total amount", sub?.totalAmount != null ? String(sub.totalAmount) : "") +
    detailRow("Paid amount", sub?.paidAmount != null ? String(sub.paidAmount) : "") +
    detailRow("Next due date", formatEmailDate(sub?.nextDueDate ?? null));

  const featuresBlock =
    params.enabledFeatureLabels && params.enabledFeatureLabels.length
      ? detailsTable(
          "Enabled modules",
          `<tr><td colspan="2" style="padding:4px 0;font-size:13px;color:#0f172a;line-height:1.6;">${escapeHtml(params.enabledFeatureLabels.join(" · "))}</td></tr>`,
        )
      : "";

  const verifiedNote = params.emailVerified
    ? `<p style="margin:14px 0 0;padding:10px 12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;color:#065f46;font-size:13px;">Your email is already verified. You can sign in immediately using the credentials above.</p>`
    : `<p style="margin:14px 0 0;padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;color:#92400e;font-size:13px;">You may receive a separate OTP email to verify your address before first login.</p>`;

  const html = buildEmailHtml({
    title: "Your school is registered on SHS Portal",
    preheader: `${params.school.name} — login details and school profile`,
    bodyHtml: `
      <div style="padding:0 16px;">
        <p style="margin:0 0 14px;color:#334155;">Hello <strong>${admin}</strong>,</p>
        <p style="margin:0 0 14px;color:#334155;">
          <strong>${schoolName}</strong> has been registered on the SHS Education Portal.
          You have been assigned as <strong>School Admin</strong>. Please save this email — it contains your login credentials and school details.
        </p>
        ${credBox}
        ${verifiedNote}
        ${detailsTable("School profile", schoolRows)}
        ${detailsTable("Subscription & contract", subscriptionRows)}
        ${featuresBlock}
        <p style="margin:16px 0 0;color:#64748b;font-size:13px;">
          Keep this email private. Change your password after first login. For support, contact the SHS platform team.
        </p>
      </div>
    `,
    ctaLabel: "Open Portal Login",
    ctaUrl: params.loginUrl,
    footerNote:
      "Automated message from SHS Education Portal · Super Admin school registration. Do not share your password.",
  });

  const textLines = [
    `Hello ${params.adminName},`,
    "",
    `${params.school.name} has been registered on the SHS Education Portal.`,
    "You are the School Admin. Save this email for your records.",
    "",
    "—— LOGIN ——",
    `Login URL: ${params.loginUrl}`,
    `Username: ${params.loginEmail}`,
    `Password: ${params.password}`,
    `School code: ${params.school.code}`,
    "Role: School Admin",
    "",
    "—— SCHOOL ——",
    `Name: ${params.school.name}`,
    params.school.udiseCode ? `UDISE: ${params.school.udiseCode}` : "",
    params.school.address ? `Address: ${params.school.address}` : "",
    location ? `Location: ${location}` : "",
    params.school.phone ? `Phone: ${params.school.phone}` : "",
    params.school.email ? `Email: ${params.school.email}` : "",
    "",
    sub?.planName ? `Plan: ${sub.planName}` : "",
    sub?.contractNumber ? `Contract: ${sub.contractNumber}` : "",
    sub?.paymentStatus ? `Payment: ${sub.paymentStatus}` : "",
    "",
    params.enabledFeatureLabels?.length
      ? `Modules: ${params.enabledFeatureLabels.join(", ")}`
      : "",
    "",
    params.emailVerified
      ? "Your email is verified — you can sign in now."
      : "Check your inbox for OTP verification if required before login.",
  ].filter(Boolean);

  return {
    subject: `${params.school.name} — School Admin welcome & login details`,
    html,
    text: textLines.join("\n"),
  };
}

