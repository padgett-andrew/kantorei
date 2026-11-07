import { describe, expect, it } from 'vitest';
import {
  getSiteUrl,
  toAbsoluteUrl,
  buildMusicGroupSchema,
  buildWebSiteSchema,
  buildConcertEventSchemas,
  buildAuditionFaqSchema,
  buildBreadcrumbsSchema,
  DEFAULT_SEO_KEYWORDS,
} from '../src/lib/seo';
import { GET as getSitemap } from '../src/pages/sitemap.xml';
import type { ConcertEvent, PortalConfig } from '../src/types/choir';
import fs from 'node:fs';
import path from 'node:path';

describe('SEO & Entity Disambiguation Architecture', () => {
  const mockConfig: PortalConfig = {
    Choir_Name: 'Kantorei',
    Conductor_Name: 'Adam Reinwald',
    Conductor_Email: 'adam.reinwald@kantorei.net',
    Manager_Email: 'info@kantorei.net',
    Repertoire_Drive_Folder_ID: 'folder-123',
    Handbook_Google_Doc_ID: 'doc-123',
    Strategic_Plan_Google_Doc_ID: 'doc-456',
    Season_Pass_TT_Widget_URL: '',
    Portal_Announcement: '',
    Calendar_Timezone: 'America/Chicago',
    YouTube_URL: 'https://www.youtube.com/@kantoreiMN',
    Instagram_URL: 'https://www.instagram.com/kantorei_mn',
    Facebook_URL: 'https://www.facebook.com/kantoreimn',
    Contact_Email: 'info@kantorei.net',
    Contact_Phone: '612-21-SINGS',
    Contact_Address: '660 23rd Ave NW, Saint Paul, MN 55112',
  };

  describe('getSiteUrl and toAbsoluteUrl', () => {
    it('defaults to https://kantorei.net when no env override is present', () => {
      const url = getSiteUrl();
      expect(url).toBe('https://kantorei.net');
    });

    it('converts relative asset paths into absolute URLs', () => {
      expect(toAbsoluteUrl('/images/kantorei-logo.webp')).toBe(
        'https://kantorei.net/images/kantorei-logo.webp',
      );
      expect(toAbsoluteUrl('images/advent.webp')).toBe(
        'https://kantorei.net/images/advent.webp',
      );
    });

    it('leaves already-absolute URLs intact', () => {
      expect(toAbsoluteUrl('https://images.example.com/poster.jpg')).toBe(
        'https://images.example.com/poster.jpg',
      );
    });
  });

  describe('buildMusicGroupSchema (Entity Disambiguation)', () => {
    it('generates rich schema with explicit Twin Cities & Minnesota entity anchors', () => {
      const schema = buildMusicGroupSchema(mockConfig, 'https://kantorei.net');

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toContain('MusicGroup');
      expect(schema['@type']).toContain('PerformingGroup');
      expect(schema.name).toBe('Kantorei');
      expect(schema.foundingDate).toBe('1988');
      expect(schema.founder.name).toBe('Dr. Axel Theimer');
      expect(schema.musicDirector.name).toBe('Adam Reinwald');

      // Crucial disambiguation signals against kantorei.org (Denver, Colorado)
      expect(schema.disambiguatingDescription).toContain('Denver, Colorado');
      expect(schema.disambiguatingDescription).toContain('kantorei.org');
      expect(schema.alternateName).toContain('Kantorei Minnesota');
      expect(schema.alternateName).toContain('Kantorei Twin Cities');
      expect(schema.alternateName).toContain('Kantorei MN');

      // Geographic anchors
      expect(schema.address.addressLocality).toBe('Saint Paul');
      expect(schema.address.addressRegion).toBe('MN');
      expect(schema.areaServed.map((a: { name: string }) => a.name)).toEqual(
        expect.arrayContaining([
          'Minneapolis, MN',
          'Saint Paul, MN',
          'Twin Cities Metropolitan Area',
          'Minnesota',
        ]),
      );

      // Social anchors with MN handles
      expect(schema.sameAs).toContain('https://www.youtube.com/@kantoreiMN');
      expect(schema.sameAs).toContain('https://www.instagram.com/kantorei_mn');
    });
  });

  describe('buildWebSiteSchema', () => {
    it('builds canonical website schema with publisher reference', () => {
      const schema = buildWebSiteSchema('https://kantorei.net', 'Kantorei');
      expect(schema['@type']).toBe('WebSite');
      expect(schema.url).toBe('https://kantorei.net');
      expect(schema.name).toContain('Twin Cities');
      expect(schema.publisher['@id']).toBe('https://kantorei.net/#organization');
    });
  });

  describe('buildConcertEventSchemas', () => {
    it('creates MusicEvent schemas for each performance with venue and tickets', () => {
      const mockConcerts: ConcertEvent[] = [
        {
          slug: 'advent-with-kantorei',
          title: 'Advent with Kantorei',
          datesDisplay: 'Sat, Dec 19, 3:00 PM (Shoreview) & Sun, Dec 20, 3:00 PM (Edina)',
          venueName: 'Shepherd of the Hills, Shoreview · Good Shepherd, Edina',
          venueAddress: 'Shoreview & Edina, MN',
          description:
            'Gather in candlelight for Kantorei’s beloved annual Advent and Christmas concert tradition.',
          ttEventSeriesId: 'https://www.tickettailor.com/events/kantorei/12345',
          status: 'On_Sale',
          heroImageUrl: '/images/advent.webp',
          performances: [
            {
              dateDisplay: 'Sat, Dec 19, 3:00 PM',
              venueName: 'Shepherd of the Hills Lutheran Church',
              venueAddress: 'Shoreview, MN',
              label: 'Shoreview Performance',
              isoDate: '2026-12-19',
            },
            {
              dateDisplay: 'Sun, Dec 20, 3:00 PM',
              venueName: 'Lutheran Church of the Good Shepherd',
              venueAddress: 'Edina, MN',
              label: 'Edina Performance',
              isoDate: '2026-12-20',
            },
          ],
        },
      ];

      const schemas = buildConcertEventSchemas(
        mockConcerts,
        'https://kantorei.net',
        mockConfig,
      );

      expect(schemas.length).toBe(2);

      const shoreview = schemas[0];
      expect(shoreview['@type']).toBe('MusicEvent');
      expect(shoreview.name).toContain('Shoreview Performance');
      expect(shoreview.startDate).toBe('2026-12-19');
      expect((shoreview.location as any).name).toBe('Shepherd of the Hills Lutheran Church');
      expect((shoreview.location as any).address.addressLocality).toBe('Shoreview, MN');
      expect((shoreview.offers as any).url).toBe(
        'https://www.tickettailor.com/events/kantorei/12345',
      );
      expect((shoreview.offers as any).availability).toBe('https://schema.org/InStock');
      // Keywords enriched for Christmas / Advent search queries
      expect(shoreview.keywords).toContain('Christmas concert Twin Cities');
    });

    it('ignores draft concerts in structured data', () => {
      const draftConcerts: ConcertEvent[] = [
        {
          slug: 'draft-gala',
          title: 'Private Draft Gala',
          datesDisplay: 'TBA',
          venueName: 'TBA',
          venueAddress: 'Minneapolis, MN',
          description: 'Draft',
          ttEventSeriesId: 'DEMO',
          status: 'Draft',
        },
      ];

      const schemas = buildConcertEventSchemas(
        draftConcerts,
        'https://kantorei.net',
        mockConfig,
      );
      expect(schemas.length).toBe(0);
    });
  });

  describe('buildAuditionFaqSchema', () => {
    it('answers core queries prospective singers and audiences search for', () => {
      const faq = buildAuditionFaqSchema('Kantorei', 'https://kantorei.net', mockConfig);

      expect(faq['@type']).toBe('FAQPage');
      expect(faq.mainEntity.length).toBe(5);

      const questions = faq.mainEntity.map((q: any) => q.name);
      expect(questions).toContain('How do I audition for Kantorei in the Twin Cities?');
      expect(questions).toContain('What voice parts is Kantorei auditioning for?');
      expect(questions).toContain('When and where does Kantorei rehearse in Minnesota?');
      expect(questions).toContain('Are there mandatory dues or score fees to sing in Kantorei?');
      expect(questions).toContain(
        'How is Kantorei in Minnesota distinct from other choirs named Kantorei?',
      );

      // Verify disambiguation answer
      const disambiguationAnswer = faq.mainEntity.find((q: any) =>
        q.name.includes('distinct from other choirs'),
      );
      expect(disambiguationAnswer).toBeDefined();
      expect(disambiguationAnswer?.acceptedAnswer?.text).toContain('kantorei.net');
      expect(disambiguationAnswer?.acceptedAnswer?.text).toContain('kantorei.org');
      expect(disambiguationAnswer?.acceptedAnswer?.text).toContain('Denver, Colorado');
    });
  });

  describe('buildBreadcrumbsSchema', () => {
    it('constructs standard BreadcrumbList', () => {
      const breadcrumbs = buildBreadcrumbsSchema(
        [
          { name: 'Home', path: '/' },
          { name: 'Concerts & Tickets', path: '/concerts' },
        ],
        'https://kantorei.net',
      );

      expect(breadcrumbs['@type']).toBe('BreadcrumbList');
      expect(breadcrumbs.itemListElement).toHaveLength(2);
      expect(breadcrumbs.itemListElement[0].position).toBe(1);
      expect(breadcrumbs.itemListElement[0].item).toBe('https://kantorei.net/');
      expect(breadcrumbs.itemListElement[1].position).toBe(2);
      expect(breadcrumbs.itemListElement[1].item).toBe('https://kantorei.net/concerts');
    });
  });

  describe('robots.txt verification', () => {
    it('exists and correctly protects portal routes while declaring sitemap', () => {
      const robotsPath = path.resolve(process.cwd(), 'public/robots.txt');
      expect(fs.existsSync(robotsPath)).toBe(true);

      const content = fs.readFileSync(robotsPath, 'utf-8');
      expect(content).toContain('User-agent: *');
      expect(content).toContain('Allow: /');
      expect(content).toContain('Allow: /concerts');
      expect(content).toContain('Allow: /auditions');
      expect(content).toContain('Allow: /sitemap.xml');
      expect(content).toContain('Disallow: /portal/');
      expect(content).toContain('Disallow: /api/');
      expect(content).toContain('Sitemap: https://kantorei.net/sitemap.xml');
    });
  });

  describe('sitemap.xml endpoint', () => {
    it('returns valid XML sitemap with all primary public routes and proper headers', async () => {
      const response = await getSitemap({ locals: {} } as any);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/xml');
      const xml = await response.text();
      expect(xml).toContain('https://kantorei.net/');
      expect(xml).toContain('https://kantorei.net/concerts');
      expect(xml).toContain('https://kantorei.net/auditions');
      expect(xml).toContain('https://kantorei.net/about');
      expect(xml).toContain('https://kantorei.net/media');
      expect(xml).toContain('https://kantorei.net/support');
    });
  });

  describe('DEFAULT_SEO_KEYWORDS', () => {
    it('contains high-intent audience and singer search terms', () => {
      expect(DEFAULT_SEO_KEYWORDS).toContain('choral music twin cities');
      expect(DEFAULT_SEO_KEYWORDS).toContain('best choirs in the twin cities');
      expect(DEFAULT_SEO_KEYWORDS).toContain('Christmas concerts twin cities');
      expect(DEFAULT_SEO_KEYWORDS).toContain('choir auditions twin cities');
      expect(DEFAULT_SEO_KEYWORDS).toContain('kantorei net');
    });
  });
});
