import { clearImageCache } from "idb/imageCache";
import { clearObservedChatheads } from "idb/chatheadsObserved";
import { clearPendingChatheads } from "idb/chatheadQueue";
import { clearActiveBundle } from "idb/bundleStore";
import { clearNpcCache } from "idb/npcStore";
import { clearQuestListFullCache } from "api/questListService";
import { del } from "idb-keyval";
import { EditorStore } from "./editorStore";

const EDITOR_STATE_KEY = "rs3qb:editor_state:v3";

export async function hardLocalReset(): Promise<void> {
  try {
    await Promise.allSettled([
      clearImageCache(),
      clearObservedChatheads(),
      clearPendingChatheads(),
      clearActiveBundle(),
      clearNpcCache(),
      clearQuestListFullCache(),
      del(EDITOR_STATE_KEY),
    ]);
    // NOTE: ExportsStore (Saved Library) is intentionally preserved through resets
  } finally {
    // Reset in-memory state and force a reload so all components remount cleanly
    EditorStore.reset();
    window.location.reload();
  }
}
