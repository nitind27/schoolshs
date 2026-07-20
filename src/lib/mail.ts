import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getSmtpConfig, type SmtpConfig } from "@/lib/platform-settings";

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | null;
};

function createTransporter(config: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPassword,
    },
  });
}

export async function sendMail(input: SendMailInput, configOverride?: SmtpConfig): Promise<{ messageId: string }> {
  const config = configOverride || (await getSmtpConfig());
  if (!config) {
    throw new Error("Email is not configured. Ask super admin to set SMTP in Admin → Email Settings.");
  }

  const transporter = createTransporter(config);
  const info = await transporter.sendMail({
    from: `"${config.smtpFromName}" <${config.smtpFromEmail}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo || config.smtpReplyTo || undefined,
  });

  return { messageId: String(info.messageId || "") };
}

export async function verifySmtpConnection(config: SmtpConfig): Promise<void> {
  const transporter = createTransporter(config);
  await transporter.verify();
}
