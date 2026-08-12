import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

import { getSupabaseServerClient } from '@/lib/supabaseServer';

export async function authGuard(request: NextRequest) {
  let token = null;
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '');
  }
  
  const supabaseAdmin = getSupabaseAdmin();
  let user = null;

  if (token) {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data?.user) user = data.user;
  }

  if (!user) {
    try {
      const supabaseServer = await getSupabaseServerClient();
      const { data: { user: cookieUser } } = await supabaseServer.auth.getUser();
      if (cookieUser) user = cookieUser;
    } catch (e) {
      // Ignore cookie extraction errors
    }
  }

  if (!user) return null;
  return { supabaseAdmin, user };
}

export async function requireRole(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  allowedRoles: string[]
) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single() as { data: any; error: any };
  if (!profile || !allowedRoles.includes(profile.role)) {
    return null;
  }
  return profile;
}

export async function requireAdminOrEditor(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  userId: string
) {
  return requireRole(supabaseAdmin, userId, ['admin', 'editor']);
}
