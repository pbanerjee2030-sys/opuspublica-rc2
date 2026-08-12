import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function signState(state: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(state);
  return `${state}.${hmac.digest('hex')}`;
}



import { withAuth } from '@/lib/rbac';

export const GET = withAuth({ roles: [] }, async (request, ctx) => {
  const host = request.headers.get('host') || 'opuspublica.org';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const origin = `${proto}://${host}`;

  try {
    const { user } = ctx;

    const clientId = process.env.ORCID_CLIENT_ID;
    const clientSecret = process.env.ORCID_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      const redirectUrl = new URL(`/profile/${user.id}`, origin);
      redirectUrl.searchParams.set('orcid_error', 'ORCID client is not configured on the server.');
      return NextResponse.redirect(redirectUrl);
    }

    // CSRF Protection: Generate secure random state tied to user session
    const randomVal = crypto.randomUUID();
    const dataToSign = `${user.id}:${randomVal}`;
    const signedState = signState(dataToSign, clientSecret);

    const callbackUri = `${origin}/api/auth/orcid/callback`;

    // Construct the ORCID Authorize URL
    const authorizeUrl = new URL('https://orcid.org/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', '/authenticate');
    authorizeUrl.searchParams.set('redirect_uri', callbackUri);
    authorizeUrl.searchParams.set('state', signedState);

    const response = NextResponse.redirect(authorizeUrl);

    // Save state in secure HttpOnly cookie
    response.cookies.set('orcid-csrf-state', signedState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error in ORCID connect route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
