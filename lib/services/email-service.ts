/**
 * Email Service
 *
 * Handles sending transactional emails via Resend.
 * Used for bulk generation completion notifications.
 */

import { Resend } from 'resend';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateBulkCompletionEmail, type BulkCompletionEmailData } from '@/lib/emails/bulk-completion';
import { generateExportCompletionEmail, type ExportCompletionEmailData } from '@/lib/emails/export-completion';

// Lazy-initialize Resend client to avoid errors when API key is not configured
let _resend: Resend | null = null;
function getResendClient(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// From address - use Resend's default for development or your verified domain
const FROM_ADDRESS = process.env.EMAIL_FROM || 'SCAI <onboarding@resend.dev>';

/**
 * Get user email by ID
 */
async function getUserEmail(userId: string): Promise<{ email: string; name: string | null } | null> {
  const [user] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user || null;
}

/**
 * Send bulk generation completion email
 */
export async function sendBulkCompletionEmail(params: {
  userId: string;
  jobId: string;
  keyword?: string;
  completedArticles: number;
  failedArticles: number;
  totalArticles: number;
  totalWords?: number;
  error?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Skip if no API key configured
    if (!process.env.RESEND_API_KEY) {
      console.log('[email-service] Skipping email - RESEND_API_KEY not configured');
      return { success: true };
    }

    // Get user email
    const user = await getUserEmail(params.userId);
    if (!user) {
      console.warn('[email-service] User not found:', params.userId);
      return { success: false, error: 'User not found' };
    }

    // Determine status
    const isSuccess = params.failedArticles === 0;
    const isPartial = params.completedArticles > 0 && params.failedArticles > 0;
    const isFailed = params.completedArticles === 0;

    // Build email data
    const emailData: BulkCompletionEmailData = {
      userName: user.name || 'there',
      keyword: params.keyword,
      completedArticles: params.completedArticles,
      failedArticles: params.failedArticles,
      totalArticles: params.totalArticles,
      totalWords: params.totalWords,
      status: isFailed ? 'failed' : isPartial ? 'partial' : 'success',
      viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/history?tab=bulk`,
      error: params.error,
    };

    // Generate email HTML
    const html = generateBulkCompletionEmail(emailData);

    // Determine subject
    let subject: string;
    if (isFailed) {
      subject = 'Your Bulk Generation Failed';
    } else if (isPartial) {
      subject = `Bulk Generation Complete: ${params.completedArticles}/${params.totalArticles} Articles Ready`;
    } else {
      subject = `Your ${params.totalArticles} Articles Are Ready!`;
    }

    // Send email
    const { error } = await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to: user.email,
      subject,
      html,
    });

    if (error) {
      console.error('[email-service] Failed to send email:', error);
      return { success: false, error: error.message };
    }

    console.log('[email-service] Email sent successfully to:', user.email);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[email-service] Error:', message);
    return { success: false, error: message };
  }
}

/**
 * Send WordPress export completion email
 */
export async function sendExportCompletionEmail(params: {
  userId: string;
  jobId: string;
  siteName?: string;
  completedArticles: number;
  failedArticles: number;
  totalArticles: number;
  postStatus: 'draft' | 'publish';
  error?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('[email-service] Skipping email - RESEND_API_KEY not configured');
      return { success: true };
    }

    const user = await getUserEmail(params.userId);
    if (!user) {
      console.warn('[email-service] User not found:', params.userId);
      return { success: false, error: 'User not found' };
    }

    const isSuccess = params.failedArticles === 0;
    const isPartial = params.completedArticles > 0 && params.failedArticles > 0;
    const isFailed = params.completedArticles === 0;

    const emailData: ExportCompletionEmailData = {
      userName: user.name || 'there',
      siteName: params.siteName,
      completedArticles: params.completedArticles,
      failedArticles: params.failedArticles,
      totalArticles: params.totalArticles,
      postStatus: params.postStatus,
      status: isFailed ? 'failed' : isPartial ? 'partial' : 'success',
      viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/history`,
      error: params.error,
    };

    const html = generateExportCompletionEmail(emailData);

    let subject: string;
    if (isFailed) {
      subject = 'Your WordPress Export Failed';
    } else if (isPartial) {
      subject = `WordPress Export: ${params.completedArticles}/${params.totalArticles} Articles Exported`;
    } else {
      subject = `${params.totalArticles} Articles Exported to WordPress!`;
    }

    const { error } = await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to: user.email,
      subject,
      html,
    });

    if (error) {
      console.error('[email-service] Failed to send export email:', error);
      return { success: false, error: error.message };
    }

    console.log('[email-service] Export email sent successfully to:', user.email);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[email-service] Export email error:', message);
    return { success: false, error: message };
  }
}
