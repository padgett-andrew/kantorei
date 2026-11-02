/**
 * Mapping & Navigation Utilities
 * Generates direct navigation URLs for Google Maps and Apple Maps across desktop and mobile.
 */

/**
 * Normalizes location strings for optimal geocoding on mapping services.
 * Handles patterns like "Main Sanctuary, Shepherd of the Hills Lutheran Church, Shoreview"
 * or "Lutheran Church of the Good Shepherd, Edina"
 */
export function cleanLocationForMaps(rawLocation: string): string {
  if (!rawLocation) return '';

  let cleaned = rawLocation.trim();

  // Strip generic room prefixes if followed by venue name
  cleaned = cleaned.replace(/^(?:main\s+sanctuary|fellowship\s+hall|choir\s+room|sanctuary)\s*,\s*/i, '');

  // If location doesn't specify a state or Twin Cities, append MN for accurate geocoding if it's a known local venue/city
  const hasState = /\b(MN|Minnesota|WI|Wisconsin)\b/i.test(cleaned);
  if (!hasState) {
    if (/\b(Shoreview|Edina|Minneapolis|St\.?\s*Paul|Saint\s*Paul|Roseville|St\.?\s*Anthony)\b/i.test(cleaned)) {
      cleaned = `${cleaned}, MN`;
    }
  }

  return cleaned;
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
  return lower !== '' && lower !== 'tbd' && lower !== 'to be determined' && lower !== 'online' && lower !== 'zoom';
}

