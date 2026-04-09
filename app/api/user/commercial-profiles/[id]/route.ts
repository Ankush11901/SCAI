import { NextRequest } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { savedCommercialProfiles } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

async function getAuthUserId(): Promise<string | null> {
  const authSession = await getAuthSession()
  return authSession?.user?.id ?? null
}

/**
 * PUT /api/user/commercial-profiles/[id]
 * Update a saved commercial profile
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Verify ownership
    const existing = await db
      .select({ id: savedCommercialProfiles.id })
      .from(savedCommercialProfiles)
      .where(and(eq(savedCommercialProfiles.id, id), eq(savedCommercialProfiles.userId, userId)))
      .get()

    if (!existing) {
      return Response.json({ error: 'Commercial profile not found' }, { status: 404 })
    }

    const body = await req.json()
    const { label, productName, category, targetAudience, painPoint, keyBenefits, keyFeatures, uniqueValue, ctaSuggestion, pricePosition } = body

    if (!label || !String(label).trim()) {
      return Response.json({ error: 'Profile label is required' }, { status: 400 })
    }

    await db
      .update(savedCommercialProfiles)
      .set({
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
        updatedAt: new Date(),
      })
      .where(and(eq(savedCommercialProfiles.id, id), eq(savedCommercialProfiles.userId, userId)))

    return Response.json({ success: true })
  } catch (error) {
    console.error('[user/commercial-profiles] PUT error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/user/commercial-profiles/[id]
 * Delete a saved commercial profile
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    await db
      .delete(savedCommercialProfiles)
      .where(and(eq(savedCommercialProfiles.id, id), eq(savedCommercialProfiles.userId, userId)))

    return Response.json({ success: true })
  } catch (error) {
    console.error('[user/commercial-profiles] DELETE error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
