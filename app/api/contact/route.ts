import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await (supabaseAdmin as any).from('contact_queries').insert({
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
      status: 'new',
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Contact form submission error:', e);
    return NextResponse.json({ error: 'Failed to submit your message.' }, { status: 500 });
  }
}
