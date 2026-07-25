'use client';

import { supabase } from '@/lib/supabase';

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session.access_token;

  const { data: { session: refreshed } } = await supabase.auth.refreshSession();
  if (refreshed) return refreshed.access_token;

  throw new Error('Not authenticated');
}

async function handleResponse(res: Response, fallback: string) {
  if (!res.ok) {
    let errorMsg = fallback;
    try {
      const err = await res.json();
      errorMsg = err.error || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function adminFetch(entity: string) {
  const token = await getToken();
  const res = await fetch(`/api/admin/data?entity=${entity}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return handleResponse(res, 'Failed to fetch');
}

export async function adminCreate(entity: string, body: any) {
  const token = await getToken();
  const res = await fetch(`/api/admin/data?entity=${entity}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res, 'Failed to create');
}

export async function adminUpdate(entity: string, id: string, updates: any) {
  const token = await getToken();
  const res = await fetch(`/api/admin/data?entity=${entity}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  });
  return handleResponse(res, 'Failed to update');
}

export async function adminDelete(entity: string, id: string) {
  const token = await getToken();
  const res = await fetch(`/api/admin/data?entity=${entity}&id=${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return handleResponse(res, 'Failed to delete');
}
