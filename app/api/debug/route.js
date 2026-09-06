import { NextResponse } from 'next/server';
import { kv } from '../../../lib/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  const restUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const rawRedisUrl = process.env.REDIS_URL;

  let redisHost = null;
  if (rawRedisUrl) {
    try {
      const u = new URL(rawRedisUrl);
      redisHost = u.hostname + ':' + u.port;
    } catch (e) {
      redisHost = 'unparseable REDIS_URL';
    }
  }

  const diagnostics = {
    hasRestUrl: !!restUrl,
    hasRestToken: !!restToken,
    hasRawRedisUrl: !!rawRedisUrl,
    redisHost,
    backendWillUse: (restUrl && restToken) ? 'rest (Upstash REST)' : (rawRedisUrl ? 'tcp (ioredis via REDIS_URL)' : 'none — nothing configured'),
    writeTest: null,
    readTest: null,
    error: null
  };

  try {
    const testValue = { pingedAt: new Date().toISOString(), random: Math.random().toString(36).slice(2) };
    await kv.set('debug:pingtest', testValue);
    diagnostics.writeTest = 'ok';
    const readBack = await kv.get('debug:pingtest');
    diagnostics.readTest = readBack;
  } catch (err) {
    diagnostics.error = String(err && err.stack ? err.stack : err);
  }

  return NextResponse.json(diagnostics);
}
