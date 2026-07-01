import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check requester is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: any; error: any };

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only existing admins can promote users' }, { status: 403 });
    }

    const body = await request.json();
    const { role, targetUserId } = body;

    if (!['admin', 'editor', 'author'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
    }

    // Admins cannot demote themselves below admin
    if (targetUserId === user.id && role !== 'admin') {
      return NextResponse.json({ error: 'Cannot demote yourself' }, { status: 400 });
    }

    const { error: updateError } = await (supabaseAdmin as any)
      .from('profiles')
      .update({ role })
      .eq('id', targetUserId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, role, targetUserId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
