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
    const region = process.env.NEXT_PUBLIC_AWS_REGION;
    const accessKeyId = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;
    this.bucketName = process.env.NEXT_PUBLIC_AWS_BUCKET_NAME || "";

    this.isConfigured = Boolean(
      region && accessKeyId && secretAccessKey && this.bucketName
    );

    if (!this.isConfigured) {
      console.warn(
        "S3 storage is not properly configured. Please check your environment variables:\n" +
          "- NEXT_PUBLIC_AWS_REGION\n" +
          "- NEXT_PUBLIC_AWS_ACCESS_KEY_ID\n" +
          "- NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY\n" +
          "- NEXT_PUBLIC_AWS_BUCKET_NAME"
      );
    }

    this.client = new S3Client({
      region,
      credentials: {
        accessKeyId: accessKeyId || "",
        secretAccessKey: secretAccessKey || "",
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

  private async fileToArrayBuffer(file: File | Blob): Promise<Uint8Array> {
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

  async uploadFile(file: File | Blob): Promise<string> {
    this.checkConfiguration();

    try {
      // Use the original file name if available
      const fileName =
        "name" in file && typeof file.name === "string"
          ? file.name
          : "blob.mp4";
      const key = fileName; // Use the file name directly

      let buffer: Uint8Array;
      if (typeof file.arrayBuffer === "function") {
        buffer = new Uint8Array(await file.arrayBuffer());
      } else {
        buffer = await new Promise<Uint8Array>((resolve, reject) => {
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

      const contentType =
        "name" in file && typeof file.type === "string"
          ? file.type
          : "video/mp4";
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
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

  async uploadUint8Array(
    data: Uint8Array,
    fileName: string,
    contentType: string
  ): Promise<string> {
    this.checkConfiguration();

    try {
      const key = `compressed_${fileName}`;
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: data,
        ContentType: contentType,
      });

      await this.client.send(command);
      return key;
    } catch (error) {
      console.error("Error uploading Uint8Array to S3:", error);
      throw new Error("Failed to upload processed file");
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
