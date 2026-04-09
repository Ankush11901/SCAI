import { NextRequest } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { savedBusinesses } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

const MAX_BUSINESSES = 20

async function getAuthUserId(): Promise<string | null> {
  const authSession = await getAuthSession()
  return authSession?.user?.id ?? null
}

/**
 * GET /api/user/businesses
 * List all saved business profiles for the current user
 */
export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const businesses = await db
      .select()
      .from(savedBusinesses)
      .where(eq(savedBusinesses.userId, userId))
      .orderBy(desc(savedBusinesses.updatedAt))

    return Response.json(businesses)
  } catch (error) {
    console.error('[user/businesses] GET error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/user/businesses
 * Create a new saved business profile
 */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { label, businessName, phone, hours, city, stateRegion, postalCode, servicesOffered, email, website, gbpUrl } = body

    if (!label || !String(label).trim()) {
      return Response.json({ error: 'Profile label is required' }, { status: 400 })
    }

    // Check limit
    const existing = await db
      .select({ id: savedBusinesses.id })
      .from(savedBusinesses)
      .where(eq(savedBusinesses.userId, userId))

    if (existing.length >= MAX_BUSINESSES) {
      return Response.json({ error: `Maximum ${MAX_BUSINESSES} business profiles allowed` }, { status: 400 })
    }

    const id = crypto.randomUUID()
    const now = new Date()

    await db.insert(savedBusinesses).values({
      id,
      userId,
      label: String(label).trim(),
      businessName: businessName || null,
      phone: phone || null,
      hours: hours || null,
      city: city || null,
      stateRegion: stateRegion || null,
      postalCode: postalCode || null,
      servicesOffered: servicesOffered || null,
      email: email || null,
      website: website || null,
      gbpUrl: gbpUrl || null,
      createdAt: now,
      updatedAt: now,
    })

    const created = await db
      .select()
      .from(savedBusinesses)
      .where(eq(savedBusinesses.id, id))
      .get()

    return Response.json(created, { status: 201 })
  } catch (error) {
    console.error('[user/businesses] POST error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
