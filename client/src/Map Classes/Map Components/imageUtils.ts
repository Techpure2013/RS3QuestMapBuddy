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

// src/utils/imageUtils.ts

/**
 * Parses a wide variety of RuneScape Wiki URL formats to get a direct,
 * usable image source URL.
 * @param url The wiki page URL, which can be a direct link, a page link,
 * or a complex page link with a media hash.
 * @returns A direct URL to the image file.
 */
export const parseWikiImageUrl = (url: string): string => {
  try {
    // We still decode the whole URL first to read it properly
    const decodedUrl = decodeURIComponent(url);

    if (decodedUrl.includes("#/media/File:")) {
      let fileName = decodedUrl.split("File:")[1];
      fileName = fileName.split("/")[0].split("?")[0];
      const sanitizedFileName = fileName.replace(/ /g, "_");

      // THIS IS THE FIX: We re-encode just the filename part.
      // WHY: This correctly converts special characters like the '%' in
      // "50% Luke" into a browser-safe format (e.g., '%25'), creating a
      // valid URL that will load correctly.
      return `https://runescape.wiki/images/${encodeURIComponent(
        sanitizedFileName
      )}`;
    }

    if (decodedUrl.includes("/images/") || decodedUrl.includes("/w/File:")) {
      const fileName = decodedUrl.split("/").pop()?.split("?")[0] || "";
      const cleanFileName = fileName.startsWith("File:")
        ? fileName.substring(5)
        : fileName;
      const sanitizedFileName = cleanFileName.replace(/ /g, "_");
      return `https://runescape.wiki/images/${encodeURIComponent(
        sanitizedFileName
      )}`;
    }

    if (decodedUrl.includes("/w/")) {
      const pageName = decodedUrl.split("/w/")[1].split("#")[0].split("?")[0];
      const sanitizedPageName = pageName.replace(/ /g, "_");
      return `https://runescape.wiki/images/${encodeURIComponent(
        sanitizedPageName
      )}_chathead.png`;
    }
  } catch (e) {
    console.error("Could not parse wiki URL, returning original.", url, e);
  }

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
