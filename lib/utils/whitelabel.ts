/**
 * Whitelabel Domain Utilities
 * 
 * These utilities can be safely imported in both client and server components
 * since they don't have any server-side dependencies (database, etc.)
 */

// Whitelabel domain - users with this domain get unlimited quota and full feature access
// This is duplicated here to avoid importing from auth.ts which has database dependencies
const WHITELABEL_DOMAIN = process.env.NEXT_PUBLIC_WHITELABEL_DOMAIN || 'whitelabelresell.com'

/**
 * Check if a user's email belongs to the whitelabel domain
 * This grants unlimited quota AND access to restricted pages (Mockups, Visualize, Matrix, Guidelines)
 * @param email User's email address
 * @returns true if user is a whitelabel user
 */
export function isWhitelabelUser(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().endsWith(`@${WHITELABEL_DOMAIN.toLowerCase()}`)
}

/**
 * Check if a user's email qualifies for unlimited quota
 * @param email User's email address
 * @returns true if user should have unlimited generations
 * @deprecated Use isWhitelabelUser instead - this is an alias for backwards compatibility
 */
export function hasUnlimitedQuota(email: string): boolean {
  return isWhitelabelUser(email)
}

/**
 * List of routes that require whitelabel domain access
 * Non-whitelabel users will not see these in navigation and will be redirected if they try to access directly
 */
export const WHITELABEL_ONLY_ROUTES = ['/mockups', '/visualize', '/matrix', '/guidelines', '/prompts'] as const
export type WhitelabelOnlyRoute = typeof WHITELABEL_ONLY_ROUTES[number]

/**
 * Check if a route requires whitelabel access
 * @param pathname The current pathname
 * @returns true if the route is restricted to whitelabel users
 */
export function isWhitelabelOnlyRoute(pathname: string): boolean {
  return WHITELABEL_ONLY_ROUTES.some(route => pathname.startsWith(route))
}
