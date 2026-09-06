import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/login', '/favicon.ico'];

async function hashPassword(pw) {
  const enc = new TextEncoder().encode('sitrep-auth-salt:' + pw);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const appPassword = process.env.APP_PASSWORD;

  // No password configured yet — allow through so first-time setup isn't locked out.
  if (!appPassword) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get('sitrep_session')?.value;
  const expected = await hashPassword(appPassword);

  if (cookie === expected) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)']
};
