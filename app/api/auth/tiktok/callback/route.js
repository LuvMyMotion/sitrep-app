import { NextResponse } from 'next/server';
import { exchangeCodeForToken, verifyStateToken } from '../../../../../lib/tiktok';
import { kv } from '../../../../../lib/kv';

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard.html?tiktok=error&reason=' + encodeURIComponent('No code returned from TikTok'), req.url));
  }
  const validState = await verifyStateToken(state);
  if (!validState) {
    return NextResponse.redirect(new URL('/dashboard.html?tiktok=error&reason=' + encodeURIComponent('State token invalid or expired — try connecting again'), req.url));
  }

  try {
    const tokenData = await exchangeCodeForToken(code);
    await kv.set('tiktok:tokens', {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in || 0) * 1000
    });
    return NextResponse.redirect(new URL('/dashboard.html?tiktok=connected', req.url));
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(new URL('/dashboard.html?tiktok=error&reason=' + encodeURIComponent(err.message || 'Unknown error'), req.url));
  }
}
