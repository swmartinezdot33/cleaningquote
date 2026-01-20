/**
 * Fetch and parse KML from a network URL
 * Handles NetworkLink references and caches results
 */

import { parseKML } from './parseKML';

const CACHE_DURATION_MS = 1 * 60 * 60 * 1000; // 1 hour cache

interface CachedKML {
  polygons: Array<Array<[number, number]>>;
  fetchedAt: number;
}

// In-memory cache for KML data
const kmlCache = new Map<string, CachedKML>();

/**
 * Fetch KML file from a network URL and extract polygon coordinates
 * Results are cached for 1 hour to avoid excessive network requests
 * 
 * @param url - The URL to fetch the KML file from
 * @returns Object with polygons array or error
 */
export async function fetchAndParseNetworkKML(
  url: string
): Promise<{ polygons: Array<Array<[number, number]>>; error?: string }> {
  try {
    // Validate the URL
    if (!url || url.trim().length === 0) {
      return {
        polygons: [],
        error: 'URL is empty or invalid',
      };
    }

    const trimmedUrl = url.trim();

    // Try to parse the URL to ensure it's valid
    try {
      // Attempt to parse as-is first
      new URL(trimmedUrl);
    } catch (e) {
      // If parsing fails, try to encode the URL properly
      try {
        // Extract the base URL and query string separately
        const urlObj = new URL(trimmedUrl);
        // If we get here, URL was valid after all
      } catch (e2) {
        // URL is still invalid - provide helpful error
        console.error('Invalid URL format:', trimmedUrl);
        return {
          polygons: [],
          error: `Invalid URL format: ${url}. Make sure the URL is a complete, valid link to a KML file.`,
        };
      }
    }

    // Check if we have a cached result that's still valid
    const cached = kmlCache.get(trimmedUrl);
    if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION_MS) {
      console.log(`[fetchNetworkKML] Using cached KML for ${trimmedUrl}`);
      return { polygons: cached.polygons };
    }

    console.log(`[fetchNetworkKML] Fetching KML from ${trimmedUrl}`);

    // Fetch the KML file with better headers for Google Maps compatibility
    const response = await fetch(trimmedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/vnd.google-earth.kml+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/maps/',
      },
      // Add timeout and follow redirects
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });

    if (!response.ok) {
      return {
        polygons: [],
        error: `Failed to fetch KML from URL: HTTP ${response.status} ${response.statusText}. Make sure the URL is publicly accessible.`,
      };
    }

    let kmlContent: string;
    try {
      kmlContent = await response.text();
    } catch (textError) {
      return {
        polygons: [],
        error: `Failed to read response from URL: ${textError instanceof Error ? textError.message : 'Unknown error'}`,
      };
    }

    if (!kmlContent || kmlContent.trim().length === 0) {
      return {
        polygons: [],
        error: 'The URL returned empty content. Please ensure it points to a valid KML file.',
      };
    }

    // Parse the KML content
    const parsed = parseKML(kmlContent);

    if (parsed.error) {
      return {
        polygons: [],
        error: `Failed to parse fetched KML: ${parsed.error}`,
      };
    }

    // If it's another NetworkLink, we don't recursively follow (prevent infinite loops)
    if (parsed.networkLink) {
      return {
        polygons: [],
        error: 'The fetched KML is itself a NetworkLink reference. Please ensure the final URL points to actual polygon data.',
      };
    }

    if (!parsed.polygons || parsed.polygons.length === 0) {
      return {
        polygons: [],
        error: 'No polygon coordinates found in the fetched KML file. The URL may contain a NetworkLink reference instead of actual polygon data.',
      };
    }

    // Cache the result
    kmlCache.set(trimmedUrl, {
      polygons: parsed.polygons,
      fetchedAt: Date.now(),
    });

    console.log(`[fetchNetworkKML] Successfully fetched and cached KML with ${parsed.polygons.length} polygon(s)`);

    return { polygons: parsed.polygons };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[fetchNetworkKML] Error fetching/parsing KML from ${url}:`, errorMsg);

    return {
      polygons: [],
      error: `Failed to fetch KML from URL: ${errorMsg}`,
    };
  }
}

/**
 * Clear the KML cache (useful for manual refresh)
 */
export function clearKMLCache(): void {
  kmlCache.clear();
  console.log('[fetchNetworkKML] Cleared KML cache');
}

/**
 * Clear cache for a specific URL
 */
export function clearKMLCacheForURL(url: string): void {
  kmlCache.delete(url);
  console.log(`[fetchNetworkKML] Cleared cache for ${url}`);
}
