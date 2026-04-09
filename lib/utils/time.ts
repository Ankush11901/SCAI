/**
 * Time formatting utilities for human-readable durations
 */

/**
 * Convert an ISO timestamp to a human-readable duration (e.g., "28 days", "4 hours")
 * @param isoTimestamp - ISO 8601 timestamp string (e.g., "2026-03-18T00:00:00.000Z")
 * @param fallback - Fallback string to return if timestamp is null/undefined (default: "~28 days")
 * @returns Human-readable duration or fallback if timestamp is null/undefined
 */
export function formatTimeUntil(isoTimestamp?: string | null, fallback: string = "~28 days"): string {
  if (!isoTimestamp) return fallback;

  const now = new Date();
  const target = new Date(isoTimestamp);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return "soon";

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? "1 day" : `${days} days`;
  }

  if (hours > 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }

  if (minutes > 0) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }

  return "soon";
}

/**
 * Format a reset time as a short string (e.g., "in 28d", "in 4h")
 * @param isoTimestamp - ISO 8601 timestamp string
 * @returns Short format duration or "—" if invalid
 */
export function formatTimeUntilShort(isoTimestamp?: string | null): string {
  if (!isoTimestamp) return "—";

  const now = new Date();
  const target = new Date(isoTimestamp);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return "soon";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `in ${hours}h`;
  
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}
