import { NextResponse } from 'next/server';
import { getFullState, setStateKey } from '../../../lib/kv';

export async function GET() {
  try {
    const state = await getFullState();
    return NextResponse.json(state);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load state. Is KV storage connected to this project?' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { key, value } = body;
    if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    await setStateKey(key, value);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to save state.' }, { status: 500 });
  }
}
