import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsCommand,
} from "@aws-sdk/client-s3";
import { StorageProvider, StorageFile } from "./types";

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucketName: string;
  private isConfigured: boolean;

  constructor() {
    const region = import.meta.env.VITE_AWS_REGION;
    const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
    const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
    this.bucketName = import.meta.env.VITE_AWS_BUCKET_NAME;

    this.isConfigured = Boolean(
      region && accessKeyId && secretAccessKey && this.bucketName
    );

    if (!this.isConfigured) {
      console.warn(
        "S3 storage is not properly configured. Please check your environment variables:\n" +
          "- VITE_AWS_REGION\n" +
          "- VITE_AWS_ACCESS_KEY_ID\n" +
          "- VITE_AWS_SECRET_ACCESS_KEY\n" +
          "- VITE_AWS_BUCKET_NAME"
      );
    }

    this.client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  private checkConfiguration() {
    if (!this.isConfigured) {
      throw new Error(
        "S3 storage is not configured. Please set all required environment variables."
      );
    }
  }

  private async fileToArrayBuffer(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(new Uint8Array(reader.result));
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  async uploadFile(file: File): Promise<string> {
    this.checkConfiguration();

    try {
      const key = `${Date.now()}-${file.name}`;
      const arrayBuffer = await this.fileToArrayBuffer(file);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: arrayBuffer,
        ContentType: file.type,
      });

      await this.client.send(command);
      return key;
    } catch (error) {
      console.error("Error uploading file to S3:", error);
      throw new Error(
        "Failed to upload file. Please check your S3 configuration and try again."
      );
    }
  }

  async deleteFile(key: string): Promise<void> {
    this.checkConfiguration();

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.client.send(command);
    } catch (error) {
      console.error("Error deleting file from S3:", error);
      throw new Error("Failed to delete file. Please try again.");
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    this.checkConfiguration();

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      return await getSignedUrl(this.client, command, { expiresIn: 3600 });
    } catch (error) {
      console.error("Error generating signed URL:", error);
      throw new Error("Failed to generate download link. Please try again.");
    }
  }

  async listFiles(): Promise<StorageFile[]> {
    this.checkConfiguration();

    try {
      const command = new ListObjectsCommand({
        Bucket: this.bucketName,
      });
      const response = await this.client.send(command);
      return (response.Contents || []).map((item) => ({
        key: item.Key || "",
        name: item.Key?.split("-").slice(1).join("-") || "",
        lastModified: item.LastModified || new Date(),
        size: item.Size || 0,
      }));
    } catch (error) {
      console.error("Error listing files from S3:", error);
      throw new Error(
        "Failed to load files. Please check your S3 configuration and try again."
      );
    }
  }
}
