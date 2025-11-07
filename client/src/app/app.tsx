import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import {
  parseWikiImageUrl,
  processImageBlobToWebp,
} from "./../map/utils/imageUtils";
import "./../Assets/CSS/index.css";
import "./../Assets/CSS/leafless.css";
import { LatLngBounds } from "leaflet";
import {
  bounds,
  gameMapOptions,
  HandleFloorIncreaseDecrease,
} from "./../map/utils/MapFunctions";
import GridLayer from "./../map/layers/GridLayerComponent";
import { useParams } from "react-router-dom";
import ChunkGridLayer from "./../map/layers//ChunkGrid";
import { EditorPanel } from "./../editor/DeveloperControls";
import { produce } from "immer";
import StepSnapHandler from "../editor/sections/StepSnapHandler";
import { SelectionHighlightLayer } from "./../map/layers/SelectionHighlightLayer";
import type { SelectionGeometry } from "./../map/layers/SelectionHighlightLayer";
import { IconGridDots } from "@tabler/icons-react";
import { NpcSearch } from "../editor/sections/NpcSearch";
import type { Npc } from "../editor/sections/NpcSearch";
import NpcFlyToHandler from "./../map/handlers/NpcFlyToHandler";
import { MapAreaSearch } from "../editor/sections/MapAreaSearch";
import MapAreaFlyToHandler from "./../map/handlers/MapAreaFlyToHandler";
import { ObjectSearch } from "../editor/sections/ObjectSearch";
import type { MapObject } from "../editor/sections/ObjectSearch";
import ObjectFlyToHandler from "./../map/handlers/ObjectFlyToHandler";
import SelectedObjectFlyToHandler from "./../map/handlers/SelectedObjectFlyToHandler";
import { TargetFlyToHandler } from "./../map/handlers/TargetFlyToHandler";
import { MapUIOverlay } from "./../map/overlay/MapUIOverlay";
import { CustomMapPanes } from "./../map/layers/CustomMapPanes";
import { fetchQuestBundle, saveQuestBundle } from "./../api/bundleApi";
import {
  saveActiveBundle,
  clearActiveBundle,
  loadActiveBundle,
} from "./../idb/bundleStore";
import { bundleToQuest, questToBundle } from "./../state/types";
import {
  convertManualCoordToVisual,
  convertSearchedObjectCoordToVisual,
  convertSearchedNPCCoordToVisual,
} from "map/utils/coordinates";
import {
  type NpcHighlight,
  type ObjectHighlight,
  type Quest,
  type Clipboard,
} from "./../state/types";
import { createQuestHandlers } from "./controllers/questHandlers";
import { recordNpcLocation } from "./../feature/recordNpcLocations";

const MAP_OPTIONS = gameMapOptions();
const MAP_BOUNDS: LatLngBounds = bounds();

interface MapArea {
  mapId: number;
  bounds: [[number, number], [number, number]];
  center: [number, number];
  name: string;
}

interface QuestImageData {
  step: number;
  src: string;
  height: number;
  width: number;
  stepDescription: string;
}

interface QuestImageFile {
  name: string;
  images: QuestImageData[];
}

interface ChatheadOverrides {
  [key: string]: string;
}

