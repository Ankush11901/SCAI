import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { bulkJobs, bulkJobArticles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  groupArticlesByTypeAndVariation,
  generateQAExportHTML,
  generateQAExportSummary,
  sanitizeFilename,
} from '@/lib/utils/qa-export-generator';
import type { TitleVariation } from '@/lib/types/qa-export';

/**
 * GET /api/bulk/[jobId]/qa-export
 *
 * Generate and download a QA Matrix HTML export for a completed bulk job.
 * This endpoint is only available on the bulk page which is whitelabel-only,
 * so no additional auth check is needed.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  // Check authentication
  const authSession = await getAuthSession();
  const userId = authSession?.user?.id || null;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get the job
    const [job] = await db
      .select()
      .from(bulkJobs)
      .where(and(eq(bulkJobs.id, jobId), eq(bulkJobs.userId, userId)))
      .limit(1);

    if (!job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get all articles for this job
    const articles = await db
      .select({
        id: bulkJobArticles.id,
        articleType: bulkJobArticles.articleType,
        variation: bulkJobArticles.variation,
        htmlContent: bulkJobArticles.htmlContent,
        status: bulkJobArticles.status,
        errorMessage: bulkJobArticles.errorMessage,
        keyword: bulkJobArticles.keyword,
      })
      .from(bulkJobArticles)
      .where(eq(bulkJobArticles.bulkJobId, jobId));

    // Check if we have any completed articles
    const completedArticles = articles.filter(a => a.status === 'complete' && a.htmlContent);
    
    if (completedArticles.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No completed articles to export',
          message: 'The job has no successfully generated articles to include in the QA export.' 
        }), 
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract keyword from job or first article
    const keyword = job.keyword || 
                    articles[0]?.keyword || 
                    'Generated Articles';

    // Group articles by type and variation
    const groupedArticles = groupArticlesByTypeAndVariation(
      articles.map(a => ({
        articleType: a.articleType,
        variation: (a.variation || 'statement') as TitleVariation,
        htmlContent: a.htmlContent,
        status: a.status,
        errorMessage: a.errorMessage,
      }))
    );

    // Generate QA export HTML
    const html = generateQAExportHTML(groupedArticles, keyword);

    // Generate summary for logging
    const summary = generateQAExportSummary(groupedArticles);
    console.log('[qa-export] Generated export:', {
      jobId,
      keyword,
      totalArticles: summary.totalArticles,
      totalWords: summary.totalWords,
      variations: summary.variationCounts,
    });

    // Generate filename
    const timestamp = Math.floor(Date.now() / 1000);
    const sanitizedKeyword = sanitizeFilename(keyword);
    const filename = `qa-matrix-${sanitizedKeyword}-${timestamp}.html`;

    // Return HTML file as download
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[qa-export] Error generating export:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate QA export',
        message: error instanceof Error ? error.message : 'Unknown error',
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
