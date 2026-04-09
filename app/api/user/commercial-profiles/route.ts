import { NextRequest } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { savedCommercialProfiles } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

const MAX_PROFILES = 20

async function getAuthUserId(): Promise<string | null> {
  const authSession = await getAuthSession()
  return authSession?.user?.id ?? null
}

/**
 * GET /api/user/commercial-profiles
 * List all saved commercial profiles for the current user
 */
export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profiles = await db
      .select()
      .from(savedCommercialProfiles)
      .where(eq(savedCommercialProfiles.userId, userId))
      .orderBy(desc(savedCommercialProfiles.updatedAt))

    return Response.json(profiles)
  } catch (error) {
    console.error('[user/commercial-profiles] GET error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/user/commercial-profiles
 * Create a new saved commercial profile
 */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { label, productName, category, targetAudience, painPoint, keyBenefits, keyFeatures, uniqueValue, ctaSuggestion, pricePosition } = body

    if (!label || !String(label).trim()) {
      return Response.json({ error: 'Profile label is required' }, { status: 400 })
    }

    // Check limit
    const existing = await db
      .select({ id: savedCommercialProfiles.id })
      .from(savedCommercialProfiles)
      .where(eq(savedCommercialProfiles.userId, userId))

    if (existing.length >= MAX_PROFILES) {
      return Response.json({ error: `Maximum ${MAX_PROFILES} commercial profiles allowed` }, { status: 400 })
    }

    const id = crypto.randomUUID()
    const now = new Date()

    await db.insert(savedCommercialProfiles).values({
      id,
      userId,
      label: String(label).trim(),
      productName: productName || null,
      category: category || null,
      targetAudience: targetAudience || null,
      painPoint: painPoint || null,
      keyBenefits: keyBenefits || null,
      keyFeatures: keyFeatures || null,
      uniqueValue: uniqueValue || null,
      ctaSuggestion: ctaSuggestion || null,
      pricePosition: pricePosition || null,
      createdAt: now,
      updatedAt: now,
    })

    const created = await db
      .select()
      .from(savedCommercialProfiles)
      .where(eq(savedCommercialProfiles.id, id))
      .get()

    return Response.json(created, { status: 201 })
  } catch (error) {
    console.error('[user/commercial-profiles] POST error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
