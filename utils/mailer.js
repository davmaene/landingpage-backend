const sgMail = require('@sendgrid/mail');

const isConfigured = () => Boolean(process.env.SENDGRID_API_KEY && process.env.SENDER_EMAIL);

if (isConfigured()) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function sendMail({ to, subject, html, text }) {
  if (!isConfigured()) {
    console.log('[SendGrid SKIP] Not configured. Would send to:', to, 'subject:', subject);
    return { skipped: true };
  }
  try {
    const msg = {
      to,
      from: process.env.SENDER_EMAIL,
      subject,
      text: text || subject,
      html: html || `<p>${subject}</p>`,
    };
    await sgMail.send(msg);
    return { sent: true };
  } catch (err) {
    console.error('[SendGrid ERROR]', err?.response?.body || err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendMail, isConfigured };
