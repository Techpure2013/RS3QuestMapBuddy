/**
 * Resizes an image from a Blob, converts it to WebP, and returns a new Blob.
 * @param imageBlob The image Blob to process.
 * @param maxSize The maximum width or height of the resized image.
 * @returns A promise that resolves with the resized WebP Blob, original width, and original height.
 */
export const resizeImageBlob = (
  imageBlob: Blob,
  maxSize: number
): Promise<{ blob: Blob; width: number; height: number }> => {
  const objectUrl = URL.createObjectURL(imageBlob);
  // Reuse the existing resize logic, but revoke the object URL after
  return resizeImage(objectUrl, maxSize).finally(() =>
    URL.revokeObjectURL(objectUrl)
  );
};

/**
 * Parses various RuneScape Wiki URL formats to get a direct image source URL.
 * @param url The wiki page URL.
 * @returns A direct URL to the image file.
 */
export const parseWikiImageUrl = (url: string): string => {
  try {
    // Decode URL to handle encoded characters like '
    const decodedUrl = decodeURIComponent(url);

    // Handle URLs with #/media/File:
    if (decodedUrl.includes("#/media/File:")) {
      const fileName = decodedUrl.split("File:")[1].split("/")[0];
      const sanitizedFileName = fileName.replace(/ /g, "_");
      return `https://runescape.wiki/images/${sanitizedFileName}`;
    }

    // Handle direct /images/ URLs that might have query params
    if (decodedUrl.includes("/images/")) {
      const baseUrl = decodedUrl.split("?")[0];
      if (
        /\.(png|jpg|jpeg|gif|webp)$/i.test(baseUrl) ||
        !baseUrl.includes(".")
      ) {
        return baseUrl.endsWith(".png") ? baseUrl : `${baseUrl}.png`;
      }
    }

    // Fallback for simple /w/ URLs
    if (decodedUrl.includes("/w/")) {
      const pageName = decodedUrl.split("/w/")[1].split("#")[0];
      const sanitizedPageName = pageName.replace(/ /g, "_");
      return `https://runescape.wiki/images/${sanitizedPageName}_chathead.png`;
    }
  } catch (e) {
    console.error("Could not parse wiki URL", e);
  }

  // If all else fails, return the original URL and hope for the best
  return url;
};

/**
 * Fetches an image, resizes it, and converts it to a WebP Blob.
 * @param imageUrl The URL of the image to process.
 * @param maxSize The maximum width or height of the resized image.
 * @returns A promise that resolves with the image Blob, original width, and original height.
 */
export const resizeImage = (
  imageUrl: string,
  maxSize: number
): Promise<{ blob: Blob; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return reject(new Error("Could not get canvas context"));
      }

      const originalWidth = img.width;
      const originalHeight = img.height;

      let width = originalWidth;
      let height = originalHeight;

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

      // Convert canvas to a .webp Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({
              blob,
              width: originalWidth,
              height: originalHeight,
            });
          } else {
            reject(new Error("Canvas to Blob conversion failed."));
          }
        },
        "image/webp",
        0.9 // Quality setting for WebP
      );
    };

    img.onerror = (err) => {
      console.error("Failed to load image for resizing:", imageUrl, err);
      reject(new Error("Failed to load image for resizing"));
    };

    // Use the parsed URL
    img.src = parseWikiImageUrl(imageUrl);
  });
};
