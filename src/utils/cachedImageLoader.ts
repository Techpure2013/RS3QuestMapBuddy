// src/map/utils/cachedImageLoader.ts
import { fetchImageWithCache } from "./../idb/imageCache";

/**
 * Load and resize image using cache
 * Drop-in replacement for resizeImageToDataUrl that uses cache
 */
export async function resizeImageToDataUrlCached(
  imageUrl: string,
  targetSize: number
): Promise<string> {
  try {
    // Get blob from cache (or fetch if not cached)
    const blob = await fetchImageWithCache(imageUrl);

    // Create temporary image element to get dimensions
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = objectUrl;
    });

    // Calculate resize dimensions
    const aspectRatio = img.width / img.height;
    let newWidth = targetSize;
    let newHeight = targetSize;

    if (aspectRatio > 1) {
      newHeight = targetSize / aspectRatio;
    } else {
      newWidth = targetSize * aspectRatio;
    }

    // Draw to canvas at target size
    const canvas = document.createElement("canvas");
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      throw new Error("Failed to get canvas context");
    }

    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    // Clean up
    URL.revokeObjectURL(objectUrl);

    // Return data URL
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error(`Failed to resize cached image ${imageUrl}:`, error);
    throw error;
  }
}
