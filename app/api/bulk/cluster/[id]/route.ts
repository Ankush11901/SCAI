import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { articleClusters, bulkJobs, bulkJobArticles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/bulk/cluster/[id]
 *
 * Get cluster status, plan, and article details with interlinking stats.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clusterId } = await params;

  // Check authentication
  const authSession = await getAuthSession();
  const userId = authSession?.user?.id || null;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch cluster
  const [cluster] = await db
    .select()
    .from(articleClusters)
    .where(
      and(
        eq(articleClusters.id, clusterId),
        eq(articleClusters.userId, userId)
      )
    )
    .limit(1);

  if (!cluster) {
    return new Response(JSON.stringify({ error: 'Cluster not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch associated bulk job
  let bulkJob = null;
  if (cluster.bulkJobId) {
    const [job] = await db
      .select()
      .from(bulkJobs)
      .where(eq(bulkJobs.id, cluster.bulkJobId))
      .limit(1);
    bulkJob = job;
  }

  // Fetch articles
  let articles: Array<{
    id: string;
    articleType: string;
    keyword: string;
    status: string;
    phase: string | null;
    progress: number | null;
    wordCount: number | null;
    imageCount: number | null;
    htmlContent: string | null;
    errorMessage: string | null;
  }> = [];

  if (cluster.bulkJobId) {
    articles = await db
      .select({
        id: bulkJobArticles.id,
        articleType: bulkJobArticles.articleType,
        keyword: bulkJobArticles.keyword,
        status: bulkJobArticles.status,
        phase: bulkJobArticles.phase,
        progress: bulkJobArticles.progress,
        wordCount: bulkJobArticles.wordCount,
        imageCount: bulkJobArticles.imageCount,
        htmlContent: bulkJobArticles.htmlContent,
        errorMessage: bulkJobArticles.errorMessage,
      })
      .from(bulkJobArticles)
      .where(eq(bulkJobArticles.bulkJobId, cluster.bulkJobId));
  }

  // Parse cluster plan
  let clusterPlan = null;
  if (cluster.clusterPlan) {
    try {
      clusterPlan = JSON.parse(cluster.clusterPlan);
    } catch (e) {
      console.error('[bulk/cluster/[id]] Failed to parse cluster plan:', e);
    }
  }

  // Calculate interlinking stats
  let interlinkingStats = {
    totalLinksInserted: 0,
    articlesWithRelatedReading: 0,
  };

  // Stats are stored in generation history metadata, we'll estimate from articles
  const completedArticles = articles.filter((a) => a.status === 'complete');

  return new Response(
    JSON.stringify({
      cluster: {
        id: cluster.id,
        topic: cluster.topic,
        primaryKeyword: cluster.primaryKeyword,
        urlPattern: cluster.urlPattern,
        articleCount: cluster.articleCount,
        status: cluster.status,
        createdAt: cluster.createdAt,
      },
      plan: clusterPlan,
      job: bulkJob
        ? {
            id: bulkJob.id,
            status: bulkJob.status,
            totalArticles: bulkJob.totalArticles,
            completedArticles: bulkJob.completedArticles,
            failedArticles: bulkJob.failedArticles,
            startedAt: bulkJob.startedAt,
            completedAt: bulkJob.completedAt,
          }
        : null,
      articles: articles.map((a) => ({
        id: a.id,
        articleType: a.articleType,
        title: a.keyword, // In cluster mode, keyword is the title
        status: a.status,
        phase: a.phase,
        progress: a.progress,
        wordCount: a.wordCount,
        imageCount: a.imageCount,
        hasContent: !!a.htmlContent,
        errorMessage: a.errorMessage,
      })),
      stats: {
        total: articles.length,
        completed: completedArticles.length,
        failed: articles.filter((a) => a.status === 'error').length,
        pending: articles.filter((a) => a.status === 'pending').length,
        generating: articles.filter((a) => a.status === 'generating').length,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
