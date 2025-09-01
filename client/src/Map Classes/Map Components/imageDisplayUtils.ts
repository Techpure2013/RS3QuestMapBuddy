// src/Map Classes/Map Components/imageDisplayUtils.ts
import { parseWikiImageUrl } from "./imageUtils";

// ========================================================================
// Caching Layer
// WHY: To prevent repeated network requests for images that we know don't
// exist (resulting in 404 errors). This significantly cleans up the
// console and improves performance.

// Stores successful results: Map<imageUrl, dataUrl>
const successCache = new Map<string, string>();

// Stores URLs that have failed to load: Set<imageUrl>
const failureCache = new Set<string>();
// ========================================================================

/**
 * Fetches an image, resizes it, and returns a Data URL for display.
 * This function now includes a caching layer to avoid re-fetching images.
 * @param imageUrl The URL of the image to process.
 * @param maxSize The maximum width or height of the resized image.
 * @returns A promise that resolves with the image's Data URL.
 */
export const resizeImageToDataUrl = (
  imageUrl: string,
  maxSize: number
): Promise<string> => {
  // --- NEW: Check the cache before doing any work ---
  if (successCache.has(imageUrl)) {
    return Promise.resolve(successCache.get(imageUrl)!);
  }
  if (failureCache.has(imageUrl)) {
    // Instantly reject if we know this URL is bad.
    return Promise.reject(
      new Error(`Image previously failed to load: ${imageUrl}`)
    );
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        // This is an internal error, don't cache this failure
        return reject(new Error("Could not get canvas context"));
      }

      let width = img.width;
      let height = img.height;

      // Maintain aspect ratio
      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error("Canvas to Blob conversion failed."));
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            // --- NEW: Cache the successful result ---
            successCache.set(imageUrl, dataUrl);
            resolve(dataUrl);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        "image/webp",
        0.9
      );
    };

    img.onerror = (err) => {
      // This error means the image URL is bad (e.g., 404).
      console.error(
        "Failed to load image for resizing (to data URL):",
        imageUrl,
        err
      );
      // --- NEW: Cache the failure ---
      failureCache.add(imageUrl);
      reject(new Error("Failed to load image for resizing"));
    };

    img.src = parseWikiImageUrl(imageUrl);
  });
};
