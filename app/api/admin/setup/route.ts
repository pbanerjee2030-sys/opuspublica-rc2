import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { withAuth } from '@/lib/rbac';

export const POST = withAuth({ roles: ['admin'] }, async (request, ctx) => {
  try {
    const { supabaseAdmin, user } = ctx;

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
});
