import type { ConcertEvent, PortalConfig } from '../types/choir';
import { getEnv } from './env';

/**
 * Resolves the canonical base site URL for absolute URLs and schema references.
 */
export function getSiteUrl(locals?: App.Locals): string {
  const envUrl = getEnv('PUBLIC_SITE_URL', locals);
  const raw = envUrl && envUrl.trim() !== '' ? envUrl.trim() : 'https://kantorei.net';
  return raw.replace(/\/+$/, '');
}

/**
 * Converts a relative path (e.g. "/images/kantorei-logo.webp") to an absolute URL
 * required by OpenGraph, Twitter Cards, and Schema.org JSON-LD.
 */
export function toAbsoluteUrl(pathOrUrl: string, locals?: App.Locals): string {
  if (!pathOrUrl) return `${getSiteUrl(locals)}/images/kantorei-logo.webp`;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const siteUrl = getSiteUrl(locals);
  const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${siteUrl}${cleanPath}`;
}

export const DEFAULT_SEO_KEYWORDS = [
  'choral music twin cities',
  'best choirs in the twin cities',
  'chamber choir minneapolis',
  'a cappella choir st paul',
  'Christmas concerts twin cities',
  'Advent with Kantorei',
  'holiday choir concerts minnesota',
  'choral music minnesota',
  'choir auditions twin cities',
  'choral auditions minneapolis',
  'sing in choir twin cities',
  'kantorei minnesota',
  'kantorei twin cities',
  'kantorei net',
].join(', ');

/**
 * Builds canonical Schema.org MusicGroup / PerformingGroup / NGO structured data.
 * Crucially provides unambiguous entity signals (geography, founding year, founder,
 * director, sameAs handles) to distinguish Kantorei (MN, kantorei.net) from
 * Kantorei (CO, kantorei.org).
 */
export function buildMusicGroupSchema(config: PortalConfig, siteUrl: string) {
  const choirName = config.Choir_Name || 'Kantorei';
  const director = config.Conductor_Name || 'Adam Reinwald';

  return {
    '@context': 'https://schema.org',
    '@type': ['MusicGroup', 'PerformingGroup', 'NGO'],
    '@id': `${siteUrl}/#organization`,
    name: choirName,
    legalName: choirName,
    alternateName: [
      `${choirName} Minnesota`,
      `${choirName} Twin Cities`,
      `${choirName} MN`,
      `${choirName} Choir MN`,
      `${choirName} Chamber Choir`,
      'Kantorei (Minnesota)',
    ],
    disambiguatingDescription:
      'Premier a cappella chamber choir founded in 1988 based in Minneapolis and Saint Paul (Twin Cities), Minnesota. Not affiliated with Kantorei in Denver, Colorado (kantorei.org).',
    description: `Founded in 1988 by Dr. Axel Theimer and led by Artistic Director ${director}, ${choirName} is one of Minnesota's premier a cappella chamber choirs, sharing luminous, effortless sound and singing for a lifetime across the Twin Cities metropolitan area.`,
    url: siteUrl,
    logo: toAbsoluteUrl('/images/kantorei-logo.webp', undefined),
    image: [
      toAbsoluteUrl('/images/kantorei-logo.webp', undefined),
      toAbsoluteUrl('/images/advent-with-kantorei.webp', undefined),
    ],
    foundingDate: '1988',
    foundingLocation: {
      '@type': 'Place',
      name: 'Twin Cities, Minnesota, USA',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Minneapolis-Saint Paul',
        addressRegion: 'MN',
        addressCountry: 'US',
      },
    },
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'Minneapolis, MN' },
      { '@type': 'AdministrativeArea', name: 'Saint Paul, MN' },
      { '@type': 'AdministrativeArea', name: 'Twin Cities Metropolitan Area' },
      { '@type': 'AdministrativeArea', name: 'Minnesota' },
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: '660 23rd Ave NW',
      addressLocality: 'Saint Paul',
      addressRegion: 'MN',
      postalCode: '55112',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '45.0506',
      longitude: '-93.1818',
    },
    genre: [
      'Choral Music',
      'A Cappella',
      'Chamber Choir',
      'Sacred Choral Music',
      'Contemporary Choral',
      'Classical Music',
      'Christmas & Advent Choral Traditions',
    ],
    knowsAbout: [
      'Choral Music',
      'A Cappella Singing',
      'Vocal Health',
      'Lifelong Singing',
      'Twin Cities Choirs',
      'Minnesota Choral Heritage',
      'Christmas Concerts in Minneapolis and St. Paul',
    ],
    founder: {
      '@type': 'Person',
      name: 'Dr. Axel Theimer',
    },
    musicDirector: {
      '@type': 'Person',
      name: director,
    },
    email: config.Contact_Email || 'info@kantorei.net',
    telephone: config.Contact_Phone || '612-21-SINGS (612-217-4647)',
    sameAs: [
      config.YouTube_URL || 'https://www.youtube.com/@kantoreiMN',
      config.Instagram_URL || 'https://www.instagram.com/kantorei_mn',
      config.Facebook_URL || 'https://www.facebook.com/kantoreimn',
      'https://www.tickettailor.com/events/kantorei',
    ].filter(Boolean),
  };
}

