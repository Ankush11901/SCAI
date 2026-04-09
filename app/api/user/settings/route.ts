import { NextRequest } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/user/settings
 * Get current user's settings (profile + generation preferences)
 */
export async function GET(req: NextRequest) {
  const authSession = await getAuthSession()

  if (!authSession?.user?.id) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const userProfile = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        amazonAffiliateTag: users.amazonAffiliateTag,
        settings: users.settings,
      })
      .from(users)
      .where(eq(users.id, authSession.user.id))
      .get()

    if (!userProfile) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse settings JSON, fallback to empty object
    let generationPreferences = {}
    if (userProfile.settings) {
      try {
        generationPreferences = JSON.parse(userProfile.settings)
      } catch {
        // Invalid JSON — ignore
      }
    }

    return new Response(JSON.stringify({
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      amazonAffiliateTag: userProfile.amazonAffiliateTag,
      generationPreferences,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[user/settings] GET error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * PUT /api/user/settings
 * Update current user's settings (profile + generation preferences)
 */
export async function PUT(req: NextRequest) {
  const authSession = await getAuthSession()

  if (!authSession?.user?.id) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const { amazonAffiliateTag, generationPreferences } = body

    // Validate affiliate tag format (should be like "mytag-20")
    if (amazonAffiliateTag !== undefined && amazonAffiliateTag !== null && amazonAffiliateTag !== '') {
      const tagPattern = /^[a-zA-Z0-9_-]+-\d+$/
      if (!tagPattern.test(amazonAffiliateTag)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid affiliate tag format. Expected format: yourtag-20'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Build update payload
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (amazonAffiliateTag !== undefined) {
      updateData.amazonAffiliateTag = amazonAffiliateTag || null
    }

    if (generationPreferences !== undefined) {
      // Validate generation preferences fields
      const validKeys = new Set([
        'defaultArticleType',
        'defaultTitleVariation',
        'defaultWordCount',
        'autoIncludeFeaturedImage',
        'autoIncludeTOC',
        'autoIncludeFAQ',
        'autoIncludeH2Images',
        'autoIncludeMetaTitle',
        'autoIncludeMetaDescription',
        'autoIncludeClosingSection',
        'onboarding',
        'defaultDesignVariation',
        'defaultComponentColor',
      ])
      const cleaned: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(generationPreferences)) {
        if (validKeys.has(key)) {
          cleaned[key] = value
        }
      }
      updateData.settings = JSON.stringify(cleaned)
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, authSession.user.id))

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[user/settings] PUT error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
