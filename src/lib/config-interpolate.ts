import type { PortalConfig } from '../types/choir';

/**
 * Extracts a clean numeric phone number formatted for tel: links (E.164).
 * Gracefully handles vanity formats like "612-21-SINGS (612-217-4647)".
 */
export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  // Match standard 10-digit US number anywhere in the string (e.g. within parentheses or dashes)
  const standardMatch = phone.match(/(?:\+?1[\s.-]?)?\(?([2-9]\d{2})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/);
  if (standardMatch) {
    return `+1${standardMatch[1]}${standardMatch[2]}${standardMatch[3]}`;
  }
  const digits = phone.replace(/[^0-9+]/g, '');
  if (!digits) return phone;
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Interpolates dynamic tokens into copy blurbs.
 *
 * Supported tokens (case-insensitive):
 * - `{Choir_Name}`, `{choir}`
 * - `{Contact_Email}`, `{email}`
 * - `{Contact_Phone}`, `{phone}`
 * - `{Contact_Phone_Clean}`, `{phone_clean}` (clean digits for tel: links)
 * - `{Contact_Address}`, `{address}`
 * - `{Conductor_Name}`, `{conductor}`, `{artistic_director}`
 * - `{Conductor_Email}`
 * - `{Manager_Email}`
 * - Any valid key from the PortalConfig object
 */
export function interpolateConfigTokens(text: string, config: Partial<PortalConfig>): string {
  if (!text || typeof text !== 'string') return text;

  const choirName = config.Choir_Name || 'Kantorei';
  const email = config.Contact_Email || 'info@kantorei.net';
  const phone = config.Contact_Phone || '612-21-SINGS (612-217-4647)';
  const cleanPhone = cleanPhoneNumber(phone);
  const address = config.Contact_Address || '660 23rd Ave NW, Saint Paul, MN 55112';
  const conductorName = config.Conductor_Name || 'Adam Reinwald';
  const conductorEmail = config.Conductor_Email || 'adam.reinwald@kantorei.net';
  const managerEmail = config.Manager_Email || '';

  let result = text;

  // Pre-process tel:{Contact_Phone} and tel:{phone} to avoid unescaped parens in URLs
  result = result.replace(/tel:\{(?:Contact_Phone|phone|contact_phone)\}/gi, `tel:${cleanPhone}`);

  const tokenMap: Record<string, string> = {
    choir_name: choirName,
    choir: choirName,
    contact_email: email,
    email: email,
    contact_phone: phone,
    phone: phone,
    contact_phone_clean: cleanPhone,
    phone_clean: cleanPhone,
    contact_address: address,
    address: address,
    conductor_name: conductorName,
    conductor: conductorName,
    artistic_director: conductorName,
    conductor_email: conductorEmail,
    manager_email: managerEmail,
  };

  // Replace tokens enclosed in {curly_braces}
  result = result.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, rawKey) => {
    const lowerKey = rawKey.toLowerCase();
    if (lowerKey in tokenMap) {
      return tokenMap[lowerKey];
    }
    const directVal = config[rawKey];
    if (typeof directVal === 'string') {
      return directVal;
    }
    return match;
  });

  return result;
}

/**
 * Iterates through all string values in a PortalConfig object and dynamically
 * interpolates dynamic tokens ({Contact_Email}, {Choir_Name}, etc.).
 */
export function interpolateAllConfig(config: PortalConfig): PortalConfig {
  const result: PortalConfig = { ...config };
  for (const [key, val] of Object.entries(result)) {
    if (typeof val === 'string' && val.includes('{')) {
      result[key] = interpolateConfigTokens(val, config);
    }
  }
  return result;
}

/**
 * Transforms Markdown links ([label](url)) and auto-links plain email addresses into
 * accessible, styled <a> tags without risk of double-wrapping.
 */
export function formatRichText(text: string): string {
  if (!text) return '';

  // 1. Convert markdown links: [label](url)
  const renderedMarkdown = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    let cleanUrl = (url as string).trim();
    if (cleanUrl.startsWith('tel:')) {
      const rawNum = cleanUrl.slice(4);
      cleanUrl = `tel:${cleanPhoneNumber(rawNum)}`;
    }
    return `<a href="${cleanUrl}" class="font-semibold text-navy-900 underline decoration-gold-500 underline-offset-4 hover:text-gold-600">${label}</a>`;
  });

  // 2. Only auto-link emails in text segments outside of existing <a> tags
  const parts = renderedMarkdown.split(/(<a\b[^>]*>.*?<\/a>)/gi);
  const processed = parts.map((part) => {
    if (part.startsWith('<a')) return part;
    return part.replace(
      /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
      `<a href="mailto:$1" class="font-semibold text-navy-900 underline decoration-gold-500 underline-offset-4 hover:text-gold-600">$1</a>`
    );
  });

  return processed.join('');
}

