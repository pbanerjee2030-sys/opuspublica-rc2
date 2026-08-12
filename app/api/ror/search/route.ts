import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.ror.org/v2/organizations?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('ROR API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch from ROR API' }, { status: 500 });
  }
}
