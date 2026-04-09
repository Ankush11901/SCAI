import { NextRequest, NextResponse } from 'next/server'
import { decryptState, saveConnection } from '@/lib/services/wordpress/connection-service'
import { checkPluginReadiness } from '@/lib/services/wordpress/plugin-service'

/**
 * GET /api/wordpress/callback
 *
 * Handles the redirect from WordPress after the user approves
 * the Application Password authorization.
 *
 * WordPress appends: ?site_url=...&user_login=...&password=...
 * We also have our encrypted `state` param for CSRF protection.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const rejected = searchParams.get('rejected')
  const state = searchParams.get('state')

  if (!state) {
    return htmlResponse('Authorization failed: missing state parameter.', true)
  }

  // Decrypt state to get userId
  let stateData: { userId: string; siteUrl: string }
  try {
    stateData = decryptState(state)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid state'
    return htmlResponse(`Authorization failed: ${msg}`, true)
  }

  // Handle rejection
  if (rejected) {
    return htmlResponse('Authorization was rejected. You can close this window.', true)
  }

  // Extract credentials from WordPress callback
  const siteUrl = searchParams.get('site_url')
  const userLogin = searchParams.get('user_login')
  const password = searchParams.get('password')

  if (!userLogin || !password) {
    return htmlResponse('Authorization failed: missing credentials from WordPress.', true)
  }

  // Use site_url from callback, or fall back to the one in state
  const finalSiteUrl = siteUrl || stateData.siteUrl

  try {
    // Remove spaces from application password (WP formats as "xxxx xxxx xxxx ...")
    const cleanPassword = password.replace(/\s/g, '')

    const connection = await saveConnection(stateData.userId, finalSiteUrl, userLogin, cleanPassword)

    // Auto-check plugin status in the background (non-blocking)
    checkPluginReadiness(connection.id, stateData.userId).catch((err) => {
      console.warn('[wp-callback] Plugin check failed (non-critical):', err)
    })

    return htmlResponse('WordPress connected successfully! This window will close automatically.', false)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[wp-callback] Save error:', err)
    return htmlResponse(`Connection failed: ${msg}`, true)
  }
}

/**
 * Return an HTML page that shows a message and signals the opener window.
 */
function htmlResponse(message: string, isError: boolean): NextResponse {
  const statusIcon = isError
    ? `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
    : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#40EDC3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11.5 14.5 16 9.5"/></svg>`

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>SCAI - WordPress Connection</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0;
      background: #0a0a0a; color: #e5e5e5;
    }
    .card {
      text-align: center; padding: 2.5rem 2rem;
      border: 1px solid #222; border-radius: 16px;
      max-width: 380px; width: 100%;
      background: #111;
    }
    .logo { margin-bottom: 1.5rem; }
    .icon { margin-bottom: 1rem; }
    .message { font-size: 0.95rem; line-height: 1.6; color: #d4d4d4; }
    .close-hint { margin-top: 1.25rem; font-size: 0.8rem; color: #666; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 35 35" fill="none">
        <path d="M30.9264 30.9264H4.07361V4.07361H27.9465V0H0V35H35V7.05833H30.9264V30.9264Z" fill="url(#g1)"/>
        <path d="M30.834 0V4.07361H30.9263V4.17083H35V0H30.834Z" fill="#40EDC3"/>
        <path d="M16.9995 7.93848H7.92383V12.0121H16.9995V7.93848Z" fill="url(#g2)"/>
        <path d="M27.0796 22.9883H18.0039V27.0619H27.0796V22.9883Z" fill="url(#g3)"/>
        <path d="M27.0815 15.4629H7.92383V19.5365H27.0815V15.4629Z" fill="url(#g4)"/>
        <defs>
          <linearGradient id="g1" x1="0.876" y1="3.761" x2="34.403" y2="38.587" gradientUnits="userSpaceOnUse"><stop stop-color="#40EDC3"/><stop offset="1" stop-color="#B8F6A1"/></linearGradient>
          <linearGradient id="g2" x1="3.783" y1="0.964" x2="37.31" y2="35.79" gradientUnits="userSpaceOnUse"><stop stop-color="#40EDC3"/><stop offset="1" stop-color="#B8F6A1"/></linearGradient>
          <linearGradient id="g3" x1="1.496" y1="3.163" x2="35.023" y2="37.989" gradientUnits="userSpaceOnUse"><stop stop-color="#40EDC3"/><stop offset="1" stop-color="#B8F6A1"/></linearGradient>
          <linearGradient id="g4" x1="2.64" y1="2.063" x2="36.167" y2="36.889" gradientUnits="userSpaceOnUse"><stop stop-color="#40EDC3"/><stop offset="1" stop-color="#B8F6A1"/></linearGradient>
        </defs>
      </svg>
    </div>
    <div class="icon">${statusIcon}</div>
    <div class="message">${message}</div>
    <div class="close-hint">You can close this window.</div>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage(
        { type: '${isError ? 'wordpress-error' : 'wordpress-connected'}' },
        '*'
      );
      ${!isError ? 'setTimeout(() => window.close(), 1500);' : ''}
    }
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
