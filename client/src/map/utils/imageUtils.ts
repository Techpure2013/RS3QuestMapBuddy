/**
 * Processes an image from a Blob, conditionally resizes it if it's too large,
 * and converts it to a high-quality WebP Blob.
 * @param imageBlob The image Blob to process.
 * @returns A promise that resolves with the WebP Blob, original width, and original height.
 */
export const processImageBlobToWebp = (
  imageBlob: Blob
): Promise<{ blob: Blob; width: number; height: number }> => {
  const objectUrl = URL.createObjectURL(imageBlob);
  return processAndConvertToWebp(objectUrl, {
    maxWidth: 1500,
    maxHeight: 1000,
  }).finally(() => URL.revokeObjectURL(objectUrl));
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
 * Fetches an image, resizes it only if it exceeds max dimensions,
 * and converts it to a high-quality WebP Blob.
 * @param imageUrl The URL of the image to process.
 * @param options An object with maxWidth and maxHeight.
 * @returns A promise that resolves with the image Blob, original width, and original height.
 */
export const processAndConvertToWebp = (
  imageUrl: string,
  options: { maxWidth: number; maxHeight: number }
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

      let drawWidth = originalWidth;
      let drawHeight = originalHeight;

      // Check if the image exceeds the maximum dimensions
      if (
        originalWidth > options.maxWidth ||
        originalHeight > options.maxHeight
      ) {
        const widthRatio = options.maxWidth / originalWidth;
        const heightRatio = options.maxHeight / originalHeight;
        // Use the smaller ratio to ensure the image fits within both dimensions
        const scaleRatio = Math.min(widthRatio, heightRatio);

        drawWidth = originalWidth * scaleRatio;
        drawHeight = originalHeight * scaleRatio;
      }

      canvas.width = drawWidth;
      canvas.height = drawHeight;
      ctx.drawImage(img, 0, 0, drawWidth, drawHeight);

      // Convert canvas to a .webp Blob at maximum quality
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({
              blob,
              width: originalWidth, // Still report original dimensions
              height: originalHeight,
            });
          } else {
            reject(new Error("Canvas to Blob conversion failed."));
          }
        },
        "image/webp",
        1.0 // Use maximum quality for WebP
      );
    };

    img.onerror = (err) => {
      console.error("Failed to load image for processing:", imageUrl, err);
      reject(new Error("Failed to load image for processing"));
    };

    // Use the parsed URL
    img.src = parseWikiImageUrl(imageUrl);
  });
};
