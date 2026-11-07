import type { APIRoute } from 'astro';
import { getConcerts } from '../lib/google';
import { getSiteUrl } from '../lib/seo';

export const GET: APIRoute = async ({ locals }) => {
  const siteUrl = getSiteUrl(locals);
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    {
      loc: `${siteUrl}/`,
      changefreq: 'weekly',
      priority: '1.0',
      lastmod: today,
    },
    {
      loc: `${siteUrl}/concerts`,
      changefreq: 'weekly',
      priority: '0.9',
      lastmod: today,
    },
    {
      loc: `${siteUrl}/auditions`,
      changefreq: 'monthly',
      priority: '0.8',
      lastmod: today,
    },
    {
      loc: `${siteUrl}/about`,
      changefreq: 'monthly',
      priority: '0.8',
      lastmod: today,
    },
    {
      loc: `${siteUrl}/media`,
      changefreq: 'monthly',
      priority: '0.7',
      lastmod: today,
    },
    {
      loc: `${siteUrl}/support`,
      changefreq: 'monthly',
      priority: '0.7',
      lastmod: today,
    },
  ];

  // Optionally fetch active concerts to ensure search engines have up-to-date awareness
  let concertEntries: typeof staticPages = [];
  try {
    const concerts = await getConcerts(locals);
    const active = concerts.filter((c) => c.status === 'On_Sale' || c.status === 'Upcoming');
    concertEntries = active.map((c) => ({
      loc: `${siteUrl}/concerts#${c.slug}`,
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: today,
    }));
  } catch {
    // Graceful fallback to static pages
  }

  const allUrls = [...staticPages, ...concertEntries];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allUrls
  .map(
    (page) => `  <url>
    <loc>${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
