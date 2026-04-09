import { createClient } from '@libsql/client/http'
import { drizzle } from 'drizzle-orm/libsql/http'
import * as schema from './schema'

// Lazy-initialize to avoid module-evaluation errors when this file
// is imported in client components (e.g. via cost-tracking-service's formatCost)
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined
let _tursoClient: ReturnType<typeof createClient> | undefined

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    if (!_db) {
      _tursoClient = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
        // Use number mode for faster integer handling in bulk operations
        intMode: 'number',
      })
      _db = drizzle(_tursoClient, { schema })
    }
    const value = Reflect.get(_db, prop, receiver)
    return typeof value === 'function' ? value.bind(_db) : value
  },
})

// Export Turso client for direct access if needed (e.g., raw queries)
export const getTursoClient = () => _tursoClient

// Export schema for convenience
export * from './schema'
