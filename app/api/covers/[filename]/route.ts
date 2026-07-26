import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    const sanitized = filename.replace(/\.\./g, '').replace(/[\/\\]/g, '');

    const filePath = path.join(process.cwd(), 'data', 'covers', sanitized);

    try { await access(filePath); } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const ext = path.extname(sanitized).toLowerCase();
    const mime: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
    };
    const contentType = mime[ext] || 'application/octet-stream';

    const buffer = await readFile(filePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Not found' }, { status: 404 });
  }
}
