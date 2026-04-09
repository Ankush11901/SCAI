import { NextRequest } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { savedBusinesses } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

async function getAuthUserId(): Promise<string | null> {
  const authSession = await getAuthSession()
  return authSession?.user?.id ?? null
}

/**
 * PUT /api/user/businesses/[id]
 * Update a saved business profile
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
      .select({ id: savedBusinesses.id })
      .from(savedBusinesses)
      .where(and(eq(savedBusinesses.id, id), eq(savedBusinesses.userId, userId)))
      .get()

    if (!existing) {
      return Response.json({ error: 'Business profile not found' }, { status: 404 })
    }

    const body = await req.json()
    const { label, businessName, phone, hours, city, stateRegion, postalCode, servicesOffered, email, website, gbpUrl } = body

    if (!label || !String(label).trim()) {
      return Response.json({ error: 'Profile label is required' }, { status: 400 })
    }

    await db
      .update(savedBusinesses)
      .set({
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
        updatedAt: new Date(),
      })
      .where(and(eq(savedBusinesses.id, id), eq(savedBusinesses.userId, userId)))

    return Response.json({ success: true })
  } catch (error) {
    console.error('[user/businesses] PUT error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/user/businesses/[id]
 * Delete a saved business profile
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
    const result = await db
      .delete(savedBusinesses)
      .where(and(eq(savedBusinesses.id, id), eq(savedBusinesses.userId, userId)))

    return Response.json({ success: true })
  } catch (error) {
    console.error('[user/businesses] DELETE error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
