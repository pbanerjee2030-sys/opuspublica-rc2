import { IStorageAdapter } from './StorageInterface';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';
import pathModule from 'path';

export class SupabaseStorageAdapter implements IStorageAdapter {
  async upload(bucket: string, path: string, file: Buffer, options?: Record<string, any>): Promise<string> {
    const supabaseAdmin = getSupabaseAdmin();
    
    const hash = crypto.createHash('sha256').update(file).digest('hex');
    const ext = pathModule.extname(path);
    const physicalPath = `${hash}${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(physicalPath, file, {
        contentType: options?.contentType,
        upsert: false, 
      });

    if (uploadError) {
      const msg = uploadError.message?.toLowerCase() || '';
      const isDuplicate = msg.includes('duplicate') || msg.includes('already exists') || (uploadError as any).statusCode === '409';
      if (!isDuplicate) {
        throw new Error(`Supabase upload failed: ${uploadError.message}`);
      }
    }

    const { error: upsertError } = await supabaseAdmin
      .from('storage_manifest')
      .upsert(
        { 
          bucket, 
          logical_path: path, 
          physical_hash: physicalPath
        },
        { 
          onConflict: 'bucket,logical_path' 
        }
      );
      
    if (upsertError) {
      throw new Error(`Failed to upsert storage manifest: ${upsertError.message}`);
    }

    return path;
  }

  async getSignedUrl(bucket: string, path: string, expiresIn: number, options?: Record<string, any>): Promise<string> {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: manifest } = await supabaseAdmin
      .from('storage_manifest')
      .select('physical_hash')
      .eq('bucket', bucket)
      .eq('logical_path', path)
      .maybeSingle();

    const targetPath = manifest?.physical_hash || path;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(targetPath, expiresIn, {
        download: options?.download,
      });

    if (error || !data?.signedUrl) {
      throw new Error(`Supabase createSignedUrl failed: ${error?.message || 'Unknown error'}`);
    }

    return data.signedUrl;
  }
}
