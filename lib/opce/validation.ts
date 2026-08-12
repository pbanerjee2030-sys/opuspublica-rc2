import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function validatePublicationReadiness(articleId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: article, error } = await supabaseAdmin
    .from('articles')
    .select('id, status, canonical_package_url, canonical_checksum, published_pdf_url, doi, published_at')
    .eq('id', articleId)
    .single() as { data: any; error: any };

  if (error || !article) {
    throw new Error('Article not found or database error.');
  }

  if (!article.canonical_package_url) {
    throw new Error('Missing canonical package URL.');
  }
  
  if (!article.canonical_checksum) {
    throw new Error('Missing canonical checksum.');
  }

  if (!article.published_pdf_url) {
    throw new Error('Missing published PDF URL.');
  }

  return article;
}
