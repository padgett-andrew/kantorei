/**
 * Mapping & Navigation Utilities
 * Generates direct navigation URLs for Google Maps and Apple Maps across desktop and mobile.
 */

const TWIN_CITIES_CITIES_REGEX =
  /\b(Shoreview|Edina|Minneapolis|St\.?\s*Paul|Saint\s*Paul|Roseville|Bloomington|Minnetonka|Plymouth|Wayzata|Eden\s*Prairie|Stillwater|Woodbury|Eagan|Burnsville|Maple\s*Grove|Hopkins|Golden\s*Valley|St\.?\s*Louis\s*Park|St\.?\s*Anthony)\b/i;

/**
 * Robustly builds an unambiguous single-venue location query for mapping & directions.
 * Eliminates cross-city pollution (e.g., prevents "Shepherd of the Hills, Shoreview, Shoreview & Edina, MN")
 * and extracts the exact venue + city.
 */
export function buildCleanLocationQuery(
  venueName = '',
  venueAddress = ''
): string {
  let vName = (venueName || '').trim();
  let vAddr = (venueAddress || '').trim();

  if (!vName && !vAddr) return '';
  if (!vAddr) return ensureState(vName);
  if (!vName) return ensureState(vAddr);

  // Strip generic sanctuary room prefixes
  vName = vName.replace(
    /^(?:main\s+sanctuary|fellowship\s+hall|choir\s+room|sanctuary)\s*,\s*/i,
    ''
  );

  // If address has multiple cities or delimiters like "Shoreview & Edina, MN" or "Addr 1 · Addr 2"
  if (/&|·|\/|\band\b/i.test(vAddr)) {
    // Check if venueName already identifies a specific city
    const cityMatch = TWIN_CITIES_CITIES_REGEX.exec(vName);
    if (cityMatch) {
      vAddr = `${cityMatch[1]}, MN`;
    }
  }

  // Remove duplicate city if venue already ends with it
  const cityMatch = TWIN_CITIES_CITIES_REGEX.exec(vName);
  if (cityMatch && vAddr.toLowerCase().startsWith(cityMatch[1].toLowerCase())) {
    return ensureState(vName);
  }

  // If venue already includes the address
  if (vName.toLowerCase().includes(vAddr.toLowerCase())) {
    return ensureState(vName);
  }

  return ensureState(`${vName}, ${vAddr}`);
}

function ensureState(raw: string): string {
  let cleaned = raw.replace(/\s*,\s*,+/g, ', ').trim();
  const hasState = /\b(MN|Minnesota|WI|Wisconsin)\b/i.test(cleaned);
  if (!hasState) {
    if (TWIN_CITIES_CITIES_REGEX.test(cleaned)) {
      cleaned = `${cleaned}, MN`;
    }
  }
  return cleaned;
}

/**
 * Normalizes location strings for optimal geocoding on mapping services.
 * Handles patterns like "Main Sanctuary, Shepherd of the Hills Lutheran Church, Shoreview"
 * or "Lutheran Church of the Good Shepherd, Edina"
 */
export function cleanLocationForMaps(rawLocation: string): string {
  if (!rawLocation) return '';

  let cleaned = rawLocation.trim();

  // Strip generic room prefixes if followed by venue name
  cleaned = cleaned.replace(
    /^(?:main\s+sanctuary|fellowship\s+hall|choir\s+room|sanctuary)\s*,\s*/i,
    ''
  );

  // If the location string accidentally has multiple cities concatenated (e.g. "Shoreview, Shoreview & Edina, MN")
  const cityMatches = Array.from(cleaned.matchAll(new RegExp(TWIN_CITIES_CITIES_REGEX, 'gi')));
  if (cityMatches.length > 1 && cleaned.includes('&')) {
    // Pick the first mentioned city and clean trailing multiple cities
    const firstCity = cityMatches[0][0];
    cleaned = cleaned.replace(/\s*,\s*[^,]*&[^,]*,\s*MN/i, `, ${firstCity}, MN`);
  }

  return ensureState(cleaned);
}

export function getGoogleMapsUrl(location: string): string {
  const query = cleanLocationForMaps(location);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getAppleMapsUrl(location: string): string {
  const query = cleanLocationForMaps(location);
  return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
}

export function isNavigableLocation(location?: string | null): boolean {
  if (!location) return false;
  const lower = location.trim().toLowerCase();
  return (
    lower !== '' &&
    lower !== 'tbd' &&
    !lower.includes('tba') &&
    !lower.includes('to be announced') &&
    !lower.includes('to be determined') &&
    lower !== 'online' &&
    lower !== 'zoom'
  );
}
