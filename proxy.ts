import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const adminRoutes = ['/admin', '/api/admin'];
const protectedApiRoutes = ['/api/notifications', '/api/doi/mint'];
const reviewerRoutes = ['/reviewer'];

function isProtectedPath(pathname: string): boolean {
  if (adminRoutes.some(r => pathname === r || pathname.startsWith(r + '/'))) return true;
  if (protectedApiRoutes.some(r => pathname.startsWith(r))) return true;
  if (reviewerRoutes.some(r => pathname === r || pathname.startsWith(r + '/'))) return true;
  return false;
}

function isAdminRoute(pathname: string): boolean {
  return adminRoutes.some(r => pathname === r || pathname.startsWith(r + '/'));
}

function isReviewerRoute(pathname: string): boolean {
  return reviewerRoutes.some(r => pathname === r || pathname.startsWith(r + '/'));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const authHeader = request.headers.get('Authorization');
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '');
  } else {
    const authCookie = request.cookies.getAll().find(c => c.name.includes('-auth-token'));
    if (authCookie?.value) {
      try {
        const decoded = decodeURIComponent(authCookie.value);
        const parsed = JSON.parse(decoded);
        token = parsed.access_token || null;
      } catch {}
    }
  }

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile as any)?.role;

  if (isAdminRoute(pathname)) {
    if (!role || (role !== 'admin' && role !== 'editor')) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (isReviewerRoute(pathname)) {
    if (!role || !['admin', 'editor', 'reviewer'].includes(role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (protectedApiRoutes.some(r => pathname.startsWith(r))) {
    if (!role || (role !== 'admin' && role !== 'editor')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/notifications/:path*',
    '/api/doi/mint/:path*',
    '/reviewer/:path*',
  ],
};
