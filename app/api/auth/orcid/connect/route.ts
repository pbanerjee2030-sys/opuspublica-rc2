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

async function getServerUserAndProfileAdminBypass() {
  try {
    const supabaseServer = await getSupabaseServerClient();
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser();

    if (userError || !user) {
      return { user: null, profile: null };
    }

    // Bypass the RLS infinite recursion issue in database policies for the profiles table
    // by using the admin client which bypasses RLS checks on the server-side.
    const adminSupabase = getSupabaseAdmin();
    const { data: profile, error: profError } = await (adminSupabase
      .from('profiles') as any)
      .select('*, journals(*)')
      .eq('id', user.id)
      .single();

    if (profError || !profile) {
      return { user, profile: null };
    }

    return { user, profile };
  } catch (err) {
    console.error('Server user lookup admin bypass failed:', err);
    return { user: null, profile: null };
  }
}

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'opuspublica.org';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const origin = `${proto}://${host}`;

  try {
    const { user, profile } = await getServerUserAndProfileAdminBypass() as { user: any; profile: any };
    
    if (!user || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
}
