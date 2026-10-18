import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

export type EmailOutcome = 'SENT' | 'FAILED' | 'NOT_CONFIGURED';

export interface ContactNotification {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const emailConfigured = () => env.EMAIL_PROVIDER !== 'none';

/** Header values must never contain line breaks (header-injection defence). */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').slice(0, 200);

function buildText(m: ContactNotification) {
  return [
    'New message from your portfolio contact form',
    '',
    `Name:    ${oneLine(m.name)}`,
    `Email:   ${oneLine(m.email)}`,
    `Subject: ${oneLine(m.subject)}`,
    '',
    m.message,
    '',
    '— Sent via your portfolio. Reply directly to this email to answer the sender.',
  ].join('\n');
}

let smtp: Transporter | undefined;
const smtpTransport = () =>
  (smtp ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  }));

/**
 * Sends the owner a notification. Returns what actually happened — callers must record this value and
 * never claim an email was sent when it was not. The message itself is already safely stored in MySQL.
 */
export async function sendContactNotification(m: ContactNotification): Promise<EmailOutcome> {
  if (env.EMAIL_PROVIDER === 'none') return 'NOT_CONFIGURED';
  const subject = `Portfolio message: ${oneLine(m.subject)}`;
  try {
    if (env.EMAIL_PROVIDER === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [env.CONTACT_NOTIFY_TO],
          subject,
          text: buildText(m),
          reply_to: m.email,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Resend responded with HTTP ${res.status}`);
      return 'SENT';
    }
    await smtpTransport().sendMail({
      from: env.EMAIL_FROM,
      to: env.CONTACT_NOTIFY_TO,
      replyTo: m.email,
      subject,
      text: buildText(m),
    });
    return 'SENT';
  } catch (err) {
    logger.error({ err: (err as Error).message, provider: env.EMAIL_PROVIDER }, 'contact notification email failed');
    return 'FAILED';
  }
}
