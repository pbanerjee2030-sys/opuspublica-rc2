import { IStorageAdapter } from './StorageInterface';
import { SupabaseStorageAdapter } from './SupabaseStorageAdapter';

export const FEATURE_STORAGE_ABSTRACTION = process.env.FEATURE_STORAGE_ABSTRACTION === 'true';

let storageProviderInstance: IStorageAdapter | null = null;

export function getStorageProvider(): IStorageAdapter {
  if (!storageProviderInstance) {
    storageProviderInstance = new SupabaseStorageAdapter();
  }
  return storageProviderInstance;
}

export * from './StorageInterface';
