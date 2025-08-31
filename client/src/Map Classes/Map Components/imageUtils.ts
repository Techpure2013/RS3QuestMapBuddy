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
    // Decode URL to handle special characters like ' and ()
    const decodedUrl = decodeURIComponent(url);

    // --- Priority 1: Handle complex URLs with a #/media/File: fragment ---
    // Example: ".../w/PageName#/media/File:FileName.png"
    // This is the most common format for copy-pasting from the wiki.
    if (decodedUrl.includes("#/media/File:")) {
      // Isolate the part after "File:"
      let fileName = decodedUrl.split("File:")[1];

      // Clean up junk at the end (e.g., "/2" or "?width=123")
      // We split by "/" and take the first part, then by "?" and take the first part.
      fileName = fileName.split("/")[0].split("?")[0];

      // The wiki file system uses underscores for spaces.
      const sanitizedFileName = fileName.replace(/ /g, "_");
      return `https://runescape.wiki/images/${sanitizedFileName}`;
    }

    // --- Priority 2: Handle direct links to /images/ or /w/File: ---
    // Example: ".../images/FileName.png" or ".../w/File:FileName.png"
    if (decodedUrl.includes("/images/") || decodedUrl.includes("/w/File:")) {
      // Get the last part of the URL path
      const fileName = decodedUrl.split("/").pop()?.split("?")[0] || "";

      // If it's a /w/File: link, remove the "File:" prefix
      const cleanFileName = fileName.startsWith("File:")
        ? fileName.substring(5)
        : fileName;

      const sanitizedFileName = cleanFileName.replace(/ /g, "_");
      return `https://runescape.wiki/images/${sanitizedFileName}`;
    }

    // --- Priority 3: Handle simple /w/ page links (fallback for chatheads) ---
    // Example: ".../w/King_Roald"
    if (decodedUrl.includes("/w/")) {
      const pageName = decodedUrl.split("/w/")[1].split("#")[0].split("?")[0];
      const sanitizedPageName = pageName.replace(/ /g, "_");
      return `https://runescape.wiki/images/${sanitizedPageName}_chathead.png`;
    }
  } catch (e) {
    console.error("Could not parse wiki URL, returning original.", url, e);
  }

  // --- Final Fallback ---
  // If no rules match, return the original URL and let it fail visibly.
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