/**
 * Builds Schema.org WebSite structured data with sitename and publisher reference.
 */
export function buildWebSiteSchema(siteUrl: string, choirName: string = 'Kantorei') {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: `${choirName} · Twin Cities A Cappella Chamber Choir`,
    alternateName: [
      `${choirName} Minnesota`,
      `${choirName} Twin Cities`,
      'Kantorei.net',
    ],
    description: `Official website of ${choirName}, premier a cappella chamber choir in Minneapolis & Saint Paul, Minnesota. Upcoming choral concerts, Advent & Christmas traditions, singer auditions, and recordings.`,
    publisher: {
      '@id': `${siteUrl}/#organization`,
    },
    inLanguage: 'en-US',
  };
}

/**
 * Builds Schema.org MusicEvent structured data for each concert performance.
 * Enables Google Event rich snippets for queries like "Christmas concerts Twin Cities"
 * and "choral concerts Minneapolis".
 */
export function buildConcertEventSchemas(
  concerts: ConcertEvent[],
  siteUrl: string,
  config: PortalConfig,
): Record<string, unknown>[] {
  const choirName = config.Choir_Name || 'Kantorei';
  const schemas: Record<string, unknown>[] = [];

  for (const concert of concerts) {
    if (concert.status === 'Draft') continue;

    const baseEventUrl = `${siteUrl}/concerts#${concert.slug}`;
    const concertImage = concert.heroImageUrl
      ? toAbsoluteUrl(concert.heroImageUrl, undefined)
      : concert.posterImageUrl
        ? toAbsoluteUrl(concert.posterImageUrl, undefined)
        : toAbsoluteUrl('/images/kantorei-logo.webp', undefined);

    const isTicketTailor =
      concert.ttEventSeriesId &&
      !/free|goodwill|door/i.test(concert.ttEventSeriesId) &&
      !concert.ttEventSeriesId.includes('DEMO');

    const ticketingUrl =
      isTicketTailor && /^https?:\/\//i.test(concert.ttEventSeriesId)
        ? concert.ttEventSeriesId
        : baseEventUrl;

    // Check if the concert is a Christmas / Advent event to enrich genre/keywords
    const isChristmasOrAdvent = /advent|christmas|carol|winter|holiday/i.test(
      `${concert.title} ${concert.description}`,
    );

    const performances =
      concert.performances && concert.performances.length > 0
        ? concert.performances
        : [
            {
              dateDisplay: concert.datesDisplay,
              venueName: concert.venueName,
              venueAddress: concert.venueAddress,
              label: concert.datesDisplay,
              isoDate: undefined,
            },
          ];

    for (let i = 0; i < performances.length; i++) {
      const perf = performances[i];
      const perfName =
        performances.length > 1
          ? `${concert.title} — ${perf.label || perf.dateDisplay} (${choirName})`
          : `${concert.title} — ${choirName}`;

      const venueName = perf.venueName || concert.venueName || 'Twin Cities Sanctuary Venue';
      const venueAddress = perf.venueAddress || concert.venueAddress || 'Minneapolis & St. Paul, MN';

      const eventSchema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'MusicEvent',
        '@id': `${baseEventUrl}-perf-${i + 1}`,
        name: perfName,
        description: concert.description,
        url: baseEventUrl,
        image: [concertImage],
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        performer: {
          '@type': 'MusicGroup',
          name: choirName,
          '@id': `${siteUrl}/#organization`,
        },
        organizer: {
          '@type': 'Organization',
          name: choirName,
          '@id': `${siteUrl}/#organization`,
          url: siteUrl,
        },
        location: {
          '@type': 'Place',
          name: venueName,
          address: {
            '@type': 'PostalAddress',
            addressLocality: venueAddress,
            addressRegion: 'MN',
            addressCountry: 'US',
          },
        },
        offers: {
          '@type': 'Offer',
          url: ticketingUrl,
          availability:
            concert.status === 'On_Sale'
              ? 'https://schema.org/InStock'
              : 'https://schema.org/PreOrder',
          priceCurrency: 'USD',
          validFrom: '2026-08-01',
        },
      };

      if (perf.isoDate) {
        // e.g. 2026-12-19
        eventSchema.startDate = perf.isoDate;
      }

      if (isChristmasOrAdvent) {
        eventSchema.keywords =
          'Christmas concert Twin Cities, Advent choral concert, holiday choir Minneapolis St Paul, a cappella carols';
      }

      schemas.push(eventSchema);
    }
  }

  return schemas;
}

