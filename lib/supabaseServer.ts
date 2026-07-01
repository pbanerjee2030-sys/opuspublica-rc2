import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const authCookie = allCookies.find(c => c.name.includes('-auth-token'));

  const client = createClient<Database>(
    supabaseUrl || 'https://placeholder-url.supabase.co',
    supabaseAnonKey || 'placeholder-key'
  );

  if (authCookie?.value) {
    try {
      const decodedVal = decodeURIComponent(authCookie.value);
      const tokenData = JSON.parse(decodedVal);
      const accessToken = tokenData.access_token;

      if (accessToken) {
        await client.auth.setSession({
          access_token: accessToken,
          refresh_token: tokenData.refresh_token || ''
        });
      }
    } catch (e) {
      console.error('Error parsing server-side auth cookie:', e);
    }
  }

  return client;
}

export async function getServerUserAndProfile() {
  try {
    const supabaseServer = await getSupabaseServerClient();
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser();

    if (userError || !user) {
      return { user: null, profile: null };
    }

    const { data: profile, error: profError } = await supabaseServer
      .from('profiles')
      .select('*, journals(*)')
      .eq('id', user.id)
      .single();

    if (profError || !profile) {
      return { user, profile: null };
    }

    return { user, profile };
  } catch (err) {
    console.error('Server user lookup failed:', err);
    return { user: null, profile: null };
  }
}
