import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function authGuard(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const supabaseAdmin = getSupabaseAdmin();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function requireRole(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  allowedRoles: string[]
) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single() as { data: any; error: any };
  if (!profile || !allowedRoles.includes(profile.role)) return null;
  return profile;
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await authGuard(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
    if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    const buffer = await file.arrayBuffer();

    const res = await fetch(`${supabaseUrl}/storage/v1/object/covers/${fileName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': file.type,
      },
      body: buffer,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Storage upload failed');
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('covers')
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 });
  }
}
