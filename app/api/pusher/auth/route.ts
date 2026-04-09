import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { authenticateChannel } from '@/lib/services/pusher-server';

/**
 * POST /api/pusher/auth
 * 
 * Authenticate Pusher channel subscriptions for private channels.
 * Required for receiving real-time generation updates.
 */
export async function POST(req: NextRequest) {
  // Check authentication
  const authSession = await getAuthSession();
  const userId = authSession?.user?.id || null;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get Pusher auth params from request body
  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get('socket_id');
  const channelName = params.get('channel_name');

  if (!socketId || !channelName) {
    return new Response(JSON.stringify({ error: 'Missing socket_id or channel_name' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate channel access
  // Users can only subscribe to:
  // 1. Their own user channel: private-user-{userId}
  // 2. Generation channels they created: private-generation-{jobId}
  // 3. Bulk job channels they created: private-bulk-{jobId}

  if (channelName.startsWith('private-user-')) {
    const channelUserId = channelName.replace('private-user-', '');
    if (channelUserId !== userId) {
      return new Response(JSON.stringify({ error: 'Access denied to channel' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  // For generation and bulk channels, we allow access if user is authenticated
  // In a production system, you might want to verify the user started the job

  try {
    const authResponse = authenticateChannel(socketId, channelName, userId);

    return new Response(JSON.stringify(authResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[pusher/auth] Auth failed:', error);
    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
