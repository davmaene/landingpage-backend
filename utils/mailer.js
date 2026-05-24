const nodemailer = require('nodemailer');

const isConfigured = () => Boolean(
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.SENDER_EMAIL
);

let transporter = null;

if (isConfigured()) {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true pour le port 465 obligatoire avec Gmail
    auth: {
      user: process.env.SMTP_USER, // Ton adresse Gmail
      pass: process.env.SMTP_PASS, // Ton mot de passe d'application à 16 caractères
    },
  });
}

async function sendMail({ to, subject, html, text }) {
  if (!isConfigured()) {
    console.log('[Gmail SKIP] Not configured. Would send to:', to, 'subject:', subject);
    return { skipped: true };
  }

  try {
    const msg = {
      from: process.env.SENDER_EMAIL,
      to,
      subject,
      text: text || subject,
      html: html || `<p>${subject}</p>`,
    };

    const info = await transporter.sendMail(msg);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Gmail ERROR]', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendMail, isConfigured };