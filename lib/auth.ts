import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { headers } from 'next/headers'
import { db } from './db'
import * as schema from './db/schema'

// Whitelabel domain - users with this domain get unlimited quota and full feature access
// Using NEXT_PUBLIC_ prefix for consistency with client-side code
const WHITELABEL_DOMAIN = process.env.NEXT_PUBLIC_WHITELABEL_DOMAIN || 
                         process.env.UNLIMITED_QUOTA_DOMAIN || // Legacy fallback
                         'whitelabelresell.com'

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
export const WHITELABEL_ONLY_ROUTES = ['/mockups', '/visualize', '/matrix', '/guidelines'] as const
export type WhitelabelOnlyRoute = typeof WHITELABEL_ONLY_ROUTES[number]

/**
 * Check if a route requires whitelabel access
 * @param pathname The current pathname
 * @returns true if the route is restricted to whitelabel users
 */
export function isWhitelabelOnlyRoute(pathname: string): boolean {
  return WHITELABEL_ONLY_ROUTES.some(route => pathname.startsWith(route))
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
    usePlural: false,
  }),

  emailAndPassword: {
    enabled: false, // We only allow Google login
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  user: {
    additionalFields: {},
    changeEmail: {
      enabled: false,
    },
  },

  // All users can sign in - quota limits applied separately based on email domain
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user

/**
 * Get the authenticated session from request headers.
 * Works correctly on both HTTP (dev) and HTTPS (prod) where
 * Better Auth uses the __Secure- cookie prefix.
 */
export async function getAuthSession() {
  return auth.api.getSession({
    headers: await headers(),
  })
}
