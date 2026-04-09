/**
 * Shared types for the application
 */

export interface User {
  id: string
  name: string
  email: string
  image?: string | null
}

export interface Session {
  user: User
  expiresAt: Date
}
