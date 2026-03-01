import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtp.host) return null;
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
  return transporter;
}

export async function sendPasswordResetEmail(email, resetUrl) {
  const t = getTransporter();
  if (!t) {
    console.log(`[DEV] Password-Reset-Link für ${email}: ${resetUrl}`);
    return;
  }
  await t.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Novarix – Passwort zurücksetzen',
    html: `<p>Hallo,</p><p>Klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Dieser Link ist 1 Stunde gültig.</p><p>Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p><p>Mit freundlichen Grüßen,<br>Novarix</p>`,
  });
}
