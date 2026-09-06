export function getTikTokAuthUrl(stateToken) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;
  const scope = 'user.info.basic,video.list';
  const params = new URLSearchParams({
    client_key: clientKey,
    scope,
    response_type: 'code',
    redirect_uri: redirectUri,
    state: stateToken
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Stateless CSRF-style state token: no cookie required, so it survives
// browsers that strip cookies set immediately before an external redirect
// (a common anti-"bounce tracking" privacy protection, e.g. in Brave/Safari).
export async function createStateToken() {
  const secret = process.env.APP_PASSWORD || 'sitrep-fallback-secret';
  const timestamp = Date.now().toString();
  const sig = await hmacHex(secret, timestamp);
  return `${timestamp}.${sig}`;
}

export async function verifyStateToken(token) {
  if (!token || !token.includes('.')) return false;
  const [timestamp, sig] = token.split('.');
  if (!timestamp || !sig) return false;
  if (Date.now() - Number(timestamp) > 10 * 60 * 1000) return false; // 10 min expiry
  const secret = process.env.APP_PASSWORD || 'sitrep-fallback-secret';
  const expected = await hmacHex(secret, timestamp);
  return sig === expected;
}

export async function exchangeCodeForToken(code) {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI
    })
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('TikTok token exchange failed: ' + JSON.stringify(data));
  return data;
}

export async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('TikTok token refresh failed: ' + JSON.stringify(data));
  return data;
}

export async function fetchTikTokVideos(accessToken) {
  let videos = [];
  let cursor = 0;
  let hasMore = true;
  let safety = 0;

  while (hasMore && safety < 20) {
    const res = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,create_time,cover_image_url,share_url,video_description,like_count,view_count,comment_count,share_count', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ max_count: 20, cursor })
    });
    const data = await res.json();
    if (data.error && data.error.code !== 'ok') {
      throw new Error('TikTok API error: ' + (data.error.message || data.error.code));
    }
    const videoList = data.data?.videos || [];
    videoList.forEach(v => {
      videos.push({
        tiktokId: v.id,
        title: (v.video_description || '').slice(0, 120) || 'TikTok video',
        postedDate: v.create_time ? new Date(v.create_time * 1000).toISOString().slice(0, 10) : null,
        shareUrl: v.share_url,
        cover: v.cover_image_url,
        viewCount: Number(v.view_count) || 0,
        likeCount: Number(v.like_count) || 0,
        commentCount: Number(v.comment_count) || 0,
        shareCount: Number(v.share_count) || 0
      });
    });
    hasMore = !!data.data?.has_more;
    cursor = data.data?.cursor || 0;
    safety++;
  }

  return videos;
}
