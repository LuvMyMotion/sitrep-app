import { NextResponse } from 'next/server';
import { kv } from '../../../../../lib/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tokens = await kv.get('tiktok:tokens');
    return NextResponse.json({ connected: !!tokens });
  } catch (err) {
    return NextResponse.json({ connected: false });
  }
}
