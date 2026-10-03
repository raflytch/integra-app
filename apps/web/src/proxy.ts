import { type NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'integra_session';
const LOGIN_PATH = '/login';

export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE_NAME)) return NextResponse.next();

  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set(
    'next',
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/', '/claims/:path*', '/escalations/:path*', '/facilities/:path*'],
};
