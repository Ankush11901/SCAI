/**
 * Parses a Google Business Profile / Google Maps URL to extract
 * business information embedded in the URL text.
 *
 * Handles:
 *   /place/Business+Name/@lat,lng,...
 *   /place/Business+Name,+123+Main+St,+City,+ST+12345/@...
 *
 * Does NOT handle (returns null):
 *   ?cid=123456  (opaque numeric ID)
 *   g.page/...   (short link, needs redirect)
 *   maps.app.goo.gl/...  (short link)
 */

export interface ParsedGbpData {
  businessName?: string;
  city?: string;
  stateRegion?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
}

export function parseGbpUrl(url: string): ParsedGbpData | null {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // Must look like a Google Maps URL
  if (
    !trimmed.includes("google.com/maps") &&
    !trimmed.includes("maps.google.com") &&
    !trimmed.includes("google.com/maps/place")
  ) {
    return null;
  }

  const result: ParsedGbpData = {};

  // Extract coordinates from @lat,lng pattern
  const coordMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (coordMatch) {
    result.lat = parseFloat(coordMatch[1]);
    result.lng = parseFloat(coordMatch[2]);
  }

  // Extract the text between /place/ and the next /@ or /
  const placeMatch = trimmed.match(/\/place\/([^/@]+)/);
  if (placeMatch) {
    const rawText = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));

    if (rawText.trim()) {
      // Split by comma (with optional surrounding whitespace)
      const parts = rawText.split(/\s*,\s*/).filter(Boolean);

      if (parts.length > 0) {
        // First part is always the business name
        result.businessName = parts[0].trim();

        if (parts.length >= 3) {
          // Try to extract address components from remaining parts
          const addressParts = parts.slice(1).map((p) => p.trim());
          let lastIdx = addressParts.length - 1;

          // Check if last part is a postal code (standalone digits, 4-10 chars)
          if (/^\d[\d\s-]{2,9}$/.test(addressParts[lastIdx])) {
            result.postalCode = addressParts[lastIdx];
            lastIdx--;
          }

          // Check if last remaining part is "STATE ZIP" combined (e.g. "OR 97201")
          if (lastIdx >= 0) {
            const stateZipMatch = addressParts[lastIdx].match(
              /^([A-Z]{2,3})\s+(\d[\d\s-]{2,9})$/
            );
            if (stateZipMatch) {
              result.stateRegion = stateZipMatch[1];
              if (!result.postalCode) result.postalCode = stateZipMatch[2];
              lastIdx--;
            } else if (/^[A-Z]{2,3}$/.test(addressParts[lastIdx])) {
              result.stateRegion = addressParts[lastIdx];
              lastIdx--;
            }
          }

          // The last remaining part (before state) is likely the city
          if (lastIdx >= 0) {
            result.city = addressParts[lastIdx];
          }
        }
      }
    }
  }

  // Return if we extracted anything useful (name or coordinates)
  if (!result.businessName && !result.lat) return null;

  return result;
}
