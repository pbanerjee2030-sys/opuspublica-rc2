import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { writeFile, mkdir, access } from 'fs/promises';
import path from 'path';

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

    const fileName = file.name.replace(/\s+/g, '_');

    const buffer = Buffer.from(await file.arrayBuffer());

    const booksDir = path.join(process.cwd(), 'public', 'books');
    await mkdir(booksDir, { recursive: true });

    let finalName = fileName;
    const filePath = path.join(booksDir, finalName);
    // If file exists, add a number suffix
    let counter = 1;
    while (true) {
      try { await access(filePath); } catch { break; }
      const ext = path.extname(fileName);
      const base = path.basename(fileName, ext);
      finalName = `${base}_${counter}${ext}`;
      counter++;
    }

    await writeFile(path.join(booksDir, finalName), buffer);

    return NextResponse.json({ url: `/books/${fileName}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 });
  }
}
