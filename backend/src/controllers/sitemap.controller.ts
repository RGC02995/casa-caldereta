import { Request, Response } from 'express';
import { RouteModel } from '../models/route.model';

const BASE_URL  = 'https://casa-caldereta.com';
const TODAY     = new Date().toISOString().substring(0, 10);

const STATIC_URLS = [
  { loc: `${BASE_URL}/`,               changefreq: 'weekly',  priority: '1.0' },
  { loc: `${BASE_URL}/reservar`,        changefreq: 'weekly',  priority: '0.9' },
  { loc: `${BASE_URL}/galeria`,         changefreq: 'monthly', priority: '0.8' },
  { loc: `${BASE_URL}/rutas`,           changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/legal/aviso-legal`, changefreq: 'yearly', priority: '0.2' },
  { loc: `${BASE_URL}/legal/privacidad`,  changefreq: 'yearly', priority: '0.2' },
  { loc: `${BASE_URL}/legal/cookies`,     changefreq: 'yearly', priority: '0.2' },
  { loc: `${BASE_URL}/legal/terminos`,    changefreq: 'yearly', priority: '0.2' },
];

function buildUrl(entry: { loc: string; changefreq: string; priority: string; lastmod?: string }): string {
  return `
  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod ?? TODAY}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`.trimStart();
}

export async function sitemapHandler(_req: Request, res: Response): Promise<void> {
  try {
    const publishedRoutes = await RouteModel
      .find({ isPublished: true }, { slug: 1, updatedAt: 1 })
      .lean();

    const staticXml  = STATIC_URLS.map(buildUrl).join('\n');
    const dynamicXml = publishedRoutes
      .map(route => {
        const lastmod: string = route.updatedAt instanceof Date
          ? route.updatedAt.toISOString().substring(0, 10)
          : TODAY;
        return buildUrl({
          loc:        `${BASE_URL}/rutas/${route.slug as string}`,
          changefreq: 'monthly',
          priority:   '0.6',
          lastmod,
        });
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${dynamicXml}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(xml);
  } catch {
    res.status(500).send('Error generando sitemap');
  }
}
