/**
 * Image Generation Task
 * 
 * Trigger.dev task for generating a single image and uploading to R2.
 * This runs in a background job with 90s timeout per image.
 */

import { task, logger, metadata } from "@trigger.dev/sdk";
import { generateImage, type ImageType, type ArticleType, type ImageGenerationResult, type ImageProvider } from "@/lib/services/imagen";
import { generateProductImage } from "@/lib/services/product-image-generator";
import {
  uploadFromDataUrl,
  generateImageKey,
  getPublicUrl,
  type UploadResult
} from "@/lib/services/r2-storage";
import { createProgressHelper } from "@/lib/services/pusher-server";
import { db } from "@/lib/db";
import { articleImages } from "@/lib/db/schema";
import { validateAndCorrectAltText } from "@/lib/services/content-corrector";
import { createCostTrackingContext } from "@/lib/services/cost-tracking-service";

// Task payload type
export interface ImageGenerationPayload {
  /** Unique ID for this image */
  imageId: string;
  /** ID of the generation history record */
  historyId: string;
  /** User ID for Pusher channel */
  userId: string;
  /** Parent job ID for progress tracking */
  jobId: string;
  /** The prompt to generate image from */
  prompt: string;
  /** Optional context for the image */
  context?: string;
  /** Type of image (featured, h2, product, etc.) */
  imageType: ImageType;
  /** Article type for style guidance */
  articleType: ArticleType;
  /** Component type (for metadata) */
  componentType?: string;
  /** Step number for how-to articles */
  stepNumber?: number;
  /** Index in the batch (for progress) */
  index: number;
  /** Total images in batch (for progress) */
  total: number;
  /** Optional source image URL for transformation (Amazon product image) */
  sourceImageUrl?: string;
  /** Matched product name for reference image context */
  sourceProductName?: string;
  /** Image provider to use (gemini or flux) */
  imageProvider?: ImageProvider;
}

// Task result type
export interface ImageGenerationTaskResult {
  success: boolean;
  imageId: string;
  url?: string;
  r2Key?: string;
  width?: number;
  height?: number;
  error?: string;
  fallbackUrl?: string;
}

/**
 * Generate a single image and upload to R2
 * 
 * This task:
 * 1. Calls Gemini to generate the image (base64)
 * 2. Uploads to Cloudflare R2
 * 3. Saves record to database
 * 4. Pushes progress events via Pusher
 */