const App: React.FC = () => {
  const { UserID, level, z } = useParams<{
    UserID: string;
    QuestName: string;
    level: string;
    z: string;
    x: string;
    y: string;
  }>();

  // Core quest search (DB) — used by QuestPickerModal
  const [questSearchResults, setQuestSearchResults] = useState<
    { name: string }[]
  >([]);
  const [questSearchLoading, setQuestSearchLoading] = useState(false);

  const handleSearchQuests = useCallback(
    async (
      term: string,
      page = 1
    ): Promise<{ items: { name: string }[]; total: number }> => {
      const t = term.trim();
      if (t.length < 2) {
        const empty = { items: [], total: 0 };
        setQuestSearchResults(empty.items);
        return empty;
      }
      setQuestSearchLoading(true);
      try {
        const params = new URLSearchParams({
          search: t,
          page: String(page),
          pageSize: "50",
        });
        const API_BASE =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1"
            ? "http://127.0.0.1:42069"
            : window.__APP_CONFIG__?.API_BASE ?? window.location.origin;

        const res = await fetch(`${API_BASE}/api/quests?${params.toString()}`);
        if (!res.ok) {
          setQuestSearchResults([]);
          return { items: [], total: 0 };
        }
        const json = await res.json();
        const payload = {
          items: (json.items ?? []) as { name: string }[],
          total: Number(json.total ?? 0),
        };
        setQuestSearchResults(payload.items);
        return payload;
      } catch (e) {
        console.error("Quest search failed:", e);
        setQuestSearchResults([]);
        return { items: [], total: 0 };
      } finally {
        setQuestSearchLoading(false);
      }
    },
    []
  );

  // Quest state (flattened)
  const [questJson, setQuestJson] = useState<Quest | null>(null);
  const [selectedStep, setSelectedStep] = useState(0);
  const [targetType, setTargetType] = useState<"npc" | "object">("npc");
  const [targetIndex, setTargetIndex] = useState(0);
  const [floor, setFloor] = useState(level ? parseInt(level, 10) : 0);

  // UI state
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [showGrids, setShowGrids] = useState(true);
  const [jsonString, setJsonString] = useState("");

  // Clipboard and highlight state
  const [clipboard, setClipboard] = useState<Clipboard>({
    type: "none",
    data: null,
  });
  const [selectedObjectFromSearch, setSelectedObjectFromSearch] =
    useState<MapObject | null>(null);
  const [highlightedObject, setHighlightedObject] = useState<MapObject | null>(
    null
  );
  const [highlightedNpc, setHighlightedNpc] = useState<Npc | null>(null);

  // Area search state
  const [selectedArea, setSelectedArea] = useState<MapArea | null>(null);
  const [isObjectAreaSearch, setIsObjectAreaSearch] = useState(false);
  const [areaSearchResults, setAreaSearchResults] = useState<MapObject[]>([]);

  // Images and assets (still local list; now source of truth is bundle/DB)
  const [questImageList, setQuestImageList] = useState<QuestImageFile[]>([]);
  const [questImageListString, setQuestImageListString] = useState("");
  const [chatheadOverrides, setChatheadOverrides] = useState<ChatheadOverrides>(
    {}
  );
  const [chatheadOverridesString, setChatheadOverridesString] = useState("");
  const [imageDirectoryHandle, setImageDirectoryHandle] = useState<any | null>(
    null
  );

  // Editor UX state
  const [stepDescriptionEdit, setStepDescriptionEdit] = useState(false);
  const [selectedObjectColor, setSelectedObjectColor] = useState("#00FF00");
  const [objectNumberLabel, setObjectNumberLabel] = useState("");
  const [captureMode, setCaptureMode] = useState<
    "single" | "multi-point" | "radius" | "wanderRadius"
  >("single");
  const [firstCorner, setFirstCorner] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [wanderRadiusInput, setWanderRadiusInput] = useState(5);
  const [isAlt1Environment, setIsAlt1Environment] = useState(false);

  async function handleLoadQuestFromDb(name: string) {
    try {
      const bundle = await fetchQuestBundle(name);
      const flat = bundleToQuest(bundle);
      setQuestJson(flat);
      setJsonString(JSON.stringify(flat, null, 2));
      await saveActiveBundle(bundle);

      // sync images for editor convenience (still held in memory)
      setQuestImageList([{ name: flat.questName, images: flat.questImages }]);
      setQuestImageListString(
        JSON.stringify(
          [{ name: flat.questName, images: flat.questImages }],
          null,
          2
        )
      );
      setSelectedStep(0);
      setTargetIndex(0);
      setTargetType("npc");
    } catch (e) {
      console.error("Failed to load quest bundle:", e);
      alert("Failed to load quest. See console.");
    }
  }

  // Clean up ephemeral working copy on tab close
  useEffect(() => {
    const cleanup = () => clearActiveBundle();
    window.addEventListener("beforeunload", cleanup);
    return () => window.removeEventListener("beforeunload", cleanup);
  }, []);

  // Auto switch target type based on content in current step
  useEffect(() => {
    if (!questJson) return;
    const step = questJson.questSteps[selectedStep];
    if (!step) return;
    const hasValidNpcs =
      step.highlights?.npc?.some(
        (npc: any) => npc.npcLocation?.lat !== 0 || npc.npcLocation?.lng !== 0
      ) || false;
    const hasValidObjects =
      step.highlights?.object?.some((obj: any) =>
        obj.objectLocation?.some((loc: any) => loc.lat !== 0 || loc.lng !== 0)
      ) || false;
    if (hasValidNpcs) {
      setTargetType("npc");
      setTargetIndex(0);
    } else if (hasValidObjects) {
      setTargetType("object");
      setTargetIndex(0);
    } else {
      setTargetIndex(0);
    }
  }, [selectedStep, questJson]);

  // Detect ALT1 environment
  useEffect(() => {
    if ((window as any).alt1) {
      setIsAlt1Environment(true);
    }
  }, []);

  // Keep targetIndex in range when the list size changes
  useEffect(() => {
    if (!questJson) return;
    const step = questJson.questSteps[selectedStep];
    if (!step) return;
    const arr = step.highlights?.[targetType] || [];
    if (targetIndex >= arr.length) {
      setTargetIndex(Math.max(0, arr.length - 1));
    }
  }, [questJson, selectedStep, targetType, targetIndex]);

  // Capture mode defaults by target type
  useEffect(() => {
    if (targetType === "object") setCaptureMode("multi-point");
    else setCaptureMode("single");
  }, [targetType]);

  // Geometry for rendered selection features
  const selectionGeometry = useMemo<SelectionGeometry>(() => {
    if (!questJson?.questSteps?.[selectedStep]) return { type: "none" };
    const step = questJson.questSteps[selectedStep];

    if (targetType === "npc") {
      const convertedNpcs = (step.highlights?.npc || [])
        .map((npc: any) => {
          const visual = convertManualCoordToVisual(npc.npcLocation);
          if (!visual) return null;
          return { ...npc, npcLocation: visual };
        })
        .filter(Boolean);
      return { type: "npc", npcArray: convertedNpcs as any };
    } else if (targetType === "object") {
      const convertedObjects = (step.highlights?.object || []).map(
        (obj: any) => {
          const validLocations = (obj.objectLocation || [])
            .map((loc: any) => {
              const visualCoords = convertManualCoordToVisual(loc);
              if (!visualCoords) return null;
              return { ...loc, lat: visualCoords.lat, lng: visualCoords.lng };
            })
            .filter(Boolean);
          return { ...obj, objectLocation: validLocations };
        }
      );
      return { type: "object", objectArray: convertedObjects as any };
    }
    return { type: "none" };
  }, [questJson, selectedStep, targetType]);

  const highlightGeometry = useMemo<SelectionGeometry>(() => {
    if (selectedObjectFromSearch) {
      return {
        type: "object",
        objectArray: [
          {
            name: selectedObjectFromSearch.name,
            objectLocation: [
              convertSearchedObjectCoordToVisual(selectedObjectFromSearch),
            ],
            objectRadius: {
              bottomLeft: { lat: 0, lng: 0 },
              topRight: { lat: 0, lng: 0 },
            },
          },
        ],
      };
    }
    if (highlightedNpc) {
      return {
        type: "npc",
        npcArray: [
          {
            npcName: highlightedNpc.name,
            npcLocation: convertSearchedNPCCoordToVisual(highlightedNpc),
            wanderRadius: {
              bottomLeft: { lat: 0, lng: 0 },
              topRight: { lat: 0, lng: 0 },
            },
          },
        ],
      };
    }
    if (highlightedObject) {
      return {
        type: "object",
        objectArray: [
          {
            name: highlightedObject.name,
            objectLocation: [
              {
                ...convertSearchedObjectCoordToVisual(highlightedObject),
                color: "#00FFFF",
              },
            ],
            objectRadius: {
              bottomLeft: { lat: 0, lng: 0 },
              topRight: { lat: 0, lng: 0 },
            },
          },
        ],
      };
    }
    return { type: "none" };
  }, [selectedObjectFromSearch, highlightedNpc, highlightedObject]);

  const canRecordNpcLocation = useMemo(() => {
    const step = questJson?.questSteps?.[selectedStep];
    if (!step || targetType !== "npc") return false;
    const t = step.highlights.npc?.[targetIndex] as NpcHighlight | undefined;
    if (!t || !t.id) return false;
    const loc = t.npcLocation;
    if (!loc) return false;
    if (loc.lat === 0 && loc.lng === 0) return false;
    return true;
  }, [questJson, selectedStep, targetType, targetIndex]);

  const targetNameValue = useMemo(() => {
    const step = questJson?.questSteps?.[selectedStep];
    if (!step) return "";
    const t = step.highlights[targetType]?.[targetIndex];
    if (!t) return "";
    if (targetType === "npc") {
      const { npcName } = t as NpcHighlight;
      return npcName || "";
    } else {
      const { name } = t as ObjectHighlight;
      return name || "";
    }
  }, [questJson, selectedStep, targetType, targetIndex]);

  const stepDescriptionValue =
    questJson?.questSteps[selectedStep]?.stepDescription || "";
  const itemsNeededValue =
    questJson?.questSteps[selectedStep]?.itemsNeeded?.join("\n") || "";
  const itemsRecommendedValue =
    questJson?.questSteps[selectedStep]?.itemsRecommended?.join("\n") || "";
  const additionalInfoValue =
    questJson?.questSteps[selectedStep]?.additionalStepInformation?.join(
      "\n"
    ) || "";

  const updateQuestState = (next: Quest) => {
    setQuestJson(next);
    setJsonString(JSON.stringify(next, null, 2));
  };

  const currentTargetObjectData = useMemo(() => {
    if (!questJson?.questSteps?.[selectedStep]) {
      return { color: selectedObjectColor, numberLabel: objectNumberLabel };
    }
    if (targetType === "object") {
      const target: ObjectHighlight | undefined =
        questJson.questSteps[selectedStep]?.highlights.object?.[targetIndex];
      const lastPoint =
        target?.objectLocation && target.objectLocation.length > 0
          ? target.objectLocation[target.objectLocation.length - 1]
          : undefined;
      return {
        color: lastPoint?.color ?? selectedObjectColor,
        numberLabel: lastPoint?.numberLabel ?? "",
      };
    }
    return { color: selectedObjectColor, numberLabel: objectNumberLabel };
  }, [
    questJson,
    selectedStep,
    targetIndex,
    targetType,
    selectedObjectColor,
    objectNumberLabel,
  ]);

  // Handlers controller
  const handlers = useMemo(
    () =>
      createQuestHandlers({
        getQuest: () => questJson,
        getSelectedStep: () => selectedStep,
        getTargetType: () => targetType,
        getTargetIndex: () => targetIndex,
        getFloor: () => floor,
        updateQuestState,
        setQuest: (q) => setQuestJson(q),
        setJsonString,
        setSelectedStep,
        setTargetType,
        setTargetIndex,
        setFloor,
        setClipboard,
        getClipboard: () => clipboard,

        getQuestImageList: () => questImageList,
        setQuestImageList,
        setQuestImageListString,

        getSelectedObjectColor: () => selectedObjectColor,
        getObjectNumberLabel: () => objectNumberLabel,
      }),
    [
      questJson,
      selectedStep,
      targetType,
      targetIndex,
      floor,
      setSelectedStep,
      setTargetType,
      setTargetIndex,
      setFloor,
      setClipboard,
      clipboard,
      setJsonString,
      questImageList,
      setQuestImageList,
      setQuestImageListString,
      selectedObjectColor,
      objectNumberLabel,
    ]
  );

  // Save to DB (normalized bundle)
  async function handleSaveQuestToDb(adminToken: string) {
    if (!questJson) return;
    const images =
      questImageList.find((q) => q.name === questJson.questName)?.images ??
      questJson.questImages ??
      [];
    const normalized = questToBundle({ ...questJson, questImages: images });
    await saveQuestBundle(normalized as any, adminToken);
    await saveActiveBundle(normalized);
  }

  // Image processing (kept local for now; no legacy JSON file I/O)
  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = fileName;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Drop-in replacement for processAndSaveImage that:
  // - converts to webp
  // - writes file to the selected directory (fallback: download)
  // - appends a QuestImage to questJson.questImages
  // - immediately persists the updated bundle to IDB via saveActiveBundle
  const processAndSaveImage = async (imageBlob: Blob) => {
    if (!questJson) {
      console.log("Please load a quest first.");
      return;
    }
    if (!imageDirectoryHandle) {
      console.log("Please select an image save directory first.");
      return;
    }

    try {
      const {
        blob: processedBlob,
        width,
        height,
      } = await processImageBlobToWebp(imageBlob);

      const stepDescription =
        questJson.questSteps[selectedStep]?.stepDescription;
      if (!stepDescription) {
        console.log("Current step has no description to link the image to.");
        return;
      }

      const currentStepNumber = selectedStep + 1;

      // Compute suffix for this step by scanning existing questJson.questImages
      const existingForStep =
        (questJson.questImages ?? []).filter(
          (img) => img.step === currentStepNumber
        ) ?? [];
      const maxSuffix = Math.max(
        0,
        ...existingForStep.map((img) => {
          const match = img.src.match(/_(\d+)\.(webp|png)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
      );
      const newImageIndex = isFinite(maxSuffix) ? maxSuffix + 1 : 1;

      // Safe filename
      const fileName = `${questJson.questName
        .normalize("NFKC")
        .replace(/ /g, "")
        .replace(":", "")}_step_${currentStepNumber}_${newImageIndex}.webp`;

      // Try writing to the chosen directory; fallback to download
      try {
        const fileHandle = await imageDirectoryHandle.getFileHandle(fileName, {
          create: true,
        });
        const writable = await fileHandle.createWritable();
        await writable.write(processedBlob);
        await writable.close();
      } catch (err) {
        console.error(
          "Direct image save failed, falling back to download:",
          err
        );
        downloadBlob(processedBlob, fileName);
      }

      // Build new QuestImage entry
      const newImage = {
        step: currentStepNumber,
        src: fileName, // stored relative; your consumer can resolve path
        height,
        width,
        stepDescription,
      };

      // Update questJson.questImages in memory
      const nextImages = (questJson.questImages ?? []).concat(newImage);
      const updatedQuest = { ...questJson, questImages: nextImages };
      setQuestJson(updatedQuest);
      setJsonString(JSON.stringify(updatedQuest, null, 2));

      // Persist immediately to IDB active bundle (normalized)
      const normalized = questToBundle(updatedQuest);
      void saveActiveBundle(normalized);
    } catch (error) {
      console.error("Failed to process and save image:", error);
      console.log(`Failed to process image. See console for details.`);
    }
  };

  const handleImagePaste = async (pastedBlob: Blob) => {
    await processAndSaveImage(pastedBlob);
  };

  const handleAddStepImage = async (url: string) => {
    if (!url) return;
    try {
      const response = await fetch(parseWikiImageUrl(url));
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const imageBlob = await response.blob();
      await processAndSaveImage(imageBlob);
    } catch (error) {
      console.error("Failed to add step image from URL:", error);
      console.log(
        `Failed to add step image from URL. See console for details.`
      );
    }
  };

  // Object/NPC selections
  const handleObjectHighlight = (obj: MapObject | null) => {
    setHighlightedObject(obj);
  };

  const handleObjectSearchSelect = (chosenObject: MapObject) => {
    handleFloorChange(chosenObject.floor);
    if (!questJson || targetType !== "object") {
      alert("Please select 'Object' as the target type first to edit.");
      return;
    }
    const nextState = produce(questJson, (draft) => {
      const target =
        draft.questSteps[selectedStep]?.highlights.object?.[targetIndex];
      if (target) {
        target.name = chosenObject.name;
        target.objectLocation = [
          {
            lat: chosenObject.lat,
            lng: chosenObject.lng,
            color: "#FFFFFF",
            numberLabel: "",
          },
        ];
        draft.questSteps[selectedStep].floor = chosenObject.floor;
      }
    });
    setQuestJson(nextState);
    setJsonString(JSON.stringify(nextState, null, 2));
    setHighlightedObject(null);
  };

  const handleNpcSearchSelect = (chosenNpc: Npc) => {
    if (!questJson) return;
    const nextState = produce(questJson, (draft) => {
      const target =
        draft.questSteps[selectedStep]?.highlights.npc?.[targetIndex];
      if (target) {
        target.id = chosenNpc.id;
        target.npcName = chosenNpc.name;
        target.npcLocation = { lat: chosenNpc.lat, lng: chosenNpc.lng };
        draft.questSteps[selectedStep].floor = chosenNpc.floor;
      }
    });
    updateQuestState(nextState);
    setHighlightedNpc(null);
  };

  const handleNpcHighlight = (npc: Npc | null) => {
    setHighlightedNpc(npc);
  };

  const handleFloorChange = useCallback(
    (newFloor: number) => {
      if (HandleFloorIncreaseDecrease(newFloor)) {
        setFloor(newFloor);
        if (!questJson) return;
        const nextState = produce(questJson, (draft) => {
          const step = draft.questSteps[selectedStep];
          if (step) step.floor = newFloor;
        });
        setQuestJson(nextState);
        setJsonString(JSON.stringify(nextState, null, 2));
      }
    },
    [questJson, selectedStep]
  );
  function commitQuestImages(nextImages: QuestImageData[]) {
    if (!questJson) return;
    const updated = { ...questJson, questImages: nextImages };
    setQuestJson(updated);
    setJsonString(JSON.stringify(updated, null, 2));
    const normalized = questToBundle(updated);
    void saveActiveBundle(normalized);
  }
  const handleSubmitToGitHub = async () => {
    if (!questJson) return;
    try {
      // Align base with 127.0.0.1 for dev
      const API_BASE =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
          ? "http://127.0.0.1:42069"
          : window.__APP_CONFIG__?.API_BASE ?? window.location.origin;

      const response = await fetch(`${API_BASE}/api/submit-pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userID: UserID || "anonymous-user",
          questJson: questJson,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        window.open(data.prUrl, "_blank");
      } else {
        throw new Error(data.error || "An unknown error occurred.");
      }
    } catch (err: any) {
      console.error("Failed to submit PR:", err);
    }
  };

  // Map click handler
  const snapToTileCoordinate = (latlng: L.LatLng) => {
    const visualCenterX = Math.floor(latlng.lng - 0.5) + 0.5;
    const visualCenterY = Math.floor(latlng.lat + 0.5) - 0.5;
    const storedLng = visualCenterX - 0.5;
    const storedLat = visualCenterY + 0.5;
    return { lat: storedLat, lng: storedLng };
  };

  const MapClickHandler = ({ disabled }: { disabled: boolean }) => {
    useMapEvents({
      click: (e) => {
        if (disabled) return;
        const snappedCoord = snapToTileCoordinate(e.latlng);

        if (isObjectAreaSearch) {
          const searchRadius = 10;
          const b = {
            minLng: snappedCoord.lng - searchRadius,
            maxLng: snappedCoord.lng + searchRadius,
            minLat: snappedCoord.lat - searchRadius,
            maxLat: snappedCoord.lat + searchRadius,
          };

          const chunksToFetch = new Set<string>();
          const chunkSize = 64;
          const startChunkX = Math.floor(b.minLng / chunkSize);
          const endChunkX = Math.floor(b.maxLng / chunkSize);
          const startChunkY = Math.floor(b.minLat / chunkSize);
          const endChunkY = Math.floor(b.maxLat / chunkSize);

          for (let x = startChunkX; x <= endChunkX; x++) {
            for (let y = startChunkY; y <= endChunkY; y++) {
              chunksToFetch.add(`chunk_${x}_${y}`);
            }
          }

          const promises = Array.from(chunksToFetch).map((chunkId) =>
            fetch(`/Objects_By_Chunks/${chunkId}.json`).then((res) =>
              res.ok ? res.json() : Promise.resolve([])
            )
          );

          Promise.all(promises).then((results) => {
            const allObjectsInChunks = results.flat();
            const finalResults = allObjectsInChunks.filter(
              (obj: MapObject) =>
                obj.lng >= b.minLng &&
                obj.lng <= b.maxLng &&
                obj.lat >= b.minLat &&
                obj.lat <= b.maxLat
            );
            setAreaSearchResults(finalResults);
          });

          setIsObjectAreaSearch(false);
          return;
        }

        if (!questJson) return;
        const next = produce(questJson, (draft) => {
          const step = draft.questSteps[selectedStep];
          if (!step) return;
          step.floor = floor;
          const highlightTarget = step.highlights[targetType][targetIndex];
          if (!highlightTarget) return;

          if (captureMode === "single") {
            if (targetType === "npc") {
              (highlightTarget as any).npcLocation = snappedCoord;
            }
          } else if (captureMode === "multi-point") {
            if (targetType === "object") {
              const current = (highlightTarget as any).objectLocation || [];
              const isDuplicate = current.some(
                (loc: { lat: number; lng: number }) =>
                  loc.lat === snappedCoord.lat && loc.lng === snappedCoord.lng
              );
              if (isDuplicate) return;
              const newPoint = handlers.handleAddObjectPointAt(snappedCoord);
              (highlightTarget as any).objectLocation = [...current, newPoint];
            }
          } else if (captureMode === "radius") {
            if (!firstCorner) {
              setFirstCorner(snappedCoord);
              return;
            }
            const finalMinLat = Math.min(firstCorner.lat, snappedCoord.lat);
            const finalMaxLat = Math.max(firstCorner.lat, snappedCoord.lat);
            const finalMinLng = Math.min(firstCorner.lng, snappedCoord.lng);
            const finalMaxLng = Math.max(firstCorner.lng, snappedCoord.lng);
            const payload = {
              bottomLeft: { lat: finalMinLat, lng: finalMinLng },
              topRight: { lat: finalMaxLat, lng: finalMaxLng },
            };
            const radiusKey =
              targetType === "npc" ? "wanderRadius" : "objectRadius";
            (highlightTarget as any)[radiusKey] = payload;
            setFirstCorner(null);
            setCaptureMode(targetType === "object" ? "multi-point" : "single");
          } else if (captureMode === "wanderRadius") {
            if (targetType === "npc") {
              const radius = wanderRadiusInput;
              (highlightTarget as any).npcLocation = snappedCoord;
              (highlightTarget as any).wanderRadius = {
                bottomLeft: {
                  lat: snappedCoord.lat - radius,
                  lng: snappedCoord.lng - radius,
                },
                topRight: {
                  lat: snappedCoord.lat + radius,
                  lng: snappedCoord.lng + radius,
                },
              };
            }
            setCaptureMode("single");
          }
        });
        setQuestJson(next);
        setJsonString(JSON.stringify(next, null, 2));
      },
    });
    return null;
  };

  const layers = useMemo(
    () => [
      {
        name: "Topdown",
        url: `https://runeapps.org/s3/map4/live/topdown-${floor}/{z}/{x}-{y}.webp`,
        tileSize: 512,
        maxNativeZoom: 5,
        minZoom: -4,
        opacity: 0.8,
        className: "map-topdown",
        updateWhenZooming: false,
        updateInterval: 100,
        keepBuffer: 100,
        updateWhenIdle: true,
      },
      {
        name: "Walls",
        url: `https://runeapps.org/s3/map4/live/walls-${floor}/{z}/{x}-{y}.svg`,
        tileSize: 512,
        maxNativeZoom: 3,
        minNativeZoom: 3,
        updateWhenIdle: true,
        minZoom: -4,
        opacity: 0.6,
        className: "map-walls",
        updateInterval: 50,
        keepBuffer: 100,
      },
      {
        name: "Collision",
        url: `https://runeapps.org/s3/map4/live/collision-${floor}/{z}/{x}-{y}.png`,
        tileSize: 512,
        maxNativeZoom: 3,
        minNativeZoom: 3,
        updateWhenIdle: true,
        minZoom: -4,
        opacity: 0.6,
        className: "map-collision",
        updateInterval: 100,
        keepBuffer: 100,
      },
    ],
    [floor]
  );

  const toggleShowGrids = () => setShowGrids((prev) => !prev);

  async function handleRecordNpcLocation() {
    const step = questJson?.questSteps?.[selectedStep];
    if (!step || targetType !== "npc") return;

    const t = step.highlights.npc?.[targetIndex] as
      | {
          id?: number;
          npcName: string;
          npcLocation?: { lat: number; lng: number };
        }
      | undefined;
    if (!t || !t.id || !t.npcLocation) return;

    const coord = { lat: t.npcLocation.lat, lng: t.npcLocation.lng, floor };
    try {
      await recordNpcLocation(t.id, t.npcName || "Unknown", coord);
      alert("NPC location recorded to DB.");
    } catch (e) {
      console.error(e);
      alert("Failed to record NPC location. See console for details.");
    }
  }
  async function handleSaveEditsToIDB() {
    if (!questJson) {
      alert("No quest loaded.");
      return;
    }
    // Include current images from questJson.questImages
    const normalized = questToBundle(questJson);
    await saveActiveBundle(normalized);
    alert("Edits saved locally (IndexedDB).");
  }

  async function handlePublishEdits(adminToken?: string) {
    // Ask for admin token if not provided
    const token =
      adminToken ??
      prompt("Enter admin token (x-admin-token) to publish:") ??
      "";
    if (!token) return;

    // Use in-memory quest if available; otherwise try IDB active bundle
    let normalized = questJson ? questToBundle(questJson) : null;

    if (!normalized) {
      // Fallback: load last saved working copy
      const active = await loadActiveBundle().catch(() => null);
      if (!active) {
        alert("Nothing to publish. Load a quest or save edits first.");
        return;
      }
      normalized = active;
    }

    try {
      await saveQuestBundle(normalized as any, token);
      await saveActiveBundle(normalized);
      alert("Published to server and updated local working copy.");
    } catch (e) {
      console.error(e);
      alert("Publish failed. See console for details.");
    }
  }
  const handleReorderQuestImage = (from: number, to: number) => {
    if (!questJson) return;

    const list = (questJson.questImages ?? []).slice();
    if (from < 0 || from >= list.length) return;
    if (to < 0 || to >= list.length) return;

    // Reorder
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);

    const recomputed = list.map((img, idx) => {
      const stepNumber = idx + 1;
      const stepDesc =
        questJson.questSteps?.[idx]?.stepDescription ??
        img.stepDescription ??
        "";
      return {
        ...img,
        step: stepNumber,
        stepDescription: stepDesc,
      };
    });

    const updated = { ...questJson, questImages: recomputed };
    setQuestJson(updated);
    setJsonString(JSON.stringify(updated, null, 2));

    const normalized = questToBundle(updated);
    void saveActiveBundle(normalized);
  };
  return (
    <div style={{ height: "100%", width: "100%" }}>
      <EditorPanel
        onSaveEditsToIDB={handleSaveEditsToIDB}
        onPublishEdits={() => void handlePublishEdits()}
        canRecordNpcLocation={canRecordNpcLocation}
        onRecordNpcLocation={handleRecordNpcLocation}
        questJson={questJson}
        isOpen={isPanelOpen}
        onSubmitToGitHub={handleSubmitToGitHub}
        onResetRadius={handlers.handleResetRadius}
        itemsNeededValue={itemsNeededValue}
        onItemsNeededChange={(val) =>
          handlers.handleGenericArrayChange("itemsNeeded", val)
        }
        itemsRecommendedValue={itemsRecommendedValue}
        onItemsRecommendedChange={(val) =>
          handlers.handleGenericArrayChange("itemsRecommended", val)
        }
        additionalInfoValue={additionalInfoValue}
        onAdditionalInfoChange={(val) =>
          handlers.handleGenericArrayChange("additionalStepInformation", val)
        }
        wanderRadiusInput={wanderRadiusInput}
        onWanderRadiusInputChange={setWanderRadiusInput}
        onWanderRadiusCapture={() => setCaptureMode("wanderRadius")}
        onApplyRadius={() => handlers.handleApplyRadius(wanderRadiusInput)}
        jsonString={jsonString}
        onJsonChange={handlers.handleJsonTextChange}
        selectedStep={selectedStep}
        onStepChange={setSelectedStep}
        onStepIncrement={() =>
          setSelectedStep((s) =>
            Math.min(s + 1, (questJson?.questSteps.length || 1) - 1)
          )
        }
        onStepDecrement={() => setSelectedStep((s) => Math.max(s - 1, 0))}
        stepDescriptionValue={stepDescriptionValue}
        onStepDescriptionChange={handlers.handleStepDescriptionChange}
        targetNameValue={targetNameValue}
        onTargetNameChange={handlers.handleTargetNameChange}
        targetType={targetType}
        onTargetTypeChange={setTargetType}
        targetIndex={targetIndex}
        onTargetIndexChange={setTargetIndex}
        floor={floor}
        onDeleteObjectLocation={handlers.handleDeleteObjectLocation}
        selectedObjectColor={currentTargetObjectData.color}
        onSelectedObjectColorChange={(c) => {
          setSelectedObjectColor(c);
          handlers.handleSelectedObjectColorChange(c);
        }}
        objectNumberLabel={currentTargetObjectData.numberLabel}
        onObjectNumberLabelChange={(l) => {
          setObjectNumberLabel(l);
          handlers.handleObjectNumberLabelChange(l);
        }}
        onSetRadiusMode={() => setCaptureMode("radius")}
        onResetNpcLocation={handlers.handleResetNpcLocation}
        // Legacy file IO removed
        onFileLoadFromInput={() => {}}
        onLoadFile={() => {}}
        onSaveFile={() => {}}
        onSaveAsFile={() => {}}
        selectEditDescription={stepDescriptionEdit}
        onSelectEditStepDescription={() => setStepDescriptionEdit((p) => !p)}
        onAddNpc={handlers.handleAddNpc}
        onDeleteStep={handlers.handleDeleteStep}
        onFloorDecrement={() => handleFloorChange(floor - 1)}
        onFloorIncrement={() => handleFloorChange(floor + 1)}
        onAddStep={handlers.handleAddStep}
        onNewQuest={handlers.handleNewQuest}
        onAddObject={handlers.handleAddObject}
        onDeleteNpc={handlers.handleDeleteNpc}
        onDeleteObject={handlers.handleDeleteObject}
        onAddChatheadOverride={(name, url) => {
          const next = produce(chatheadOverrides, (draft) => {
            draft[name] = url;
          });
          setChatheadOverrides(next);
          setChatheadOverridesString(JSON.stringify(next, null, 2));
        }}
        onAddStepImage={handleAddStepImage}
        onSelectImageDirectory={async () => {
          try {
            const handle = await window.showDirectoryPicker();
            setImageDirectoryHandle(handle);
            console.log(`Image directory set to: ${handle.name}`);
          } catch (err) {
            console.error("Error selecting directory:", err);
          }
        }}
        imageDirectoryName={imageDirectoryHandle?.name || ""}
        onImagePaste={handleImagePaste}
        questImageList={questJson?.questImages ?? []}
        onQuestImageListChange={(next) => {
          if (!questJson) return;
          // update questJson
          const updated = { ...questJson, questImages: next };
          setQuestJson(updated);
          setJsonString(JSON.stringify(updated, null, 2));

          // persist to active bundle immediately
          const normalized = questToBundle(updated);
          void saveActiveBundle(normalized);
        }}
        onRemoveQuestImage={(index) => {
          if (!questJson) return;
          const next = questJson.questImages.slice();
          if (index < 0 || index >= next.length) return;
          next.splice(index, 1);
          const updated = { ...questJson, questImages: next };
          setQuestJson(updated);
          setJsonString(JSON.stringify(updated, null, 2));
          const normalized = questToBundle(updated);
          void saveActiveBundle(normalized);
        }}
        onReorderQuestImage={handleReorderQuestImage}
        isAlt1Environment={isAlt1Environment}
        clipboard={clipboard}
        onCopyTarget={handlers.handleCopyTarget}
        onPasteTarget={handlers.handlePasteTarget}
        onCopyTargetList={handlers.handleCopyTargetList}
        onPasteTargetList={handlers.handlePasteTargetList}
        onUpdateQuest={(q) => {
          setQuestJson(q);
          setJsonString(JSON.stringify(q, null, 2));
        }}
        onSaveMasterQuestFile={() => {}}
        onLoadMasterFile={() => {}}
        onSearchQuests={handleSearchQuests}
        onLoadQuestFromDb={handleLoadQuestFromDb}
        questSearchResults={questSearchResults}
        questSearchTotal={questSearchResults.length}
        questSearchLoading={questSearchLoading}
      >
        <div className="panel-section">
          <NpcSearch
            onNpcSelect={handleNpcSearchSelect}
            onNpcHighlight={handleNpcHighlight}
          />
        </div>
        <div className="panel-section">
          <ObjectSearch
            onObjectSelect={setSelectedObjectFromSearch}
            onObjectHighlight={handleObjectHighlight}
            isAreaSearchActive={isObjectAreaSearch}
            onToggleAreaSearch={setIsObjectAreaSearch}
            areaSearchResults={areaSearchResults}
            onClearAreaSearchResults={() => setAreaSearchResults([])}
          />
        </div>
        <div className="panel-section">
          <MapAreaSearch onAreaSelect={setSelectedArea} />
        </div>
        <div className="panel-section">
          <button
            onClick={async () => {
              const token = prompt("Enter admin token (x-admin-token):") ?? "";
              if (!token) return;
              await handleSaveQuestToDb(token);
              alert("Saved to DB");
            }}
          >
            Save to DB
          </button>
        </div>
      </EditorPanel>

      <button
        className={`panel-toggle-button ${isPanelOpen ? "is-open" : ""}`}
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        title={isPanelOpen ? "Collapse Panel" : "Expand Panel"}
      >
        {isPanelOpen ? "‹" : "›"}
      </button>

      <MapContainer
        crs={MAP_OPTIONS.crs}
        bounds={MAP_BOUNDS}
        id="map"
        zoom={z ? parseInt(z, 10) : MAP_OPTIONS.minZoom}
        maxBounds={MAP_OPTIONS.maxBounds}
        zoomSnap={MAP_OPTIONS.zoomSnap}
        zoomControl={false}
        dragging={true}
        center={[3288, 3023]}
      >
        <MapClickHandler disabled={false} />

        {showGrids && <ChunkGridLayer />}
        <GridLayer />
        <CustomMapPanes />

        <div className="grid-toggle-container">
          <button
            className="floor-button"
            onClick={toggleShowGrids}
            title="Toggle Grids"
          >
            <IconGridDots size={20} />
          </button>
        </div>

        <div className="floorButtonContainer">
          <button
            className="floor-button floor-button--up"
            onClick={() => handleFloorChange(floor + 1)}
          >
            ↑
          </button>
          <div className="floor-display">Floor {floor}</div>
          <button
            className="floor-button floor-button--down"
            onClick={() => handleFloorChange(floor - 1)}
          >
            ↓
          </button>
        </div>

        {layers.map((layer) => (
          <TileLayer
            key={layer.name}
            url={layer.url}
            tileSize={layer.tileSize}
            maxNativeZoom={layer.maxNativeZoom as any}
            minZoom={layer.minZoom as any}
            opacity={layer.opacity as any}
            className={layer.className}
            updateWhenZooming={(layer as any).updateWhenZooming}
            updateInterval={layer.updateInterval as any}
            noWrap={true}
            bounds={MAP_BOUNDS}
          />
        ))}

        <MapAreaFlyToHandler selectedArea={selectedArea} />
        <StepSnapHandler
          questJson={questJson as any}
          selectedStep={selectedStep}
          targetIndex={targetIndex}
          targetType={targetType}
          onFloorChange={handleFloorChange}
        />
        <TargetFlyToHandler
          questJson={questJson as any}
          selectedStep={selectedStep}
          targetType={targetType}
          targetIndex={targetIndex}
          floor={floor}
          onFloorChange={handleFloorChange}
        />
        <NpcFlyToHandler
          highlightedNpc={highlightedNpc}
          onFloorChange={handleFloorChange}
        />
        <ObjectFlyToHandler highlightedObject={highlightedObject} />
        <SelectedObjectFlyToHandler selectedObject={selectedObjectFromSearch} />
        <SelectionHighlightLayer
          geometry={selectionGeometry}
          pane="selectionPane"
        />
        <SelectionHighlightLayer
          geometry={highlightGeometry}
          pane="highlightPane"
        />
        <MapUIOverlay />
      </MapContainer>
    </div>
  );
};

export default App;
