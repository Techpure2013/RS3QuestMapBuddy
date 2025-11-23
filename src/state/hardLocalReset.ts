import { clearImageCache } from "idb/imageCache";
import { clearObservedChatheads } from "idb/chatheadsObserved";
import { clearPendingChatheads } from "idb/chatheadQueue";
import { del } from "idb-keyval";
import { EditorStore } from "./editorStore";

const EDITOR_STATE_KEY = "rs3qb:editor_state:v3";

export async function hardLocalReset(): Promise<void> {
  try {
    await Promise.allSettled([
      clearImageCache(),
      clearObservedChatheads(),
      clearPendingChatheads(),
      del(EDITOR_STATE_KEY),
    ]);
  } finally {
    // Reset in-memory state and force a reload so all components remount cleanly
    EditorStore.reset();
    window.location.reload();
  }
}