export const generateImageTask = task({
  id: "generate-image",
  // Allow up to 5 minutes per image (AI generation can be slow)
  maxDuration: 300, // 5 minutes in seconds
  // Machine config for image generation
  machine: {
    preset: "large-1x", // 4 vCPU, 8GB RAM
  },
  // Retry config
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 60000,
    factor: 2,
  },
  // Run function
  run: async (payload: ImageGenerationPayload): Promise<ImageGenerationTaskResult> => {
    const {
      imageId,
      historyId,
      userId,
      jobId,
      prompt,
      context,
      imageType,
      articleType,
      componentType,
      stepNumber,
      index,
      total
    } = payload;

    logger.info("Starting image generation", { imageId, prompt: prompt.substring(0, 50) });

    // Create cost tracking context for this image generation
    const costTracking = createCostTrackingContext(historyId, userId);

    // Create progress helper for Pusher events (skip for inline single-gen flow)
    const shouldSendPusher = jobId !== "__inline__";
    const progress = shouldSendPusher ? createProgressHelper(jobId, userId) : null;

    try {
      // Notify: image generation started
      if (progress) await progress.imageStart({
        imageId,
        componentType: componentType || imageType,
        prompt,
        index,
        total,
      });

      // Step 1: Generate image with Gemini
      if (progress) await progress.imageProgress(imageId, "orchestrating");
      logger.info("Orchestrating prompt...");

      if (progress) await progress.imageProgress(imageId, "generating");
      logger.info("Generating image with Gemini...");

      let result: ImageGenerationResult;

      // Handle product card images: transform Amazon images using Gemini
      if (componentType === 'product-card' && payload.sourceImageUrl) {
        logger.info("Transforming product card image...", { imageId, productName: prompt });
        const transformResult = await generateProductImage({
          productName: prompt,
          sourceImageUrl: payload.sourceImageUrl,
          productCategory: context?.split('.')[0] || 'product',
          index: index,
          costTracking,
          imageProvider: payload.imageProvider,
        });

        if (transformResult.success && transformResult.imageUrl) {
          // Convert base64 data URL result to format expected by rest of task
          const base64 = transformResult.imageUrl.split(',')[1];
          const mimeType = transformResult.imageUrl.match(/data:([^;]+);/)?.[1] || 'image/png';
          
          result = {
            url: transformResult.imageUrl,
            base64,
            mimeType,
            width: 1024, // Product images are square 1024x1024
            height: 1024
          };
        } else {
          logger.warn("Product image transform failed, falling back to standard generation", { 
            imageId, 
            error: transformResult.error 
          });
          // Fallback to standard generation with correct 'product' imageType for 1:1 aspect ratio
          result = await generateImage(
            prompt,
            context,
            2,
            'product', // Force 1:1 square aspect ratio for product cards
            articleType,
            stepNumber,
            undefined,
            costTracking,
            payload.imageProvider
          );
        }
      } else {
        // Standard image generation (now supports sourceImageUrl for product reference)
        result = await generateImage(
          prompt,
          context,
          2, // maxRetries within Gemini
          imageType,
          articleType,
          stepNumber,
          payload.sourceImageUrl,
          costTracking,
          payload.imageProvider,
          payload.sourceProductName,
        );
      }

      // Check if we got a real image or a placeholder
      const isPlaceholder = result.url.startsWith("https://placehold.co");
      const isBase64 = result.url.startsWith("data:");

      if (isPlaceholder) {
        // Generation failed, return placeholder
        logger.warn("Image generation returned placeholder", { imageId });

        // Create descriptive alt text from the prompt with proper limits
        // Featured images (including featured-hero): 100-125 chars, H2 images: 80-100 chars
        const isFeaturedImage = componentType?.toLowerCase().includes('featured') || imageType === 'featured' || imageType === 'featured-hero';
        const altImageType = isFeaturedImage ? 'featured' : 'h2';
        const maxLength = altImageType === 'featured' ? 125 : 100;
        const altText = prompt.length > maxLength
          ? prompt.substring(0, maxLength - 3) + '...'
          : prompt;

        if (progress) await progress.imageFailed({
          imageId,
          error: "Image generation failed",
          fallbackUrl: result.url,
          index,
          total,
          altText,
        });

        return {
          success: false,
          imageId,
          error: "Image generation failed - using placeholder",
          fallbackUrl: result.url,
        };
      }

      if (!isBase64 || !result.base64) {
        logger.error("Invalid image result - no base64 data", { imageId });

        const isProductCard = componentType === 'product-card';
        const fallbackUrl = isProductCard
          ? `https://placehold.co/400x400/e5e7eb/6b7280?text=Image+Error`
          : `https://placehold.co/800x450/e5e7eb/6b7280?text=Image+Error`;

        // Create descriptive alt text from the prompt with proper limits
        // Featured images (including featured-hero): 100-125 chars, H2 images: 80-100 chars
        const isFeaturedImage = componentType?.toLowerCase().includes('featured') || imageType === 'featured' || imageType === 'featured-hero';
        const altImageType = isFeaturedImage ? 'featured' : 'h2';
        const maxLength = altImageType === 'featured' ? 125 : 100;
        const altText = prompt.length > maxLength
          ? prompt.substring(0, maxLength - 3) + '...'
          : prompt;

        if (progress) await progress.imageFailed({
          imageId,
          error: "Invalid image data",
          fallbackUrl,
          index,
          total,
          altText,
        });

        return {
          success: false,
          imageId,
          error: "Invalid image data from Gemini",
          fallbackUrl,
        };
      }

      // Step 2: Upload to R2
      if (progress) await progress.imageProgress(imageId, "uploading");
      logger.info("Uploading to R2...", { imageId });

      const extension = result.mimeType?.split("/")[1] || "webp";
      const r2Key = generateImageKey(historyId, imageId, extension);

      // Sanitize prompt for HTTP header compatibility (R2 metadata becomes x-amz-meta-* headers)
      const sanitizedPrompt = prompt
        .substring(0, 200)
        .replace(/[\r\n]+/g, ' ')      // Replace newlines with spaces
        .replace(/[^\x20-\x7E]/g, '')  // Keep only printable ASCII
        .trim();

      const uploadResult: UploadResult = await uploadFromDataUrl(
        result.url,
        r2Key,
        {
          metadata: {
            historyId,
            imageId,
            componentType: componentType || imageType,
            prompt: sanitizedPrompt,
          },
        }
      );

      if (!uploadResult.success) {
        logger.error("R2 upload failed", { imageId, error: uploadResult.error });

        // Create descriptive alt text from the prompt
        const altText = prompt.length > 125
          ? prompt.substring(0, 122) + '...'
          : prompt;

        // Fall back to base64 URL (will be large in DB but works)
        if (progress) await progress.imageFailed({
          imageId,
          error: uploadResult.error || "Upload failed",
          fallbackUrl: result.url, // Use base64 as fallback
          index,
          total,
          altText,
        });

        return {
          success: false,
          imageId,
          error: `R2 upload failed: ${uploadResult.error}`,
          fallbackUrl: result.url,
        };
      }

      // Step 3: Save to database
      logger.info("Saving to database...", { imageId, r2Key });

      await db.insert(articleImages).values({
        id: imageId,
        historyId,
        r2Key,
        publicUrl: uploadResult.url,
        imageType: imageType,
        componentType: componentType || imageType,
        prompt,
        status: "completed",
        width: result.width || 800,
        height: result.height || 450,
        sizeBytes: uploadResult.size,
        mimeType: result.mimeType || "image/webp",
      });

      // Step 4: Validate and correct alt text for SEO compliance
      logger.info("Image generation complete, validating alt text...", { imageId, url: uploadResult.url });

      // Determine correct image type for alt text validation
      // Featured images (including featured-hero): 100-125 chars, H2 images: 80-100 chars
      const isFeaturedImage = componentType?.toLowerCase().includes('featured') || imageType === 'featured' || imageType === 'featured-hero';
      const altImageType = isFeaturedImage ? 'featured' : 'h2';

      let altText: string;
      try {
        const altResult = await validateAndCorrectAltText(
          prompt,
          altImageType,
          { topic: context || 'article', articleType, provider: 'gemini', costTracking }
        );
        altText = altResult.corrected;
        logger.info("Alt text validated", {
          imageId,
          imageType: altImageType,
          original: prompt.substring(0, 50) + '...',
          corrected: altText.substring(0, 50) + '...',
          charCount: altText.length,
          wasValid: altResult.isValid,
        });
      } catch (altError) {
        // Fallback to truncation if AI validation fails
        logger.warn("Alt text validation failed, using fallback", { imageId, error: altError });
        const maxLength = altImageType === 'featured' ? 125 : 100;
        altText = prompt.length > maxLength
          ? prompt.substring(0, maxLength - 3) + '...'
          : prompt;
      }

      if (progress) await progress.imageComplete({
        imageId,
        url: uploadResult.url,
        r2Key,
        width: result.width || 800,
        height: result.height || 450,
        index,
        total,
        altText,
      });

      // Update parent task metadata for realtime progress (single-gen flow)
      try {
        metadata.parent.increment("imagesCompleted", 1);
        metadata.parent.set("statusMessage", `Generated image ${index}/${total}...`);
        metadata.parent.set(`imageUrl_${imageId}`, uploadResult.url);
      } catch { /* no parent context — ignore */ }

      return {
        success: true,
        imageId,
        url: uploadResult.url,
        r2Key,
        width: result.width,
        height: result.height,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Image generation task failed", { imageId, error: errorMessage });

      const isProductCard = componentType === 'product-card';
      const fallbackUrl = isProductCard
        ? `https://placehold.co/400x400/e5e7eb/6b7280?text=Generation+Failed`
        : `https://placehold.co/800x450/e5e7eb/6b7280?text=Generation+Failed`;

      // Create descriptive alt text from the prompt with proper limits
      // Featured images (including featured-hero): 100-125 chars, H2 images: 80-100 chars
      const isFeaturedImage = componentType?.toLowerCase().includes('featured') || imageType === 'featured' || imageType === 'featured-hero';
      const altImageType = isFeaturedImage ? 'featured' : 'h2';
      const maxLength = altImageType === 'featured' ? 125 : 100;
      const altText = prompt.length > maxLength
        ? prompt.substring(0, maxLength - 3) + '...'
        : prompt;

      if (progress) await progress.imageFailed({
        imageId,
        error: errorMessage,
        fallbackUrl,
        index,
        total,
        altText,
      });

      // Re-throw to trigger retry
      throw error;
    }
  },
});
