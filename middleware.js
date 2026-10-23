import { NextResponse } from 'next/server';
// Redirige a /login si no hay cookie de sesión (la validación real se hace en cada API).
export function middleware(req) {
  const p = req.nextUrl.pathname;
  if (p.startsWith('/api') || p.startsWith('/login') || p.startsWith('/setup') || p.startsWith('/_next') || p.includes('.')) return NextResponse.next();
  if (!req.cookies.get('ei_sid')) return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
}
