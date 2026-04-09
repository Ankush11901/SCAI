import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getSystemLoad, CONCURRENCY_LIMITS } from '@/lib/services/concurrency-manager';

/**
 * GET /api/bulk/system-status
 * 
 * Returns current system load and capacity information for bulk generation.
 * Used by the UI to show system status and help users decide when to start jobs.
 */
export async function GET(req: NextRequest) {
  const authSession = await getAuthSession();
  
  if (!authSession?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const systemLoad = await getSystemLoad();

    return new Response(
      JSON.stringify({
        success: true,
        ...systemLoad,
        limits: {
          maxConcurrentArticles: CONCURRENCY_LIMITS.maxConcurrentArticles,
          maxConcurrentPerUser: CONCURRENCY_LIMITS.maxConcurrentPerUser,
          maxActiveBulkJobs: CONCURRENCY_LIMITS.maxActiveBulkJobs,
        },
        message: getStatusMessage(systemLoad.status, systemLoad.loadPercentage),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // Short cache to reduce API calls but keep data fresh
          'Cache-Control': 'private, max-age=10',
        },
      }
    );
  } catch (error) {
    console.error('[bulk/system-status] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get system status' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get a user-friendly message based on system status
 */
function getStatusMessage(status: string, loadPercentage: number): string {
  switch (status) {
    case 'at-capacity':
      return 'System at capacity. New jobs will be queued and start automatically when resources are available.';
    case 'high-demand':
      return `High demand (${loadPercentage}% capacity). Your job may take slightly longer to complete.`;
    case 'moderate':
      return `Moderate load (${loadPercentage}% capacity). Good time to start your bulk generation.`;
    case 'available':
      return 'System available. Your bulk generation will start immediately.';
    default:
      return 'System status unknown.';
  }
}
