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
import { useAuth } from "../../state/useAuth";

/** encodeURIComponent leaves ' unencoded — encode it too so folder names with apostrophes work */
const encodeFolder = (name: string) =>
  encodeURIComponent(name).replace(/'/g, "%27");

interface FolderImage {
  filename: string;
  url: string;
}

export const QuestImagePastePanel: React.FC = () => {
  const { isAuthed, role } = useAuth();
  const isOwner = role === "owner";
  const quest = useEditorSelector((s) => s.quest);
  const selectedStep = useEditorSelector((s) => s.selection.selectedStep);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [folderImages, setFolderImages] = useState<FolderImage[]>([]);
  const [showImages, setShowImages] = useState(false);
  const [folderFilter, setFolderFilter] = useState<string>("");
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());

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

  // Reset folder selection when switching quests so auto-select can re-match
  useEffect(() => {
    setSelectedFolder("");
  }, [questName]);

  // Auto-select VPS folder when quest loads (match questName to folder list)
  useEffect(() => {
    if (!questName || folders.length === 0 || selectedFolder) return;
    // Strip colons and apostrophes from both sides for matching
    const strip = (s: string) => s.replace(/[:']/g, "").toLowerCase();
    const normalized = strip(questName);
    const match = folders.find((f) => strip(f) === normalized);
    if (match) setSelectedFolder(match);
  }, [questName, folders, selectedFolder]);

  // Filtered folder list for search
  const filteredFolders = useMemo(() => {
    if (!folderFilter.trim()) return folders;
    const q = folderFilter.trim().toLowerCase();
    return folders.filter((f) => f.toLowerCase().includes(q));
  }, [folders, folderFilter]);

  const persist = useCallback(() => {
    const q = EditorStore.getState().quest;
    if (q) void saveActiveBundle(questToBundle(q));
  }, []);

  const safeFileName = useCallback(
    (ext: "webp" | "png" | "jpg" | "jpeg"): string => {
      const safeBase = questName.normalize("NFKC").replace(/[^a-z0-9_]/gi, "");
      // Send base filename - server will add sequential index
      return `${safeBase || "quest"}_step_${stepKey}.${ext}`;
    },
    [questName, stepKey]
  );

  const handleAddQuestImage = useCallback(
    (imageUrl: string, width: number, height: number) => {
      // Extract just the filename from the full URL path
      // e.g., "/images/Do No Evil/filename.webp" -> "filename.webp"
      const filename = imageUrl.split("/").pop() || imageUrl;

      EditorStore.patchQuest((draft) => {
        const list = draft.questImages ?? (draft.questImages = []);
        const currentStep = draft.questSteps[selectedStep];
        const stepId = currentStep?.stepId;
        const newImg: QuestImage = {
          src: filename,
          width,
          height,
          stepIds: typeof stepId === "number" ? [stepId] : [],
          // Backward compat
          step: stepKey,
          stepDescription: currentStep?.stepDescription ?? `Step ${stepKey}`,
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
        ? `${getApiBase()}/api/images/upload?folder=${encodeFolder(selectedFolder)}`
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
        `${getApiBase()}/api/images/folders/${encodeFolder(selectedFolder)}`,
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
        await fetchFolderImages();
      } catch (e) {
        console.error("Failed to process/upload pasted image:", e);
        setStatus(
          `Failed: ${e instanceof Error ? e.message : "Unknown error"}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [quest, selectedFolder, safeFileName, uploadToVPS, handleAddQuestImage, fetchFolderImages]
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
        await fetchFolderImages();
      } catch (e) {
        console.error("Failed to add image from URL:", e);
        setStatus(
          `Failed: ${e instanceof Error ? e.message : "Unknown error"}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [quest, selectedFolder, safeFileName, uploadToVPS, handleAddQuestImage, fetchFolderImages]
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

  // Fetch images whenever folder changes (for count + grid)
  useEffect(() => {
    fetchFolderImages();
  }, [selectedFolder, fetchFolderImages]);

  // Link an existing folder image to the current step without re-uploading
  const linkExistingImage = useCallback(
    (filename: string) => {
      if (!quest) return;
      // Create an img element to get dimensions
      const imgEl = new Image();
      imgEl.onload = () => {
        handleAddQuestImage(filename, imgEl.naturalWidth, imgEl.naturalHeight);
        setStatus(`Linked: ${filename} → Step ${stepKey}`);
      };
      imgEl.onerror = () => {
        // Fallback: link with 0x0 dimensions
        handleAddQuestImage(filename, 0, 0);
        setStatus(`Linked: ${filename} → Step ${stepKey} (dimensions unknown)`);
      };
      imgEl.src = `https://techpure.dev/images/${encodeFolder(selectedFolder)}/${encodeURIComponent(filename)}`;
    },
    [quest, selectedFolder, handleAddQuestImage, stepKey]
  );

  // Add the current step to an already-linked image's stepIds
  const addStepToImage = useCallback(
    (filename: string) => {
      if (!quest) return;
      const currentStep = quest.questSteps[selectedStep];
      const stepId = currentStep?.stepId;
      if (typeof stepId !== "number") return;
      EditorStore.patchQuest((draft) => {
        const img = (draft.questImages ?? []).find((qi) => qi.src === filename);
        if (!img) return;
        if (!img.stepIds.includes(stepId)) {
          img.stepIds = [...img.stepIds, stepId];
        }
      });
      persist();
      setStatus(`Added Step ${stepKey} to ${filename}`);
    },
    [quest, selectedStep, stepKey, persist]
  );

  // Admin-only: toggle image selection for batch delete
  const toggleSelectImage = useCallback((filename: string) => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  }, []);

  // Batch delete selected images from VPS (any authenticated user)
  const deleteSelectedImages = useCallback(async () => {
    if (!selectedFolder || !isAuthed || selectedForDelete.size === 0) return;
    try {
      setIsLoading(true);
      setStatus(`Deleting ${selectedForDelete.size} image(s)...`);
      const results = await Promise.allSettled(
        [...selectedForDelete].map((filename) =>
          fetch(
            `${getApiBase()}/api/images/folder/${encodeFolder(selectedFolder)}/${encodeURIComponent(filename)}`,
            { method: "DELETE", credentials: "include" }
          )
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      setSelectedForDelete(new Set());
      await fetchFolderImages();
      setStatus(
        failed > 0
          ? `Deleted ${selectedForDelete.size - failed}, ${failed} failed`
          : `Deleted ${selectedForDelete.size} image(s)`
      );
    } catch (err) {
      console.error("Failed to delete images:", err);
      setStatus("Failed to delete images");
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolder, isAuthed, selectedForDelete, fetchFolderImages]);

  // Admin-only: delete a folder from VPS
  const deleteFolder = useCallback(async () => {
    if (!selectedFolder || !isOwner) return;
    if (!confirm(`Delete folder "${selectedFolder}" and ALL its images? This cannot be undone!`)) return;
    try {
      setIsLoading(true);
      const res = await fetch(
        `${getApiBase()}/api/images/folders/${encodeFolder(selectedFolder)}`,
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
  }, [selectedFolder, isOwner, fetchFolders]);

  return (
    <>
      <div className="control-group" style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4, display: "block" }}>
          Select VPS Folder:
        </label>
        <input
          type="text"
          value={folderFilter}
          onChange={(e) => setFolderFilter(e.target.value)}
          placeholder="Search folders..."
          style={{ marginBottom: 4, fontSize: 12 }}
          disabled={isLoading}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            style={{ flex: 1 }}
            disabled={isLoading}
          >
            <option value="">-- Select a folder --</option>
            {filteredFolders.map((folder) => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>
          {isOwner && selectedFolder && (
            <button
              onClick={deleteFolder}
              disabled={isLoading}
              style={{ backgroundColor: "#dc2626", padding: "4px 8px", border: "none", borderRadius: 4, color: "white", cursor: "pointer" }}
              title="Delete folder (admin)"
            >
              X
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
            onClick={() => setShowImages(!showImages)}
            disabled={isLoading}
            style={{ width: "100%", padding: "6px 12px", boxSizing: "border-box" }}
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
          {isAuthed && (
            <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <button
                onClick={() => {
                  if (selectedForDelete.size === folderImages.length) {
                    setSelectedForDelete(new Set());
                  } else {
                    setSelectedForDelete(new Set(folderImages.map((img) => img.filename)));
                  }
                }}
                style={{
                  backgroundColor: "transparent",
                  color: "#9ca3af",
                  border: "1px solid #374151",
                  borderRadius: 4,
                  padding: "4px 8px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {selectedForDelete.size === folderImages.length ? "Deselect All" : "Select All"}
              </button>
              {selectedForDelete.size > 0 && (
                <>
                  <button
                    onClick={deleteSelectedImages}
                    disabled={isLoading}
                    style={{
                      backgroundColor: "#dc2626",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      padding: "4px 12px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Delete {selectedForDelete.size} selected
                  </button>
                  <button
                    onClick={() => setSelectedForDelete(new Set())}
                    style={{
                      backgroundColor: "transparent",
                      color: "#9ca3af",
                      border: "1px solid #374151",
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          )}
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
              {folderImages.map((img) => {
                const linkedImage = (quest?.questImages ?? []).find(
                  (qi) => qi.src === img.filename
                );
                const alreadyLinked = !!linkedImage;
                const isSelected = selectedForDelete.has(img.filename);

                // Resolve linked step labels
                let linkedLabel = "Linked";
                if (linkedImage) {
                  const ids = linkedImage.stepIds ?? [];
                  if (ids.length > 0) {
                    const steps = quest?.questSteps ?? [];
                    const labels = ids.map((sid) => {
                      const idx = steps.findIndex((s) => s.stepId === sid);
                      return idx >= 0 ? `Step ${idx + 1}` : `Step ?`;
                    });
                    linkedLabel = labels.join(", ");
                  } else {
                    linkedLabel = "Unlinked";
                  }
                }

                // Check if the current step is already linked to this image
                const currentStepId = quest?.questSteps[selectedStep]?.stepId;
                const currentStepAlreadyLinked = alreadyLinked
                  && typeof currentStepId === "number"
                  && (linkedImage.stepIds ?? []).includes(currentStepId);

                return (
                  <div
                    key={img.filename}
                    style={{
                      position: "relative",
                      border: `1px solid ${isSelected ? "#dc2626" : alreadyLinked ? "#22c55e" : "#374151"}`,
                      borderRadius: 4,
                      overflow: "hidden",
                      backgroundColor: "#111827",
                    }}
                  >
                    {isAuthed && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectImage(img.filename)}
                        style={{
                          position: "absolute",
                          top: 4,
                          left: 4,
                          zIndex: 1,
                          accentColor: "#dc2626",
                        }}
                        title="Select for deletion"
                      />
                    )}
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
                        wordBreak: "break-all",
                      }}
                    >
                      {img.filename}
                    </div>
                    {alreadyLinked ? (
                      <>
                        <div
                          style={{
                            width: "100%",
                            padding: "3px 4px",
                            fontSize: 11,
                            backgroundColor: "#374151",
                            color: linkedImage.stepIds?.length ? "#22c55e" : "#f87171",
                            textAlign: "center",
                            boxSizing: "border-box",
                          }}
                          title={linkedLabel}
                        >
                          {linkedLabel}
                        </div>
                        {!currentStepAlreadyLinked && (
                          <button
                            onClick={() => addStepToImage(img.filename)}
                            disabled={isLoading}
                            style={{
                              width: "100%",
                              padding: "3px 0",
                              fontSize: 11,
                              backgroundColor: "#1e3a5f",
                              color: "#93c5fd",
                              border: "none",
                              cursor: "pointer",
                            }}
                            title={`Also link to Step ${stepKey}`}
                          >
                            + Step {stepKey}
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => linkExistingImage(img.filename)}
                        disabled={isLoading}
                        style={{
                          width: "100%",
                          padding: "3px 0",
                          fontSize: 11,
                          backgroundColor: "#1e3a5f",
                          color: "#93c5fd",
                          border: "none",
                          cursor: "pointer",
                        }}
                        title={`Link to current step (Step ${stepKey})`}
                      >
                        + Link Step {stepKey}
                      </button>
                    )}
                  </div>
                );
              })}
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
