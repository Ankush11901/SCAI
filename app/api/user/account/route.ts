import { NextRequest } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  users,
  generationHistory,
  generationJobs,
  bulkJobs,
  bulkJobArticles,
  articleImages,
  articleClusters,
  promptTestRuns,
  aiUsageLogs,
  generationCostSummaries,
  wordpressConnections,
  cmsConnections,
  exportJobs,
  creditBalances,
  creditTransactions,
  apiTokens,
  subscriptions,
  savedBusinesses,
} from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { getStripeClient } from '@/lib/services/stripe-service'

/**
 * DELETE /api/user/account
 * Permanently delete the user's account and all associated data
 */
export async function DELETE(req: NextRequest) {
  const authSession = await getAuthSession()

  if (!authSession?.user?.id) {
    return Response.json({ error: 'Invalid session' }, { status: 401 })
  }

  try {
    const userId = authSession.user.id

    // Parse and validate confirmation email
    const body = await req.json()
    const { confirmEmail } = body

    if (!confirmEmail) {
      return Response.json({ error: 'Email confirmation is required' }, { status: 400 })
    }

    // Load user to verify email match
    const user = await db
      .select({ id: users.id, email: users.email, stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, userId))
      .get()

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    if (confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
      return Response.json({ error: 'Email does not match your account' }, { status: 400 })
    }

    console.log(`[account-delete] Starting account deletion for user ${userId} (${user.email})`)

    // ── Step 1: Cancel Stripe subscription + delete customer ──
    if (user.stripeCustomerId) {
      const stripe = getStripeClient()
      if (stripe) {
        try {
          // Cancel all active subscriptions
          const subs = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: 'active',
          })
          for (const sub of subs.data) {
            await stripe.subscriptions.cancel(sub.id)
            console.log(`[account-delete] Canceled Stripe subscription ${sub.id}`)
          }
          // Delete the customer
          await stripe.customers.del(user.stripeCustomerId)
          console.log(`[account-delete] Deleted Stripe customer ${user.stripeCustomerId}`)
        } catch (stripeError) {
          // Best-effort — don't block account deletion on Stripe errors
          console.error('[account-delete] Stripe cleanup error:', stripeError)
        }
      }
    }

    // ── Step 2: Delete child tables that reference other tables (not user directly) ──

    // bulkJobArticles → references bulkJobs.id
    const userBulkJobs = await db
      .select({ id: bulkJobs.id })
      .from(bulkJobs)
      .where(eq(bulkJobs.userId, userId))
    if (userBulkJobs.length > 0) {
      const bulkJobIds = userBulkJobs.map(j => j.id)
      await db.delete(bulkJobArticles).where(inArray(bulkJobArticles.bulkJobId, bulkJobIds))
      console.log(`[account-delete] Deleted bulkJobArticles for ${bulkJobIds.length} bulk jobs`)
    }

    // articleImages → references generationHistory.id
    const userHistory = await db
      .select({ id: generationHistory.id })
      .from(generationHistory)
      .where(eq(generationHistory.userId, userId))
    if (userHistory.length > 0) {
      const historyIds = userHistory.map(h => h.id)
      // Delete in batches to avoid SQLite variable limits
      const BATCH_SIZE = 500
      for (let i = 0; i < historyIds.length; i += BATCH_SIZE) {
        const batch = historyIds.slice(i, i + BATCH_SIZE)
        await db.delete(articleImages).where(inArray(articleImages.historyId, batch))
      }
      console.log(`[account-delete] Deleted articleImages for ${historyIds.length} history entries`)
    }

    // ── Step 3: Delete all tables with direct userId (no FK cascade) ──
    await db.delete(generationJobs).where(eq(generationJobs.userId, userId))
    await db.delete(bulkJobs).where(eq(bulkJobs.userId, userId))
    await db.delete(articleClusters).where(eq(articleClusters.userId, userId))
    await db.delete(promptTestRuns).where(eq(promptTestRuns.userId, userId))
    await db.delete(aiUsageLogs).where(eq(aiUsageLogs.userId, userId))
    await db.delete(generationCostSummaries).where(eq(generationCostSummaries.userId, userId))
    await db.delete(wordpressConnections).where(eq(wordpressConnections.userId, userId))
    await db.delete(cmsConnections).where(eq(cmsConnections.userId, userId))
    await db.delete(exportJobs).where(eq(exportJobs.userId, userId))
    await db.delete(creditBalances).where(eq(creditBalances.userId, userId))
    await db.delete(creditTransactions).where(eq(creditTransactions.userId, userId))
    await db.delete(apiTokens).where(eq(apiTokens.userId, userId))
    await db.delete(subscriptions).where(eq(subscriptions.userId, userId))
    await db.delete(savedBusinesses).where(eq(savedBusinesses.userId, userId))

    console.log(`[account-delete] Deleted all direct-userId tables`)

    // ── Step 4: Delete user row (CASCADE handles: sessions, accounts, quotaUsage, generationHistory) ──
    await db.delete(users).where(eq(users.id, userId))
    console.log(`[account-delete] Deleted user ${userId} — account deletion complete`)

    return Response.json({ success: true })
  } catch (error) {
    console.error('[account-delete] Error:', error)
    return Response.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
