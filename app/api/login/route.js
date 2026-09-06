import { NextResponse } from 'next/server';

async function hashPassword(pw) {
  const enc = new TextEncoder().encode('sitrep-auth-salt:' + pw);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req) {
  const form = await req.formData();
  const password = form.get('password');
  const nextPath = form.get('next') || '/';
  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword || password !== appPassword) {
    const url = new URL('/login', req.url);
    url.searchParams.set('error', '1');
    url.searchParams.set('next', nextPath);
    return NextResponse.redirect(url);
  }

  const hashed = await hashPassword(appPassword);
  const res = NextResponse.redirect(new URL(nextPath, req.url));
  res.cookies.set('sitrep_session', hashed, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });
  return res;
}
