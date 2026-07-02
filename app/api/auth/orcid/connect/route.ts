import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUserAndProfile } from '@/lib/supabaseServer';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function signState(state: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(state);
  return `${state}.${hmac.digest('hex')}`;
}

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getServerUserAndProfile() as { user: any; profile: any };
    
    console.log('ORCID Connect Route Diagnostics:', {
      hasUser: !!user,
      userId: user?.id,
      hasProfile: !!profile,
      profileId: profile?.id,
      cookieCount: (await cookies()).getAll().length
    });
    
    if (!user || !profile) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        diagnostics: {
          hasUser: !!user,
          hasProfile: !!profile,
          cookieCount: (await cookies()).getAll().length
        }
      }, { status: 401 });
    }

    const clientId = process.env.ORCID_CLIENT_ID;
    const clientSecret = process.env.ORCID_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      const redirectUrl = new URL(`/profile/${user.id}`, request.url);
      redirectUrl.searchParams.set('orcid_error', 'ORCID client is not configured on the server.');
      return NextResponse.redirect(redirectUrl);
    }

    // CSRF Protection: Generate secure random state tied to user session
    const randomVal = crypto.randomUUID();
    const dataToSign = `${user.id}:${randomVal}`;
    const signedState = signState(dataToSign, clientSecret);

    const origin = request.nextUrl.origin;
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
}
