"use client";

/**
 * Browser Fingerprint Generator
 * 
 * Generates a lightweight, privacy-respecting fingerprint for anonymous user tracking.
 * Used to enforce daily credit limits for non-authenticated users.
 * 
 * @module lib/utils/fingerprint
 */

const FINGERPRINT_STORAGE_KEY = "scai_fp";
const FINGERPRINT_VERSION = 1;

/**
 * Collect browser characteristics for fingerprinting
 */
function collectBrowserCharacteristics(): string[] {
  const characteristics: string[] = [];

  // User agent
  characteristics.push(navigator.userAgent || "unknown_ua");

  // Screen resolution
  characteristics.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

  // Timezone
  characteristics.push(Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown_tz");

  // Language
  characteristics.push(navigator.language || "unknown_lang");

  // Platform
  characteristics.push(navigator.platform || "unknown_platform");

  // Hardware concurrency (CPU cores)
  characteristics.push(String(navigator.hardwareConcurrency || 0));

  // Device memory (if available)
  const nav = navigator as Navigator & { deviceMemory?: number };
  characteristics.push(String(nav.deviceMemory || 0));

  // Touch support
  characteristics.push(String("ontouchstart" in window || navigator.maxTouchPoints > 0));

  // WebGL renderer (if available)
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        characteristics.push(
          (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "unknown_gl"
        );
      }
    }
  } catch {
    characteristics.push("no_webgl");
  }

  // Plugins count
  characteristics.push(String(navigator.plugins?.length || 0));

  return characteristics;
}

/**
 * Generate a hash from the characteristics array
 * Uses a simple non-cryptographic hash for client-side use
 */
async function hashCharacteristics(characteristics: string[]): Promise<string> {
  const data = characteristics.join("|");
  
  // Use SubtleCrypto if available for better hashing
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    } catch {
      // Fall through to fallback hash
    }
  }

  // Fallback: Simple hash function (djb2)
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) ^ data.charCodeAt(i);
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

/**
 * Get stored fingerprint from localStorage
 */
function getStoredFingerprint(): string | null {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = localStorage.getItem(FINGERPRINT_STORAGE_KEY);
    if (!stored) return null;
    
    const { version, fingerprint } = JSON.parse(stored);
    if (version !== FINGERPRINT_VERSION) return null;
    
    return fingerprint;
  } catch {
    return null;
  }
}

/**
 * Store fingerprint in localStorage
 */
function storeFingerprint(fingerprint: string): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(
      FINGERPRINT_STORAGE_KEY,
      JSON.stringify({
        version: FINGERPRINT_VERSION,
        fingerprint,
        timestamp: Date.now(),
      })
    );
  } catch {
    // Storage not available, continue without caching
  }
}

/**
 * Generate a browser fingerprint
 * 
 * Returns a cached fingerprint if available, otherwise generates a new one.
 * The fingerprint is a SHA-256 hash of browser characteristics.
 * 
 * @returns Promise<string> - A 64-character hexadecimal fingerprint
 * 
 * @example
 * ```typescript
 * const fingerprint = await generateFingerprint();
 * // Use in API requests for anonymous credit tracking
 * fetch('/api/generate', {
 *   headers: { 'X-Fingerprint': fingerprint }
 * });
 * ```
 */
export async function generateFingerprint(): Promise<string> {
  // Check for cached fingerprint
  const cached = getStoredFingerprint();
  if (cached) return cached;

  // Generate new fingerprint
  const characteristics = collectBrowserCharacteristics();
  const fingerprint = await hashCharacteristics(characteristics);

  // Cache for future use
  storeFingerprint(fingerprint);

  return fingerprint;
}

/**
 * Clear stored fingerprint
 * Useful for testing or reset scenarios
 */
export function clearStoredFingerprint(): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.removeItem(FINGERPRINT_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if fingerprint is valid format
 */
export function isValidFingerprint(fingerprint: string): boolean {
  return /^[a-f0-9]{16,64}$/i.test(fingerprint);
}
