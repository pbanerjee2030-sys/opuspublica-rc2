import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

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

function verifyState(signedState: string, secret: string): boolean {
  const parts = signedState.split('.');
  if (parts.length !== 2) return false;
  const [statePayload, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', secret).update(statePayload).digest('hex');
  return signature === expectedSignature;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const errorParam = url.searchParams.get('error');

  const cookieStore = await cookies();
  const savedState = cookieStore.get('orcid-csrf-state')?.value;

  // Cleanup cookie response helper
  const cleanResponse = (redirectUrl: URL) => {
    const res = NextResponse.redirect(redirectUrl);
    res.cookies.delete('orcid-csrf-state');
    return res;
  };

  const clientSecret = process.env.ORCID_CLIENT_SECRET;
  const clientId = process.env.ORCID_CLIENT_ID;

  if (!clientSecret || !clientId) {
    const fallbackUrl = new URL('/', request.url);
    fallbackUrl.searchParams.set('orcid_error', 'ORCID client is not configured on the server.');
    return cleanResponse(fallbackUrl);
  }

  // 1. Verify CSRF State
  if (!state || !savedState || state !== savedState) {
    const errorUrl = new URL('/', request.url);
    errorUrl.searchParams.set('orcid_error', 'CSRF verification failed: State mismatch or missing.');
    return cleanResponse(errorUrl);
  }

  // 2. Verify signature of state
  if (!verifyState(state, clientSecret)) {
    const errorUrl = new URL('/', request.url);
    errorUrl.searchParams.set('orcid_error', 'CSRF verification failed: Invalid state signature.');
    return cleanResponse(errorUrl);
  }

  // 3. Extract user ID from state
  const statePayload = state.split('.')[0];
  const [stateUserId] = statePayload.split(':');

  if (errorParam) {
    const profileUrl = new URL(`/profile/${stateUserId}`, request.url);
    profileUrl.searchParams.set('orcid_error', `ORCID authentication failed: ${errorParam}`);
    return cleanResponse(profileUrl);
  }

  if (!code) {
    const profileUrl = new URL(`/profile/${stateUserId}`, request.url);
    profileUrl.searchParams.set('orcid_error', 'No authorization code provided.');
    return cleanResponse(profileUrl);
  }

  // 4. Verify requesting user is authenticated & matches stateUserId
  const { user, profile } = await getServerUserAndProfileAdminBypass() as { user: any; profile: any };
  if (!user || !profile || user.id !== stateUserId) {
    const loginUrl = new URL('/login', request.url);
    return cleanResponse(loginUrl);
  }

  try {
    const origin = request.nextUrl.origin;
    const callbackUri = `${origin}/api/auth/orcid/callback`;

    // 5. Exchange code for token
    const tokenRes = await fetch('https://orcid.org/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUri,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errDetail = await tokenRes.text();
      console.error('ORCID Token Exchange failed:', errDetail);
      const profileUrl = new URL(`/profile/${user.id}`, request.url);
      profileUrl.searchParams.set('orcid_error', 'Failed to exchange code for ORCID access token.');
      return cleanResponse(profileUrl);
    }

    const tokenData = await tokenRes.json();
    const orcidId = tokenData.orcid;

    if (!orcidId) {
      const profileUrl = new URL(`/profile/${user.id}`, request.url);
      profileUrl.searchParams.set('orcid_error', 'ORCID API did not return an ORCID iD.');
      return cleanResponse(profileUrl);
    }

    const supabase = getSupabaseAdmin();

    // 6. Check uniqueness - ensure no OTHER profile already has this ORCID iD
    const { data: existingProfile, error: checkError } = await (supabase
      .from('profiles') as any)
      .select('id, full_name')
      .eq('orcid', orcidId)
      .neq('id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('Database query error checking ORCID uniqueness:', checkError);
      const profileUrl = new URL(`/profile/${user.id}`, request.url);
      profileUrl.searchParams.set('orcid_error', 'Database verification error.');
      return cleanResponse(profileUrl);
    }

    if (existingProfile) {
      const profileUrl = new URL(`/profile/${user.id}`, request.url);
      profileUrl.searchParams.set(
        'orcid_error',
        `This ORCID iD is already linked to another profile (${existingProfile.full_name || 'another user'}).`
      );
      return cleanResponse(profileUrl);
    }

    // 7. Update user profile row
    const { error: updateError } = await (supabase
      .from('profiles') as any)
      .update({ orcid: orcidId })
      .eq('id', user.id);

    if (updateError) {
      // 23505 = unique_violation. This is the DB-level backstop for the
      // uniqueness check above (see migration
      // 20260702000002_add_orcid_unique_constraint.sql) — it only fires
      // if two callbacks raced past the application-level check together,
      // so it's expected to be rare, not a bug if it happens.
      if ((updateError as any).code === '23505') {
        console.warn('ORCID uniqueness race caught at DB level for', orcidId);
        const profileUrl = new URL(`/profile/${user.id}`, request.url);
        profileUrl.searchParams.set(
          'orcid_error',
          'This ORCID iD was just linked to another profile. Please try again.'
        );
        return cleanResponse(profileUrl);
      }

      console.error('Failed to update profile ORCID iD:', updateError);
      const profileUrl = new URL(`/profile/${user.id}`, request.url);
      profileUrl.searchParams.set('orcid_error', 'Failed to save ORCID iD to your profile.');
      return cleanResponse(profileUrl);
    }

    // Redirect to profile with success indicator
    const successUrl = new URL(`/profile/${user.id}`, request.url);
    successUrl.searchParams.set('orcid_connected', 'true');
    return cleanResponse(successUrl);

  } catch (err: any) {
    console.error('Unexpected error in ORCID callback:', err);
    const profileUrl = new URL(`/profile/${stateUserId}`, request.url);
    profileUrl.searchParams.set('orcid_error', 'An unexpected error occurred during ORCID connection.');
    return cleanResponse(profileUrl);
  }
}
