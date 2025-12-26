import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ImagePasteTarget } from "./../sections/ImagePasteTarget";
import { useEditorSelector } from "./../../state/useEditorSelector";
import { EditorStore } from "./../../state/editorStore";
import { questToBundle, type QuestImage } from "./../../state/types";
import { saveActiveBundle } from "./../../idb/bundleStore";
import {
  parseWikiImageUrl,
  processImageBlobToWebp,
} from "../../map/utils/imageUtils";
import { getApiBase } from "../../utils/apiBase";

interface FolderImage {
  filename: string;
  url: string;
}

export const QuestImagePastePanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);
  const selectedStep = useEditorSelector((s) => s.selection.selectedStep);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [folderImages, setFolderImages] = useState<FolderImage[]>([]);
  const [showImages, setShowImages] = useState(false);

  const questName = quest?.questName ?? "";
  const stepKey = useMemo(() => String(selectedStep + 1), [selectedStep]);

  // Fetch folders from VPS on mount
  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/images/folders`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
      }
    } catch (err) {
      console.error("Failed to fetch folders:", err);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const persist = useCallback(() => {
    const q = EditorStore.getState().quest;
    if (q) void saveActiveBundle(questToBundle(q));
  }, []);

  const safeFileName = useCallback(
    (ext: "webp" | "png" | "jpg" | "jpeg"): string => {
      const safeBase = questName.normalize("NFKC").replace(/[^a-z0-9_]/gi, "");
      const index = Date.now();
      return `${safeBase || "quest"}_step_${stepKey}_${index}.${ext}`;
    },
    [questName, stepKey]
  );

  const handleAddQuestImage = useCallback(
    (imageUrl: string, width: number, height: number) => {
      EditorStore.patchQuest((draft) => {
        const list = draft.questImages ?? (draft.questImages = []);
        const stepDescription =
          draft.questSteps[selectedStep]?.stepDescription ?? `Step ${stepKey}`;
        const newImg: QuestImage = {
          step: stepKey,
          src: imageUrl,
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

  // Upload image to VPS
  const uploadToVPS = useCallback(
    async (blob: Blob, fileName: string): Promise<string> => {
      const formData = new FormData();
      formData.append("file", blob, fileName);

      const url = selectedFolder
        ? `${getApiBase()}/api/images/upload?folder=${encodeURIComponent(selectedFolder)}`
        : `${getApiBase()}/api/images/upload`;

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Upload failed");
      }

      const data = await res.json();
      return data.url;
    },
    [selectedFolder]
  );

  // Fetch images in selected folder
  const fetchFolderImages = useCallback(async () => {
    if (!selectedFolder) {
      setFolderImages([]);
      return;
    }
    try {
      const res = await fetch(
        `${getApiBase()}/api/images/folders/${encodeURIComponent(selectedFolder)}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setFolderImages(data.images || []);
      } else {
        setFolderImages([]);
      }
    } catch (err) {
      console.error("Failed to fetch folder images:", err);
      setFolderImages([]);
    }
  }, [selectedFolder]);

  const processPaste = useCallback(
    async (blob: Blob) => {
      if (!quest) {
        setStatus("Please load a quest first.");
        return;
      }
      if (!selectedFolder) {
        setStatus("Please select a folder first.");
        return;
      }
      try {
        setIsLoading(true);
        setStatus("Processing image...");
        const {
          blob: processed,
          width,
          height,
        } = await processImageBlobToWebp(blob);
        const fileName = safeFileName("webp");

        setStatus("Uploading to VPS...");
        const imageUrl = await uploadToVPS(processed, fileName);

        handleAddQuestImage(imageUrl, width, height);
        setStatus(`Saved: ${imageUrl}`);
        if (showImages) await fetchFolderImages();
      } catch (e) {
        console.error("Failed to process/upload pasted image:", e);
        setStatus(
          `Failed: ${e instanceof Error ? e.message : "Unknown error"}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [quest, selectedFolder, safeFileName, uploadToVPS, handleAddQuestImage, showImages, fetchFolderImages]
  );

  const processUrl = useCallback(
    async (url: string) => {
      if (!quest) {
        setStatus("Please load a quest first.");
        return;
      }
      if (!selectedFolder) {
        setStatus("Please select a folder first.");
        return;
      }
      const normalized = parseWikiImageUrl(url.trim());
      if (!normalized) {
        setStatus("Invalid URL.");
        return;
      }
      try {
        setIsLoading(true);
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

        setStatus("Uploading to VPS...");
        const imageUrl = await uploadToVPS(processed, fileName);

        handleAddQuestImage(imageUrl, width, height);
        setStatus(`Saved: ${imageUrl}`);
        if (showImages) await fetchFolderImages();
      } catch (e) {
        console.error("Failed to add image from URL:", e);
        setStatus(
          `Failed: ${e instanceof Error ? e.message : "Unknown error"}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [quest, selectedFolder, safeFileName, uploadToVPS, handleAddQuestImage, showImages, fetchFolderImages]
  );

  const createFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${getApiBase()}/api/images/folders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderName: newFolderName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(`Created folder: ${data.folderName}`);
        setNewFolderName("");
        await fetchFolders();
        setSelectedFolder(data.folderName);
      } else {
        const errData = await res.json().catch(() => ({}));
        setStatus(`Failed to create folder: ${errData.error || "Unknown"}`);
      }
    } catch (err) {
      console.error("Failed to create folder:", err);
      setStatus("Failed to create folder");
    } finally {
      setIsLoading(false);
    }
  }, [newFolderName, fetchFolders]);

  // Fetch images when folder changes
  useEffect(() => {
    if (showImages) {
      fetchFolderImages();
    }
  }, [selectedFolder, showImages, fetchFolderImages]);

  // Delete an image
  const deleteImage = useCallback(async (filename: string) => {
    if (!selectedFolder) return;
    if (!confirm(`Delete image "${filename}"?`)) return;

    try {
      setIsLoading(true);
      const res = await fetch(
        `${getApiBase()}/api/images/folder/${encodeURIComponent(selectedFolder)}/${encodeURIComponent(filename)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) {
        setStatus(`Deleted: ${filename}`);
        await fetchFolderImages();
      } else {
        const errData = await res.json().catch(() => ({}));
        setStatus(`Failed to delete: ${errData.error || "Unknown"}`);
      }
    } catch (err) {
      console.error("Failed to delete image:", err);
      setStatus("Failed to delete image");
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolder, fetchFolderImages]);

  // Delete a folder
  const deleteFolder = useCallback(async () => {
    if (!selectedFolder) return;
    if (!confirm(`Delete folder "${selectedFolder}" and ALL its images? This cannot be undone!`)) return;

    try {
      setIsLoading(true);
      const res = await fetch(
        `${getApiBase()}/api/images/folders/${encodeURIComponent(selectedFolder)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) {
        setStatus(`Deleted folder: ${selectedFolder}`);
        setSelectedFolder("");
        setFolderImages([]);
        await fetchFolders();
      } else {
        const errData = await res.json().catch(() => ({}));
        setStatus(`Failed to delete folder: ${errData.error || "Unknown"}`);
      }
    } catch (err) {
      console.error("Failed to delete folder:", err);
      setStatus("Failed to delete folder");
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolder, fetchFolders]);

  return (
    <>
      <div className="control-group" style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4, display: "block" }}>
          Select VPS Folder:
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            style={{ flex: 1 }}
            disabled={isLoading}
          >
            <option value="">-- Select a folder --</option>
            {folders.map((folder) => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>
          {selectedFolder && (
            <button
              onClick={deleteFolder}
              disabled={isLoading}
              className="button--delete"
              style={{ backgroundColor: "#dc2626", padding: "4px 8px" }}
              title="Delete folder"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      <div
        className="control-group"
        style={{ display: "flex", gap: 8, marginBottom: 8 }}
      >
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="New folder name"
          style={{ flex: 1 }}
          disabled={isLoading}
        />
        <button
          onClick={createFolder}
          disabled={!newFolderName.trim() || isLoading}
          className="button--add"
        >
          Create
        </button>
      </div>

      {selectedFolder && (
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => {
              setShowImages(!showImages);
              if (!showImages) fetchFolderImages();
            }}
            disabled={isLoading}
            style={{ width: "100%", padding: "6px 12px" }}
          >
            {showImages ? "Hide Images" : `View Images (${folderImages.length})`}
          </button>
        </div>
      )}

      {showImages && selectedFolder && (
        <div
          style={{
            maxHeight: 300,
            overflowY: "auto",
            border: "1px solid #374151",
            borderRadius: 4,
            padding: 8,
            marginBottom: 8,
            backgroundColor: "#1f2937",
          }}
        >
          {folderImages.length === 0 ? (
            <div style={{ color: "#9ca3af", textAlign: "center", padding: 16 }}>
              No images in this folder
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: 8,
              }}
            >
              {folderImages.map((img) => (
                <div
                  key={img.filename}
                  style={{
                    position: "relative",
                    border: "1px solid #374151",
                    borderRadius: 4,
                    overflow: "hidden",
                    backgroundColor: "#111827",
                  }}
                >
                  <img
                    src={`https://techpure.dev${img.url}`}
                    alt={img.filename}
                    style={{
                      width: "100%",
                      height: 80,
                      objectFit: "cover",
                      display: "block",
                    }}
                    loading="lazy"
                  />
                  <div
                    style={{
                      padding: 4,
                      fontSize: 10,
                      color: "#9ca3af",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={img.filename}
                  >
                    {img.filename}
                  </div>
                  <button
                    onClick={() => deleteImage(img.filename)}
                    disabled={isLoading}
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      backgroundColor: "#dc2626",
                      border: "none",
                      borderRadius: 4,
                      padding: "2px 6px",
                      fontSize: 12,
                      cursor: "pointer",
                      color: "white",
                    }}
                    title="Delete image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ImagePasteTarget
        onImagePaste={processPaste}
        onAddImageFromUrl={(url) => void processUrl(url)}
        disabled={!selectedFolder || isLoading}
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
      {selectedFolder && (
        <div style={{ marginTop: 4, color: "#22c55e", fontSize: 12 }}>
          Uploading to: <strong>/images/{selectedFolder}/</strong>
        </div>
      )}
      {status && <div style={{ marginTop: 4, color: "#d1d5db" }}>{status}</div>}
    </>
  );
};

export default QuestImagePastePanel;
