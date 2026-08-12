import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getStorageProvider, FEATURE_STORAGE_ABSTRACTION } from '@/lib/storage';
import { writeFile, mkdir, access } from 'fs/promises';
import path from 'path';



export const POST = withAuth({ roles: ["admin","editor"] }, async (request, ctx) => {
  try {
    const { supabaseAdmin, user } = ctx;




    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const fileName = file.name.replace(/\s+/g, '_');

    const buffer = Buffer.from(await file.arrayBuffer());

    const storageRoot = process.env.STORAGE_ROOT || path.join(process.cwd(), 'data');
    const uploadDir = path.join(storageRoot, 'covers');
    await mkdir(uploadDir, { recursive: true });

    let finalName = fileName;
    const filePath = path.join(uploadDir, finalName);
    let counter = 1;
    while (true) {
      try { await access(filePath); } catch { break; }
      const ext = path.extname(fileName);
      const base = path.basename(fileName, ext);
      finalName = `${base}_${counter}${ext}`;
      counter++;
    }

    await writeFile(path.join(uploadDir, finalName), buffer);
    if (FEATURE_STORAGE_ABSTRACTION) {
      await getStorageProvider().upload('covers', finalName, buffer);
    }

    return NextResponse.json({ url: `/api/covers/${finalName}` });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
});