/**
 * Builds Schema.org FAQPage structured data for the Auditions page.
 * Highly valuable for capturing singer searches like "how to audition for choir in twin cities"
 * and disambiguating Kantorei's location and identity.
 */
export function buildAuditionFaqSchema(
  choirName: string = 'Kantorei',
  siteUrl: string = 'https://kantorei.net',
  config?: PortalConfig,
) {
  const contactEmail = config?.Contact_Email || 'info@kantorei.net';

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How do I audition for ${choirName} in the Twin Cities?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `We hold auditions in the Spring (usually mid-May) and the Fall (mid-August) for our concert season. Auditions are heard by Artistic Director Adam Reinwald and section leaders, and consist of singing a prepared selection a cappella, some basic musicianship and range checks, and a brief interview. Inquiries and singer submissions are warmly welcomed year-round via our audition form or by emailing ${contactEmail}.`,
        },
      },
      {
        '@type': 'Question',
        name: `What voice parts is ${choirName} auditioning for?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${choirName} welcomes experienced Twin Cities choral singers across all voice parts: Soprano (S1, S2), Alto (A1, A2), Tenor (T1, T2), and Bass (B1, B2) who share our dedication to vocal health, independent score preparation, and expressive a cappella ensemble singing.`,
        },
      },
      {
        '@type': 'Question',
        name: `When and where does ${choirName} rehearse in Minnesota?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${choirName} rehearses Sunday evenings at rotating church and acoustic venues across the Minneapolis–Saint Paul metropolitan area (typically 6–8 rehearsals per concert cycle), beginning each season with an annual community singer retreat.`,
        },
      },
      {
        '@type': 'Question',
        name: `Are there mandatory dues or score fees to sing in ${choirName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `No. ${choirName} believes choral artistry should be accessible. Membership is free of mandatory singer dues, and sheet music and practice tracks are provided via our private singer portal, sustained through generous donor contributions and ticket sales.`,
        },
      },
      {
        '@type': 'Question',
        name: `How is ${choirName} in Minnesota distinct from other choirs named Kantorei?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Kantorei (Minnesota, operating at ${siteUrl}) is an independent 501(c)(3) a cappella chamber choir founded in 1988 by Dr. Axel Theimer and based in the Twin Cities (Minneapolis & Saint Paul). It is not affiliated with Kantorei in Denver, Colorado (kantorei.org). Our repertoire focuses on vocal health, effortless sound, choral masterworks, and contemporary commissions.`,
        },
      },
    ],
  };
}

/**
 * Builds Schema.org BreadcrumbList structured data.
 */
export function buildBreadcrumbsSchema(
  items: { name: string; path: string }[],
  siteUrl: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.path.startsWith('http') ? item.path : `${siteUrl}${item.path}`,
    })),
  };
}
