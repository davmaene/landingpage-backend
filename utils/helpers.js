export const escapeHtml = (str) => {
  if (!str) return '';
  return str.replace(/[&<>]/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

export const parseGallery = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const stringifyGallery = (raw) => {
  const arr = parseGallery(raw).slice(0, 4);
  return arr.length ? JSON.stringify(arr) : null;
};

export const isSocialBot = (userAgent) => {
  if (!userAgent) return false;
  const bots = [
    'whatsapp', 'facebookexternalhit', 'Twitterbot', 'LinkedInBot',
    'Pinterest', 'Slackbot', 'Discordbot', 'TelegramBot', 'Googlebot',
    'bingbot', 'YandexBot', 'baiduspider'
  ];
  const ua = userAgent.toLowerCase();
  return bots.some(bot => ua.includes(bot));
}

export const generateOgHtml = (article, req) => {
  const siteUrl = 'https://ulpgl.net';
  const pageUrl = `${siteUrl}/article/${article.slug}`;
  const imageUrl = article.coverImage || `${siteUrl}/og-default.jpg`;
  const title = escapeHtml(article.title);
  const description = escapeHtml(article.excerpt || 'Lisez cet article sur ULPGL - Université Libre des Pays des Grands Lacs');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="ULPGL - Goma" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
</head>
<body>
  <script>
    window.location.href = "${pageUrl}";
  </script>
</body>
</html>`;
}