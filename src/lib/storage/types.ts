export interface StorageFile {
  key: string;
  name: string;
  lastModified: Date;
  size: number;
}

export interface StorageProvider {
  uploadFile(file: File | Blob): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getSignedUrl(key: string): Promise<string>;
  listFiles(): Promise<StorageFile[]>;
}