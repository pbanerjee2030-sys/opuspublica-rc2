export interface IStorageAdapter {
  /**
   * Uploads a file buffer to the specified bucket and path.
   * @param bucket The storage bucket name
   * @param path The path within the bucket
   * @param file The file buffer to upload
   * @param options Additional options (e.g., contentType, upsert)
   * @returns The canonical path or identifier of the uploaded object
   */
  upload(bucket: string, path: string, file: Buffer, options?: Record<string, any>): Promise<string>;

  /**
   * Generates a signed URL for secure, temporary access to a file.
   * @param bucket The storage bucket name
   * @param path The path within the bucket
   * @param expiresIn The duration the URL is valid for (in seconds)
   * @param options Additional options (e.g., download boolean)
   * @returns The signed URL
   */
  getSignedUrl(bucket: string, path: string, expiresIn: number, options?: Record<string, any>): Promise<string>;
}
