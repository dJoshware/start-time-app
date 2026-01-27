import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
    const session = req.cookies.get('st_session')?.value;

    const url = req.nextUrl.clone();
    const isAuthRoute = url.pathname.startsWith('/login');

    if (!session && !isAuthRoute) {
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/supervisor/:path*', '/'],
};
