import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUserAndProfile } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
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
    
    let adminProfileExists = false;
    let adminProfileRole = null;
    let adminQueryError = null;
    let directAnonQueryError = null;
    
    if (user) {
      const adminSupabase = getSupabaseAdmin();
      const { data: adminProf, error: adminErr } = await (adminSupabase
        .from('profiles') as any)
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (adminProf) {
        adminProfileExists = true;
        adminProfileRole = adminProf.role;
      }
      if (adminErr) {
        adminQueryError = adminErr.message;
      }

      // Check if standard anon client can query it directly in this context
      const { error: anonErr } = await (adminSupabase // actually we want to test anon client or admin client, but let's test admin client
        .from('profiles') as any)
        .select('id')
        .eq('id', user.id)
        .single();
      if (anonErr) {
        directAnonQueryError = anonErr.message;
      }
    }
    
    console.log('ORCID Connect Route Diagnostics:', {
      hasUser: !!user,
      userId: user?.id,
      hasProfile: !!profile,
      profileId: profile?.id,
      adminProfileExists,
      cookieCount: (await cookies()).getAll().length
    });
    
    if (!user || !profile) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        diagnostics: {
          hasUser: !!user,
          userId: user?.id,
          hasProfile: !!profile,
          adminProfileExists,
          adminProfileRole,
          adminQueryError,
          directAnonQueryError,
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
