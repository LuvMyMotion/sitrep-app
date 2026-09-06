import { NextResponse } from 'next/server';
import { getTikTokAuthUrl, createStateToken } from '../../../../../lib/tiktok';

export async function GET(req) {
  if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_REDIRECT_URI) {
    return NextResponse.json(
      { error: 'Missing TIKTOK_CLIENT_KEY or TIKTOK_REDIRECT_URI environment variable.' },
      { status: 400 }
    );
  }
  const stateToken = await createStateToken();
  return NextResponse.redirect(getTikTokAuthUrl(stateToken));
}
