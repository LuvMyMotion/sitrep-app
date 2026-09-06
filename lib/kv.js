import { Redis } from '@upstash/redis';
import IORedis from 'ioredis';

// Vercel's Redis marketplace integrations differ in which env vars they
// inject depending on when/how they were connected:
//  - Older Upstash-style: KV_REST_API_URL + KV_REST_API_TOKEN (REST API)
//  - Direct Upstash project: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//  - Newer "Redis" marketplace product: a single REDIS_URL connection string
// We support all three so this works regardless of which one you connected.
const restUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const restToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const rawRedisUrl = process.env.REDIS_URL;

let backend; // 'rest' | 'tcp'
let restClient;
let tcpClient;

if (restUrl && restToken) {
  backend = 'rest';
  restClient = new Redis({ url: restUrl, token: restToken });
} else if (rawRedisUrl) {
  backend = 'tcp';
  tcpClient = new IORedis(rawRedisUrl, { maxRetriesPerRequest: 3 });
} else {
  backend = 'none';
}

// Minimal shared interface: get/set a JSON-serializable value by key.
export const kv = {
  async get(key) {
    if (backend === 'rest') return restClient.get(key);
    if (backend === 'tcp') {
      const raw = await tcpClient.get(key);
      return raw === null ? null : JSON.parse(raw);
    }
    throw new Error('No Redis connection configured (missing REDIS_URL or KV_REST_API_URL/TOKEN).');
  },
  async set(key, value) {
    if (backend === 'rest') return restClient.set(key, value);
    if (backend === 'tcp') return tcpClient.set(key, JSON.stringify(value));
    throw new Error('No Redis connection configured (missing REDIS_URL or KV_REST_API_URL/TOKEN).');
  }
};

const KEYS = ['profile', 'sessions', 'clips', 'videos', 'settings'];

const DEFAULTS = {
  profile: { channelName: 'LuvMyMotion', youtubeUrl: '', tiktokUrl: '', niches: [], editingStyle: '', preferredLength: '', cadenceGoal: '', lessonsLearned: [], ideas: [] },
  sessions: [],
  clips: [],
  videos: [],
  settings: { priorityFocus: 'balanced' }
};

export async function getFullState() {
  const out = {};
  for (const key of KEYS) {
    const val = await kv.get('state:' + key);
    out[key] = val !== null && val !== undefined ? val : DEFAULTS[key];
  }
  return out;
}

export async function setStateKey(key, value) {
  if (!KEYS.includes(key)) throw new Error('Unknown state key: ' + key);
  await kv.set('state:' + key, value);
}

