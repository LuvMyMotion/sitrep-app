import { NextResponse } from 'next/server';
import { fetchYoutubeUploads } from '../../../../lib/youtube';
import { kv } from '../../../../lib/kv';

async function runSync() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const handle = process.env.YOUTUBE_CHANNEL_HANDLE;

  if (!apiKey || !handle) {
    throw new Error('Missing YOUTUBE_API_KEY or YOUTUBE_CHANNEL_HANDLE environment variable.');
  }

  const uploads = await fetchYoutubeUploads(apiKey, handle);
  const existing = (await kv.get('state:videos')) || [];
  const existingByYtId = {};
  existing.forEach(v => { if (v.youtubeId) existingByYtId[v.youtubeId] = v; });

  let added = 0;
  uploads.forEach(u => {
    const match = existingByYtId[u.youtubeId];
    if (match) {
      // Already synced — just refresh stats, don't touch pipeline fields.
      match.viewCount = u.viewCount;
      match.likeCount = u.likeCount;
      match.commentCount = u.commentCount;
    } else {
      existing.push({
        id: 'yt-' + u.youtubeId,
        title: u.title,
        sessionId: null,
        stage: 'published',
        pctComplete: 100,
        publishedDate: u.publishedDate,
        youtubeId: u.youtubeId,
        thumbnail: u.thumbnail,
        viewCount: u.viewCount,
        likeCount: u.likeCount,
        commentCount: u.commentCount,
        createdDate: new Date().toISOString().slice(0, 10)
      });
      added++;
    }
  });

  await kv.set('state:videos', existing);
  return { added, total: existing.length, found: uploads.length };
}

export async function POST() {
  try {
    const result = await runSync();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'YouTube sync failed' }, { status: 500 });
  }
}

// Allow Vercel Cron (or any scheduler) to trigger this via GET too.
export async function GET() {
  return POST();
}
