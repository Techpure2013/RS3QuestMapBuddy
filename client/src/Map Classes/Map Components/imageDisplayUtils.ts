// src/Map Classes/Map Components/imageDisplayUtils.ts
import { parseWikiImageUrl } from "./imageUtils";

/**
 * Fetches an image, resizes it, converts it to a WebP Data URL for display.
 * @param imageUrl The URL of the image to process.
 * @param maxSize The maximum width or height of the resized image.
 * @returns A promise that resolves with the image's Data URL.
 */
export const resizeImageToDataUrl = (
  imageUrl: string,
  maxSize: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
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

      // CHANGE: Converted to a WebP blob first, then to a Data URL.
      // WHY: This makes it consistent with your other `resizeImage` utility
      // and uses the more efficient WebP format instead of PNG. The process
      // involves getting a blob from the canvas and then using a
      // FileReader to convert that blob into a base64 Data URL.
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error("Canvas to Blob conversion failed."));
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        "image/webp",
        0.9 // Quality setting for WebP
      );
    };

    img.onerror = (err) => {
      console.error(
        "Failed to load image for resizing (to data URL):",
        imageUrl,
        err
      );
      reject(new Error("Failed to load image for resizing"));
    };

    // Use the parsed URL from the other utility
    img.src = parseWikiImageUrl(imageUrl);
  });
};
