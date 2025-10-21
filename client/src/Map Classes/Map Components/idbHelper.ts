// src/Map Classes/Map Components/fileSystemDb.ts
import { get, set } from "idb-keyval";

const FILE_HANDLE_KEY = "quest-detail-file-handle";

/**
 * Stores a FileSystemFileHandle in IndexedDB for persistence.
 */
export const storeFileHandle = (handle: any): Promise<void> => {
  return set(FILE_HANDLE_KEY, handle);
};

/**
 * Retrieves a FileSystemFileHandle from IndexedDB.
 */
export const getFileHandle = (): Promise<any | undefined> => {
  return get(FILE_HANDLE_KEY);
};

/**
 * Checks the current permission status for a file handle without prompting the user.
 * This is safe to run on page load.
 */
export const checkPermission = async (
  fileHandle: any
): Promise<"granted" | "denied" | "prompt"> => {
  const options = { mode: "readwrite" };
  return await fileHandle.queryPermission(options);
};

/**
 * Verifies permission and requests it if necessary. This must be called after a user action.
 * @returns true if permission is granted, false otherwise.
 */
export const verifyAndRequestPermission = async (
  fileHandle: any
): Promise<boolean> => {
  const options = { mode: "readwrite" };
  if ((await fileHandle.queryPermission(options)) === "granted") {
    return true;
  }
  if ((await fileHandle.requestPermission(options)) === "granted") {
    return true;
  }
  return false;
};
