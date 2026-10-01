const SUPABASE_URL = "https://hpvsemxmaesprrnwyuqw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_zs_CKudUqZNeZmbr3EvXpQ_fn1p1zwf";
const SITE_ORIGIN = "https://scenezy.in";

const STATIC_URLS = [
  "/",
  "/garba-events-ahmedabad",
  "/garba-passes-ahmedabad",
  "/garba-pass-price-ahmedabad"
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function validLastmod(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function urlEntry(loc, lastmod) {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : "",
    "  </url>"
  ].filter(Boolean).join("\n");
}

export default async function handler(req, res) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/events?select=*`,
      {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase returned ${response.status}`);
    }

    const events = await response.json();

    const dynamicEvents = Array.isArray(events)
      ? events
          .filter(event => event && event.visible !== false && event.id != null)
          .map(event => ({
            path: `/events/${encodeURIComponent(String(event.id))}`,
            lastmod: validLastmod(event.updated_at || event.created_at)
          }))
      : [];

    const unique = new Map();

    for (const path of STATIC_URLS) {
      unique.set(path, { path, lastmod: null });
    }

    for (const event of dynamicEvents) {
      unique.set(event.path, event);
    }

    const urls = [...unique.values()].sort((a, b) => {
      if (a.path === "/") return -1;
      if (b.path === "/") return 1;
      return a.path.localeCompare(b.path);
    });

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(item => urlEntry(`${SITE_ORIGIN}${item.path}`, item.lastmod)),
      '</urlset>'
    ].join("\n");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    res.status(200).send(xml);
  } catch (error) {
    console.error("Scenezy sitemap error:", error);

    const fallbackXml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...STATIC_URLS.map(path => urlEntry(`${SITE_ORIGIN}${path}`, null)),
      '</urlset>'
    ].join("\n");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(fallbackXml);
  }
}
