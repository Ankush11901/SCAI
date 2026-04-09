/**
 * Cloudflare R2 Storage Service
 * 
 * Handles image uploads to Cloudflare R2 (S3-compatible storage)
 * Used by Trigger.dev jobs to persist generated images
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

// R2 Configuration from environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "scai-images";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // Optional custom domain

// Initialize S3 client for R2
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export interface UploadResult {
  success: boolean;
  key: string;
  url: string;
  size?: number;
  contentType?: string;
  error?: string;
}

export interface UploadOptions {
  /** Custom cache control header */
  cacheControl?: string;
  /** Custom content type (auto-detected if not provided) */
  contentType?: string;
  /** Custom metadata to attach to the object */
  metadata?: Record<string, string>;
}

/**
 * Generate a unique key for storing an image
 */
export function generateImageKey(
  historyId: string,
  imageId: string,
  extension: string = "webp"
): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  // Format: articles/2026/01/22/{historyId}/{imageId}.webp
  return `articles/${year}/${month}/${day}/${historyId}/${imageId}.${extension}`;
}

/**
 * Get the public URL for a stored image
 */
export function getPublicUrl(key: string): string {
  if (R2_PUBLIC_URL) {
    // Use custom domain if configured
    return `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  }
  // Fall back to R2.dev URL (requires public bucket)
  return `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.dev/${key}`;
}

/**
 * Parse a data URL to extract mime type and buffer
 */
function parseDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, "base64");

  return { buffer, mimeType };
}

/**
 * Get file extension from mime type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/webp": "webp",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };
  return mimeToExt[mimeType] || "webp";
}

/**
 * Upload an image from a data URL (base64)
 */
export async function uploadFromDataUrl(
  dataUrl: string,
  key: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      return {
        success: false,
        key,
        url: "",
        error: "Invalid data URL format",
      };
    }

    return await uploadFromBuffer(parsed.buffer, key, {
      ...options,
      contentType: options.contentType || parsed.mimeType,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[R2] Failed to upload from data URL: ${errorMessage}`);
    return {
      success: false,
      key,
      url: "",
      error: errorMessage,
    };
  }
}

/**
 * Upload an image from a buffer
 */
export async function uploadFromBuffer(
  buffer: Buffer,
  key: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const contentType = options.contentType || "image/webp";

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: options.cacheControl || "public, max-age=31536000, immutable",
      Metadata: options.metadata,
    });

    await r2Client.send(command);

    const url = getPublicUrl(key);

    console.log(`[R2] Successfully uploaded: ${key} (${buffer.length} bytes)`);

    return {
      success: true,
      key,
      url,
      size: buffer.length,
      contentType,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[R2] Failed to upload buffer: ${errorMessage}`);
    return {
      success: false,
      key,
      url: "",
      error: errorMessage,
    };
  }
}

/**
 * Upload from a base64 string (without data URL prefix)
 */
export async function uploadFromBase64(
  base64: string,
  key: string,
  mimeType: string = "image/webp",
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const buffer = Buffer.from(base64, "base64");
    return await uploadFromBuffer(buffer, key, {
      ...options,
      contentType: mimeType,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[R2] Failed to upload from base64: ${errorMessage}`);
    return {
      success: false,
      key,
      url: "",
      error: errorMessage,
    };
  }
}

/**
 * Delete an image from R2
 */
export async function deleteImage(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    console.log(`[R2] Successfully deleted: ${key}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[R2] Failed to delete: ${errorMessage}`);
    return false;
  }
}

/**
 * Check if an image exists in R2
 */
export async function imageExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get image metadata from R2
 */
export async function getImageMetadata(key: string): Promise<{
  size: number;
  contentType: string;
  lastModified: Date;
  metadata: Record<string, string>;
} | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || "unknown",
      lastModified: response.LastModified || new Date(),
      metadata: response.Metadata || {},
    };
  } catch {
    return null;
  }
}

/**
 * Batch upload multiple images
 */
export async function uploadBatch(
  images: Array<{
    dataUrl: string;
    key: string;
    options?: UploadOptions;
  }>
): Promise<UploadResult[]> {
  const results = await Promise.allSettled(
    images.map(({ dataUrl, key, options }) =>
      uploadFromDataUrl(dataUrl, key, options)
    )
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      success: false,
      key: images[index].key,
      url: "",
      error: result.reason?.message || "Upload failed",
    };
  });
}

/**
 * Migrate a base64 image from HTML content to R2
 * Returns the R2 URL to replace the data URL in HTML
 */
export async function migrateBase64ToR2(
  dataUrl: string,
  historyId: string,
  imageIndex: number
): Promise<string | null> {
  try {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      console.error("[R2] Invalid data URL for migration");
      return null;
    }

    const extension = getExtensionFromMimeType(parsed.mimeType);
    const imageId = `img-${imageIndex}-${Date.now()}`;
    const key = generateImageKey(historyId, imageId, extension);

    const result = await uploadFromBuffer(parsed.buffer, key, {
      contentType: parsed.mimeType,
      metadata: {
        historyId,
        imageIndex: String(imageIndex),
        migratedAt: new Date().toISOString(),
      },
    });

    if (result.success) {
      return result.url;
    }

    return null;
  } catch (error) {
    console.error("[R2] Migration failed:", error);
    return null;
  }
}
