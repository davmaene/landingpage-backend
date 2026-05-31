// utils/emailTemplates.js
// Gabarits HTML d'emails (compatibles clients mail : tables + styles inline).

const BRAND = {
  navy: '#003366',
  navyLight: '#a5c4e2',
  bg: '#f4f6f8',
  text: '#333333',
  muted: '#777777',
  border: '#eef2f5',
};

const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const typeLabel = (type) => {
  switch (type) {
    case 'event': return 'Événement';
    case 'activity': return 'Activité';
    default: return 'Article';
  }
};

const formatDate = (d) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return null; }
};

/**
 * Email de diffusion d'une publication aux abonnés de la newsletter.
 * @param {{ content: object, frontendUrl: string }} opts
 */
function publicationBroadcastTemplate({ content, frontendUrl }) {
  const base = (frontendUrl || 'https://ulpgl.net').replace(/\/$/, '');
  const url = `${base}/articles/${content.slug}`;
  const badge = typeLabel(content.type);
  const title = escapeHtml(content.title || '');
  const excerpt = escapeHtml(content.excerpt || '');
  const category = content.category ? escapeHtml(content.category) : null;
  const faculty = content.faculty?.name ? escapeHtml(content.faculty.name) : null;
  const eventDate = content.type !== 'article' ? formatDate(content.eventDate) : null;
  const location = content.location ? escapeHtml(content.location) : null;
  const year = new Date().getFullYear();

  const cover = content.coverImage
    ? `<tr><td style="padding:0;"><img src="${escapeHtml(content.coverImage)}" alt="${title}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;" /></td></tr>`
    : '';

  const metaRows = [];
  if (eventDate) metaRows.push(`📅 ${eventDate}`);
  if (location) metaRows.push(`📍 ${location}`);
  const metaBlock = metaRows.length
    ? `<p style="margin:0 0 18px 0;font-size:14px;color:${BRAND.navy};font-weight:600;">${metaRows.join('&nbsp;&nbsp;·&nbsp;&nbsp;')}</p>`
    : '';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;-webkit-font-smoothing:antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${BRAND.bg};padding:40px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.05);">

          <!-- En-tête -->
          <tr>
            <td align="center" style="background-color:${BRAND.navy};padding:28px 20px;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">ULPGL Goma</h1>
              <p style="color:${BRAND.navyLight};margin:5px 0 0 0;font-size:13px;">Université Libre des Pays des Grands Lacs</p>
            </td>
          </tr>

          ${cover}

          <!-- Corps -->
          <tr>
            <td style="padding:34px 30px;color:${BRAND.text};line-height:1.6;">
              <span style="display:inline-block;background-color:#e8f0fa;color:${BRAND.navy};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:5px 12px;border-radius:20px;margin-bottom:16px;">${badge}${category ? ` · ${category}` : ''}</span>
              <h2 style="color:${BRAND.navy};margin:0 0 14px 0;font-size:22px;font-weight:700;line-height:1.3;">${title}</h2>
              ${metaBlock}
              ${excerpt ? `<p style="font-size:16px;color:#555555;margin:0 0 26px 0;">${excerpt}</p>` : ''}

              <table border="0" cellpadding="0" cellspacing="0" style="margin:8px 0 8px 0;">
                <tr>
                  <td align="center" style="background-color:${BRAND.navy};border-radius:4px;">
                    <a href="${url}" target="_blank" style="padding:13px 28px;color:#ffffff;display:inline-block;font-size:15px;font-weight:bold;text-decoration:none;letter-spacing:0.3px;">Lire la suite</a>
                  </td>
                </tr>
              </table>

              <hr style="border:0;border-top:1px solid ${BRAND.border};margin:30px 0;">
              <p style="font-size:14px;color:${BRAND.muted};margin:0;">
                ${faculty ? `Publié par <strong>${faculty}</strong><br>` : ''}
                <strong>L'équipe de communication de l'ULPGL</strong>
              </p>
            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td align="center" style="background-color:#f8fafc;padding:20px;border-top:1px solid ${BRAND.border};">
              <p style="margin:0;font-size:12px;color:#999999;">&copy; ${year} ULPGL-Goma. Tous droits réservés.</p>
              <p style="margin:5px 0 0 0;font-size:11px;color:#bbbbbb;">Vous recevez cet e-mail car vous êtes abonné à la newsletter de l'ULPGL.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textParts = [
    `[${badge}] ${content.title || ''}`,
    eventDate ? `Date : ${eventDate}` : null,
    location ? `Lieu : ${location}` : null,
    content.excerpt || '',
    `Lire la suite : ${url}`,
    '— ULPGL-Goma',
  ].filter(Boolean);

  return {
    subject: `${badge} · ${content.title || 'Nouvelle publication ULPGL'}`,
    html,
    text: textParts.join('\n\n'),
  };
}

module.exports = { publicationBroadcastTemplate };
