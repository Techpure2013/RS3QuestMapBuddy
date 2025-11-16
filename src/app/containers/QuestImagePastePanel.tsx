import React, { useCallback, useMemo, useState } from "react";
import Panel from "./../sections/panel";
import { ImagePasteTarget } from "./../sections/ImagePasteTarget";
import { useEditorSelector } from "./../../state/useEditorSelector";
import { EditorStore } from "./../../state/editorStore";
import { questToBundle, type QuestImage } from "./../../state/types";
import { saveActiveBundle } from "./../../idb/bundleStore";
import {
  parseWikiImageUrl,
  processImageBlobToWebp,
} from "../../map/utils/imageUtils";

export const QuestImagePastePanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);
  const selectedStep = useEditorSelector((s) => s.selection.selectedStep);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(
    null
  );
  const [status, setStatus] = useState<string>("");

  const questName = quest?.questName ?? "";
  const stepKey = useMemo(() => String(selectedStep + 1), [selectedStep]);

  const persist = useCallback(() => {
    const q = EditorStore.getState().quest;
    if (q) void saveActiveBundle(questToBundle(q));
  }, []);

  const writeFileToDir = useCallback(
    async (blob: Blob, fileName: string) => {
      if (!dirHandle) throw new Error("No directory selected");
      const fileHandle = await dirHandle.getFileHandle(fileName, {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    },
    [dirHandle]
  );

  const safeFileName = useCallback(
    (ext: "webp" | "png" | "jpg" | "jpeg"): string => {
      const safeBase = questName.normalize("NFKC").replace(/[^a-z0-9_]/gi, "");
      const index = Date.now(); // simple unique suffix
      return `${safeBase || "quest"}_step_${stepKey}_${index}.${ext}`;
    },
    [questName, stepKey]
  );

  const handleAddQuestImage = useCallback(
    (fileName: string, width: number, height: number) => {
      EditorStore.patchQuest((draft) => {
        const list = draft.questImages ?? (draft.questImages = []);
        const stepDescription =
          draft.questSteps[selectedStep]?.stepDescription ?? `Step ${stepKey}`;
        const newImg: QuestImage = {
          step: stepKey, // definitively a string
          src: fileName, // relative to your previewBaseUrl/quest folder
          width,
          height,
          stepDescription,
        };
        list.push(newImg);
      });
      persist();
    },
    [persist, selectedStep, stepKey]
  );

  const processPaste = useCallback(
    async (blob: Blob) => {
      if (!quest) {
        setStatus("Please load a quest first.");
        return;
      }
      if (!dirHandle) {
        setStatus("Please select an image save directory first.");
        return;
      }
      try {
        setStatus("Processing image...");
        const {
          blob: processed,
          width,
          height,
        } = await processImageBlobToWebp(blob);
        const fileName = safeFileName("webp");
        await writeFileToDir(processed, fileName);
        handleAddQuestImage(fileName, width, height);
        setStatus(`Saved ${fileName}`);
      } catch (e) {
        console.error("Failed to process/save pasted image:", e);
        setStatus("Failed to process/save pasted image.");
      }
    },
    [quest, dirHandle, safeFileName, writeFileToDir, handleAddQuestImage]
  );

  const processUrl = useCallback(
    async (url: string) => {
      if (!quest) {
        setStatus("Please load a quest first.");
        return;
      }
      if (!dirHandle) {
        setStatus("Please select an image save directory first.");
        return;
      }
      const normalized = parseWikiImageUrl(url.trim());
      if (!normalized) {
        setStatus("Invalid URL.");
        return;
      }
      try {
        setStatus("Downloading image...");
        const res = await fetch(normalized);
        if (!res.ok) throw new Error(`fetch failed ${res.status}`);
        const blob = await res.blob();

        setStatus("Processing image...");
        const {
          blob: processed,
          width,
          height,
        } = await processImageBlobToWebp(blob);
        const fileName = safeFileName("webp");
        await writeFileToDir(processed, fileName);
        handleAddQuestImage(fileName, width, height);
        setStatus(`Saved ${fileName}`);
      } catch (e) {
        console.error("Failed to add image from URL:", e);
        setStatus("Failed to add image from URL.");
      }
    },
    [quest, dirHandle, safeFileName, writeFileToDir, handleAddQuestImage]
  );

  return (
    <>
      <div className="button-group">
        <button
          onClick={async () => {
            try {
              const handle = await (
                window as unknown as {
                  showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
                }
              ).showDirectoryPicker();
              setDirHandle(handle);
              setStatus(`Image directory set to: ${handle.name}`);
            } catch (err) {
              if (err instanceof Error && err.name === "AbortError") {
                setStatus("Directory selection cancelled");
                return;
              }
              console.error("Error selecting directory:", err);
              setStatus("Failed to select directory.");
            }
          }}
          style={{ width: "100%", marginTop: 8 }}
        >
          {dirHandle?.name || "Click to add a Directory"}
        </button>
      </div>

      <ImagePasteTarget
        onImagePaste={processPaste}
        onAddImageFromUrl={(url) => void processUrl(url)}
        disabled={!dirHandle}
        addUrlLabel="Add Image by URL"
      />

      <div style={{ marginTop: 8, color: "#9ca3af", fontSize: 12 }}>
        {questName ? (
          <>
            Quest: <strong>{questName}</strong> • Current step key:{" "}
            <strong>{stepKey}</strong>
          </>
        ) : (
          "No quest loaded"
        )}
      </div>
      {status && <div style={{ marginTop: 4, color: "#d1d5db" }}>{status}</div>}
    </>
  );
};

export default QuestImagePastePanel;
