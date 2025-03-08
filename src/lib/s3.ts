import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsCommand } from '@aws-sdk/client-s3';

const region = import.meta.env.VITE_AWS_REGION;
const bucketName = import.meta.env.VITE_AWS_BUCKET_NAME;

export const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

export const uploadFile = async (file: File) => {
  const key = `${Date.now()}-${file.name}`;
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: file,
    ContentType: file.type,
  });

  await s3Client.send(command);
  return key;
};

export const getSignedDownloadUrl = async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

export const deleteFile = async (key: string) => {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  await s3Client.send(command);
};

export const listFiles = async () => {
  const command = new ListObjectsCommand({
    Bucket: bucketName,
  });
  const response = await s3Client.send(command);
  return response.Contents || [];
};