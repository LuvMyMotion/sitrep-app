import { NextResponse } from 'next/server';
import { fetchTikTokVideos, refreshAccessToken } from '../../../../lib/tiktok';
import { kv } from '../../../../lib/kv';

async function getValidAccessToken() {
  const tokens = await kv.get('tiktok:tokens');
  if (!tokens) throw new Error('TikTok is not connected yet. Use the "Connect TikTok" button first.');

  if (Date.now() < tokens.expires_at - 60000) {
    return tokens.access_token;
  }

  const refreshed = await refreshAccessToken(tokens.refresh_token);
  await kv.set('tiktok:tokens', {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || tokens.refresh_token,
    expires_at: Date.now() + (refreshed.expires_in || 0) * 1000
  });
  return refreshed.access_token;
}

export async function POST() {
  try {
    const accessToken = await getValidAccessToken();
    const posted = await fetchTikTokVideos(accessToken);

    const existing = (await kv.get('state:clips')) || [];
    const existingByTtId = {};
    existing.forEach(c => { if (c.tiktokId) existingByTtId[c.tiktokId] = c; });

    let added = 0;
    posted.forEach(v => {
      const match = existingByTtId[v.tiktokId];
      if (match) {
        match.viewCount = v.viewCount;
        match.likeCount = v.likeCount;
        match.commentCount = v.commentCount;
        match.shareCount = v.shareCount;
      } else {
        existing.push({
          id: 'tt-' + v.tiktokId,
          sessionId: null,
          platform: 'tiktok',
          title: v.title,
          status: 'posted',
          postedDate: v.postedDate,
          tiktokId: v.tiktokId,
          shareUrl: v.shareUrl,
          cover: v.cover,
          viewCount: v.viewCount,
          likeCount: v.likeCount,
          commentCount: v.commentCount,
          shareCount: v.shareCount,
          createdDate: new Date().toISOString().slice(0, 10)
        });
        added++;
      }
    });

    await kv.set('state:clips', existing);
    return NextResponse.json({ ok: true, added, total: existing.length, found: posted.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'TikTok sync failed' }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
