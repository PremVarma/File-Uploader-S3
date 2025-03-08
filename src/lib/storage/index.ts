import { StorageProvider } from './types';
import { S3StorageProvider } from './s3-provider';

const storageProvider: StorageProvider = new S3StorageProvider();

export const storage = storageProvider;