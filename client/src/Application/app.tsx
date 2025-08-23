import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import {
  parseWikiImageUrl,
  resizeImage,
  resizeImageBlob,
} from "Map Classes/Map Components/imageUtils";
import "leaflet/dist/leaflet.css";
import "./../Assets/CSS/index.css";
import "./../Assets/CSS/leafless.css";
import { LatLngBounds } from "leaflet";
import {
  bounds,
  gameMapOptions,
  HandleFloorIncreaseDecrease,
} from "./../Map Classes/MapFunctions";
import GridLayer from "./../Map Classes/Map Components/GridLayerComponent";
import HighlightLayer from "./../Map Classes/Map Components/TileHighlighting";
import { useParams } from "react-router-dom";
import { useSocket } from "./../Entrance/Entrance Components/SocketProvider";
import ChunkGridLayer from "Map Classes/Map Components/ChunkGrid";
import { EditorPanel } from "./../Map Classes/Map Components/DeveloperControls";
import { produce } from "immer";
import StepSnapHandler from "Map Classes/Map Components/StepSnapHandler";
import { SelectionHighlightLayer } from "./../Map Classes/Map Components/SelectionHighlightLayer";
import type { SelectionGeometry } from "./../Map Classes/Map Components/SelectionHighlightLayer";
import { IconSettings } from "@tabler/icons-react";
import { NpcSearch } from "Map Classes/Map Components/NpcSearch";
import type { Npc } from "./../Map Classes/Map Components/NpcSearch";
import NpcFlyToHandler from "./../Map Classes/Map Components/NpcFlyToHandler";
import MapAreaLayer from "Map Classes/Map Components/MapAreaLayer";
import { MapAreaSearch } from "./../Map Classes/Map Components/MapAreaSearch";
import MapAreaFlyToHandler from "./../Map Classes/Map Components/MapAreaFlyToHandler";
interface QuestData {
  questName: string;
  questSteps: any[];
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
interface MapArea {
  mapId: number;
  bounds: [[number, number], [number, number]];
  center: [number, number];
  name: string;
}
type FileSystemFileHandle = any;

const App: React.FC = () => {
  const { UserID, QuestName, level, z, x, y } = useParams<{
    UserID: string;
    QuestName: string;
    level: string;
    z: string;
    x: string;
    y: string;
  }>();
  let socket = useSocket();

  // --- STATE ---
  const [selectedArea, setSelectedArea] = useState<MapArea | null>(null);
  const [highlightedNpc, setHighlightedNpc] = useState<Npc | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [selectedObjectColor, setSelectedObjectColor] = useState("#00FF00");
  const [floor, setFloor] = useState(level ? parseInt(level, 10) : 0);
  const [zoom, setZoom] = useState(z ? parseInt(z, 10) : 2);
  const [cursorX, setCursorX] = useState(x ? parseInt(x, 10) : 3288);
  const [cursorY, setCursorY] = useState(y ? parseInt(y, 10) : 3023);
  const [questJson, setQuestJson] = useState<QuestData | null>(null);
  const [jsonString, setJsonString] = useState("");
  const [selectedStep, setSelectedStep] = useState(0);
  const [targetType, setTargetType] = useState<"npc" | "object">("npc");
  const [targetIndex, setTargetIndex] = useState(0);
  const [captureMode, setCaptureMode] = useState("single");
  const [firstCorner, setFirstCorner] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [wanderRadiusInput, setWanderRadiusInput] = useState(5);
  const [objectNumberLabel, setObjectNumberLabel] = useState("");
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(
    null
  );
  const [stepDescriptionEdit, setStepDescriptionEdit] =
    useState<boolean>(false);
  const [chatheadOverrides, setChatheadOverrides] = useState<ChatheadOverrides>(
    {}
  );
  const [isAlt1Environment, setIsAlt1Environment] = useState(false);
  // --- FIX: Initialize state with the correct QuestImageFile[] type ---
  const [questImageList, setQuestImageList] = useState<QuestImageFile[]>([]);

  const [chatheadOverridesString, setChatheadOverridesString] = useState("");
  const [questImageListString, setQuestImageListString] = useState("");

  // --- NEW: State for file and directory handles ---
  const [chatheadOverridesFileHandle, setChatheadOverridesFileHandle] =
    useState<FileSystemFileHandle | null>(null);
  const [questImageListFileHandle, setQuestImageListFileHandle] =
    useState<FileSystemFileHandle | null>(null);
  const [imageDirectoryHandle, setImageDirectoryHandle] = useState<any | null>(
    null
  ); // Directory handle

  // --- DERIVED VALUES ---
  const selectionGeometry = useMemo<SelectionGeometry>(() => {
    // Guard against incomplete questJson
    if (!questJson?.questSteps?.[selectedStep]) return { type: "none" };

    const step = questJson.questSteps[selectedStep];

    if (targetType === "npc") {
      return { type: "npc", npcArray: step.highlights?.npc || [] };
    } else if (targetType === "object") {
      return { type: "object", objectArray: step.highlights?.object || [] };
    }
    return { type: "none" };
  }, [questJson, selectedStep, targetType]);

  const highlightGeometry = useMemo<SelectionGeometry>(() => {
    if (!highlightedNpc) {
      return { type: "none" };
    }
    // Create a geometry object for the single highlighted NPC
    return {
      type: "npc",
      npcArray: [
        {
          npcName: highlightedNpc.name,
          npcLocation: { lat: highlightedNpc.lat, lng: highlightedNpc.lng },
          wanderRadius: {
            bottomLeft: { lat: 0, lng: 0 },
            topRight: { lat: 0, lng: 0 },
          },
        },
      ],
    };
  }, [highlightedNpc]);

  const targetNameValue = useMemo(() => {
    // Guard against incomplete questJson
    if (!questJson?.questSteps?.[selectedStep]) return "";

    const target =
      questJson.questSteps[selectedStep]?.highlights[targetType]?.[targetIndex];
    if (!target) return "";
    return targetType === "npc" ? target.npcName || "" : target.name || "";
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

  const currentTargetObjectData = useMemo(() => {
    // Guard against incomplete questJson
    if (!questJson?.questSteps?.[selectedStep]) {
      return { color: selectedObjectColor, numberLabel: objectNumberLabel };
    }

    if (targetType === "object") {
      const target =
        questJson.questSteps[selectedStep]?.highlights.object?.[targetIndex];
      return {
        color: target?.color || selectedObjectColor,
        numberLabel: target?.numberLabel || "",
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

  // --- EFFECTS ---
  //THIS IS THE SINGLE SOURCE OF TRUTH FOR STEP CHANGES
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
  }, [selectedStep]);
  useEffect(() => {
    if (window.alt1) {
      console.log("Alt1 environment detected. Disabling direct save buttons.");
      setIsAlt1Environment(true);
    }
  }, []);
  useEffect(() => {
    if (!questJson) return;
    const step = questJson.questSteps[selectedStep];
    if (!step) return;

    const arr = step.highlights?.[targetType] || [];
    if (targetIndex >= arr.length) {
      setTargetIndex(Math.max(0, arr.length - 1));
    }
  }, [questJson, selectedStep, targetType, targetIndex]);
  useEffect(() => {
    if (targetType === "object") {
      setCaptureMode("multi-point");
    } else {
      setCaptureMode("single");
    }
  }, [targetType]);

  // --- HANDLERS ---

  // --- NEW: Generic download fallback function ---
  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = fileName;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert(
      `Direct save failed. Downloading ${fileName} instead. Please save it to the correct location.`
    );
  };

  // --- REVISED: Generic file save function with fallback ---
  const saveContentToFileHandle = async (
    handle: FileSystemFileHandle | null,
    content: string,
    fileName: string // Pass filename for the fallback
  ) => {
    const blob = new Blob([content], { type: "application/json" });
    if (!handle) {
      downloadBlob(blob, fileName);
      return;
    }
    try {
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } catch (err) {
      console.error("Direct save failed, falling back to download:", err);
      downloadBlob(blob, fileName);
    }
  };

  // --- REVISED: Chathead save handler ---
  const handleSaveChatheadOverrides = () => {
    saveContentToFileHandle(
      chatheadOverridesFileHandle,
      chatheadOverridesString,
      "chatheadOverrides.json"
    );
  };

  // --- REVISED: Image list save handler ---
  const handleSaveQuestImageList = () => {
    saveContentToFileHandle(
      questImageListFileHandle,
      questImageListString,
      "QuestImageList.json"
    );
  };
  const handleSaveChatheadOverridesAs = () => {
    const blob = new Blob([chatheadOverridesString], {
      type: "application/json",
    });
    downloadBlob(blob, "chatheadOverrides.json");
  };

  const handleSaveQuestImageListAs = () => {
    const blob = new Blob([questImageListString], {
      type: "application/json",
    });
    downloadBlob(blob, "QuestImageList.json");
  };
  // --- REVISED: Core image processing function with fallback ---
  const processAndSaveImage = async (imageBlob: Blob) => {
    if (!questJson) {
      alert("Please load a quest first.");
      return;
    }
    if (!imageDirectoryHandle) {
      alert("Please select an image save directory first.");
      return;
    }

    try {
      const {
        blob: resizedBlob,
        width,
        height,
      } = await resizeImageBlob(imageBlob, 512);
      const stepDescription =
        questJson.questSteps[selectedStep]?.stepDescription;
      if (!stepDescription) {
        alert("Current step has no description to link the image to.");
        return;
      }

      const fileName = `${questJson.questName}_step_${selectedStep + 1}.webp`;

      // --- TRY direct save, CATCH to download ---
      try {
        const fileHandle = await imageDirectoryHandle.getFileHandle(fileName, {
          create: true,
        });
        const writable = await fileHandle.createWritable();
        await writable.write(resizedBlob);
        await writable.close();
      } catch (err) {
        console.error(
          "Direct image save failed, falling back to download:",
          err
        );
        downloadBlob(resizedBlob, fileName);
      }
      // --- End of save logic ---

      const imagePath = `${fileName}`;

      const nextState = produce(questImageList, (draft: QuestImageFile[]) => {
        let questEntry = draft.find((q) => q.name === questJson.questName);
        const newImageObject: QuestImageData = {
          step: selectedStep + 1,
          src: imagePath,
          height,
          width,
          stepDescription,
        };

        if (questEntry) {
          const existingImageIndex = questEntry.images.findIndex(
            (img) => img.stepDescription === stepDescription
          );
          if (existingImageIndex > -1) {
            questEntry.images[existingImageIndex] = newImageObject;
          } else {
            questEntry.images.push(newImageObject);
          }
        } else {
          draft.push({
            name: questJson.questName,
            images: [newImageObject],
          });
        }
      });

      setQuestImageList(nextState);
      const newString = JSON.stringify(nextState, null, 2);
      setQuestImageListString(newString);
      // Auto-save the JSON file (which now also has a fallback)
      saveContentToFileHandle(
        questImageListFileHandle,
        newString,
        "QuestImageList.json"
      );
    } catch (error) {
      console.error("Failed to process and save image:", error);
      alert(`Failed to process image. See console for details.`);
    }
  };

  // This is the new handler for the paste component
  const handleImagePaste = async (pastedBlob: Blob) => {
    await processAndSaveImage(pastedBlob);
  };

  // This is the UPDATED handler for the URL input
  const handleAddStepImage = async (url: string) => {
    if (!url) return;
    try {
      // Fetch the URL to get a blob, then process it
      const response = await fetch(parseWikiImageUrl(url));
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const imageBlob = await response.blob();
      await processAndSaveImage(imageBlob);
    } catch (error) {
      console.error("Failed to add step image from URL:", error);
      alert(`Failed to add step image from URL. See console for details.`);
    }
  };

  // --- Chathead override handlers ---
  const handleLoadChatheadOverrides = async () => {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: "JSON Files",
            accept: { "application/json": [".json"] },
          },
        ],
      });
      const file = await handle.getFile();
      const text = await file.text();
      setChatheadOverrides(JSON.parse(text));
      setChatheadOverridesString(text);
      setChatheadOverridesFileHandle(handle);
    } catch (err) {
      console.error("Error loading chathead overrides:", err);
    }
  };

  const handleAddChatheadOverride = (name: string, url: string) => {
    if (!name || !url) return;
    const nextState = produce(chatheadOverrides, (draft) => {
      draft[name] = url;
    });
    setChatheadOverrides(nextState);
    const newString = JSON.stringify(nextState, null, 2);
    setChatheadOverridesString(newString);
    saveContentToFileHandle(
      chatheadOverridesFileHandle,
      newString,
      "chatheadOverrides.json"
    );
  };

  // --- Quest image list handlers ---
  const handleLoadQuestImageList = async () => {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: "JSON Files",
            accept: { "application/json": [".json"] },
          },
        ],
      });
      const file = await handle.getFile();
      const text = await file.text();
      setQuestImageList(JSON.parse(text));
      setQuestImageListString(text);
      setQuestImageListFileHandle(handle);
    } catch (err) {
      console.error("Error loading quest image list:", err);
    }
  };

  const handleSelectImageDirectory = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setImageDirectoryHandle(handle);
      alert(`Image directory set to: ${handle.name}`);
    } catch (err) {
      console.error("Error selecting directory:", err);
    }
  };

  const handleDeleteNpc = () => {
    if (!questJson || targetType !== "npc") return;

    const nextState = produce(questJson, (draft) => {
      const step = draft.questSteps[selectedStep];
      if (!step?.highlights?.npc) return;

      // Remove the NPC at targetIndex
      step.highlights.npc.splice(targetIndex, 1);

      // Clamp targetIndex so it doesn’t go out of range
      if (targetIndex >= step.highlights.npc.length) {
        setTargetIndex(Math.max(0, step.highlights.npc.length - 1));
      }
    });

    updateQuestState(nextState);
  };

  const handleDeleteObject = () => {
    if (!questJson || targetType !== "object") return;

    const nextState = produce(questJson, (draft) => {
      const step = draft.questSteps[selectedStep];
      if (!step?.highlights?.object) return;

      // Remove the Object at targetIndex
      step.highlights.object.splice(targetIndex, 1);

      // Clamp targetIndex so it doesn’t go out of range
      if (targetIndex >= step.highlights.object.length) {
        setTargetIndex(Math.max(0, step.highlights.object.length - 1));
      }
    });

    updateQuestState(nextState);
  };
  const handleSelectedObjectColorChange = (newColor: string) => {
    setSelectedObjectColor(newColor);
    if (questJson && targetType === "object") {
      const nextState = produce(questJson, (draft) => {
        const target =
          draft.questSteps[selectedStep]?.highlights.object?.[targetIndex];
        if (target) {
          target.color = newColor;
        }
      });
      updateQuestState(nextState);
    }
  };

  const handleObjectNumberLabelChange = (newLabel: string) => {
    setObjectNumberLabel(newLabel);
    if (questJson && targetType === "object") {
      const nextState = produce(questJson, (draft) => {
        const target =
          draft.questSteps[selectedStep]?.highlights.object?.[targetIndex];
        if (target) {
          target.numberLabel = newLabel;
        }
      });
      updateQuestState(nextState);
    }
  };
  const handleFloorChange = useCallback(
    (newFloor: number) => {
      if (HandleFloorIncreaseDecrease(newFloor)) {
        setFloor(newFloor);
        if (!questJson) return;
        const nextState = produce(questJson, (draft) => {
          const step = draft.questSteps[selectedStep];
          if (step) {
            step.floor = newFloor;
          }
        });
        updateQuestState(nextState);
      }
    },
    [questJson, selectedStep]
  );
  const handleNpcSearchSelect = (chosenNpc: Npc) => {
    if (!questJson) return;

    const nextState = produce(questJson, (draft) => {
      const target =
        draft.questSteps[selectedStep]?.highlights.npc?.[targetIndex];
      if (target) {
        target.npcName = chosenNpc.name;
        target.npcLocation = { lat: chosenNpc.lat, lng: chosenNpc.lng };
        // Also update the step's floor to match the NPC's floor
        draft.questSteps[selectedStep].floor = chosenNpc.floor;
      }
    });

    updateQuestState(nextState);
    setHighlightedNpc(null); // Clear the temporary highlight
  };

  // This function's only job is to set the state.
  const handleNpcHighlight = (npc: Npc | null) => {
    setHighlightedNpc(npc);
  };
  const handleNewQuest = () => {
    const newQuestTemplate: QuestData = {
      questName: "New Quest",
      questSteps: [
        {
          stepDescription: "This is the first step of your new quest.",
          itemsNeeded: [],
          itemsRecommended: [],
          additionalStepInformation: [],
          highlights: {
            npc: [
              {
                npcName: "",
                npcLocation: {
                  lat: 0,
                  lng: 0,
                },
                wanderRadius: {
                  bottomLeft: {
                    lat: 0,
                    lng: 0,
                  },
                  topRight: {
                    lat: 0,
                    lng: 0,
                  },
                },
              },
            ],
            object: [
              {
                name: "",
                objectLocation: [],
                objectRadius: {
                  bottomLeft: {
                    lat: 0,
                    lng: 0,
                  },
                  topRight: {
                    lat: 0,
                    lng: 0,
                  },
                },
              },
            ],
          },
          floor: 0,
        },
      ],
    };
    updateQuestState(newQuestTemplate);
    setSelectedStep(0);
    setTargetIndex(0);
    setTargetType("npc");
    setFileHandle(null); // This is an unsaved file
  };
  const handleAddObject = () => {
    if (!questJson) return;
    let newIndex = 0;
    const nextState = produce(questJson, (draft) => {
      const step = draft.questSteps[selectedStep];
      if (!step.highlights) step.highlights = {};
      if (!step.highlights.object) step.highlights.object = [];
      step.highlights.object.push({
        name: "New Object",
        objectLocation: [{ lat: 0, lng: 0 }], // ✅ always initialize
        objectRadius: {
          bottomLeft: { lat: 0, lng: 0 },
          topRight: { lat: 0, lng: 0 },
        },
      });
      newIndex = step.highlights.object.length - 1;
    });
    updateQuestState(nextState);
    setTargetType("object");
    setTargetIndex(newIndex); // ✅ jump to the new object
  };
  const handleAddStep = () => {
    if (!questJson) return;
    const newStepObject = {
      stepDescription: "New step description...",
      itemsNeeded: [],
      itemsRecommended: [],
      additionalStepInformation: [],
      highlights: {
        npc: [
          {
            npcName: "",
            npcLocation: {
              lat: 0,
              lng: 0,
            },
            wanderRadius: {
              bottomLeft: {
                lat: 0,
                lng: 0,
              },
              topRight: {
                lat: 0,
                lng: 0,
              },
            },
          },
        ],
        object: [
          {
            name: "",
            objectLocation: [
              {
                lat: 0,
                lng: 0,
              },
            ],
            objectRadius: {
              bottomLeft: {
                lat: 0,
                lng: 0,
              },
              topRight: {
                lat: 0,
                lng: 0,
              },
            },
          },
        ],
      },
      floor: floor, // Default to the current floor
    };
    const nextState = produce(questJson, (draft) => {
      draft.questSteps.splice(selectedStep + 1, 0, newStepObject);
    });
    updateQuestState(nextState);
    setSelectedStep(selectedStep + 1); // Jump to the new step
  };
  const handleSubmitToGitHub = async () => {
    if (!questJson) {
      return;
    }

    try {
      const response = await fetch("http://localhost:42069/api/submit-pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userID: UserID || "anonymous-user",
          questJson: questJson,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        window.open(data.prUrl, "_blank"); // Open the PR in a new tab
      } else {
        throw new Error(data.error || "An unknown error occurred.");
      }
    } catch (err: any) {
      console.error("Failed to submit PR:", err);
    }
  };
  const updateQuestState = (newQuestState: QuestData) => {
    setQuestJson(newQuestState);
    setJsonString(JSON.stringify(newQuestState, null, 2));
  };
  const handleDeleteStep = () => {
    if (!questJson || questJson.questSteps.length <= 1) {
      return;
    }

    const nextState = produce(questJson, (draft) => {
      // Remove one element at the current selectedStep index
      draft.questSteps.splice(selectedStep, 1);
    });

    updateQuestState(nextState);

    // Adjust the selectedStep index if we deleted the last item in the array
    if (selectedStep >= nextState.questSteps.length) {
      setSelectedStep(nextState.questSteps.length - 1);
    }
  };
  const handleSetRadiusMode = () => setCaptureMode("radius");
  const handleJsonTextChange = (text: string) => {
    setJsonString(text);
    try {
      const parsed = JSON.parse(text);
      setQuestJson(parsed);
    } catch (error) {
      /* ignore invalid json */
    }
  };
  const handleAreaSelect = (area: MapArea) => {
    setSelectedArea(area);
  };
  const handleStepDescriptionView = () =>
    setStepDescriptionEdit((prev) => !prev);

  const handleStepIncrement = () => {
    if (!questJson) return;
    const newStepIndex = Math.min(
      selectedStep + 1,
      questJson.questSteps.length - 1
    );
    if (newStepIndex !== selectedStep) {
      const newStepData = questJson.questSteps[newStepIndex];
      setFloor(newStepData.floor ?? 0); // ✅ Sync floor view to new step's data
      setSelectedStep(newStepIndex);
    }
  };

  const handleStepDecrement = () => {
    if (!questJson) return;
    const newStepIndex = Math.max(selectedStep - 1, 0);
    if (newStepIndex !== selectedStep) {
      const newStepData = questJson.questSteps[newStepIndex];
      setFloor(newStepData.floor ?? 0); // ✅ Sync floor view to new step's data
      setSelectedStep(newStepIndex);
    }
  };

  const handleStepDescriptionChange = (newDescription: string) => {
    if (!questJson) return;
    const nextState = produce(questJson, (draft) => {
      draft.questSteps[selectedStep].stepDescription = newDescription;
    });
    updateQuestState(nextState);
  };

  const handleGenericArrayChange = (
    field: "itemsNeeded" | "itemsRecommended" | "additionalStepInformation",
    value: string
  ) => {
    if (!questJson) return;
    const itemsArray = value.split("\n");
    const nextState = produce(questJson, (draft) => {
      draft.questSteps[selectedStep][field] = itemsArray;
    });
    updateQuestState(nextState);
  };

  const handleTargetNameChange = (newName: string) => {
    if (!questJson) return;
    const nextState = produce(questJson, (draft) => {
      const step = draft.questSteps[selectedStep];
      if (!step.highlights) return;
      if (!step.highlights[targetType]) return;

      const target = step.highlights[targetType][targetIndex];
      if (!target) return; // ✅ Don’t create a new one here

      if (targetType === "npc") {
        target.npcName = newName;
      } else {
        target.name = newName;
      }
    });
    updateQuestState(nextState);
  };

  const handleAddNpc = () => {
    if (!questJson) return;
    const nextState = produce(questJson, (draft) => {
      const step = draft.questSteps[selectedStep];
      if (!step.highlights) step.highlights = {};
      if (!step.highlights.npc) step.highlights.npc = [];
      step.highlights.npc.push({
        npcName: "New NPC",
        npcLocation: { lat: 0, lng: 0 },
        wanderRadius: {
          bottomLeft: { lat: 0, lng: 0 },
          topRight: { lat: 0, lng: 0 },
        },
      });
      setTargetIndex(step.highlights.npc.length - 1);
      setTargetType("npc");
    });
    updateQuestState(nextState);
  };

  const handleResetNpcLocation = () => {
    if (!questJson || targetType !== "npc") return;
    const nextState = produce(questJson, (draft) => {
      const target =
        draft.questSteps[selectedStep]?.highlights.npc?.[targetIndex];
      if (target) {
        target.npcLocation = { lat: 0, lng: 0 };
      }
    });
    updateQuestState(nextState);
  };

  const handleWanderRadiusCapture = () => {
    setCaptureMode("wanderRadius");
  };

  const handleApplyRadius = () => {
    if (!questJson || targetType !== "npc") return;

    const target =
      questJson.questSteps[selectedStep].highlights.npc[targetIndex];
    const center = target?.npcLocation;

    if (!center || (center.lat === 0 && center.lng === 0)) {
      return;
    }

    const radius = wanderRadiusInput;
    const nextState = produce(questJson, (draft) => {
      const draftTarget =
        draft.questSteps[selectedStep].highlights.npc[targetIndex];
      draftTarget.wanderRadius = {
        bottomLeft: { lat: center.lat - radius, lng: center.lng - radius },
        topRight: { lat: center.lat + radius, lng: center.lng + radius },
      };
    });
    updateQuestState(nextState);
  };
  const handleResetRadius = () => {
    if (!questJson) return;

    const nextState = produce(questJson, (draft) => {
      const target =
        draft.questSteps[selectedStep].highlights[targetType][targetIndex];
      if (!target) return;

      const emptyRadius = {
        bottomLeft: { lat: 0, lng: 0 },
        topRight: { lat: 0, lng: 0 },
      };

      if (targetType === "npc") {
        target.wanderRadius = emptyRadius;
      } else {
        target.objectRadius = emptyRadius;
      }
    });
    updateQuestState(nextState);
  };

  const handleClearObjectLocations = () => {
    if (!questJson || targetType !== "object") return;
    const nextState = produce(questJson, (draft) => {
      const target =
        draft.questSteps[selectedStep].highlights.object[targetIndex];
      if (target) {
        target.objectLocation = [];
      }
    });
    updateQuestState(nextState);
  };

  const handleFloorIncrement = () => handleFloorChange(floor + 1);
  const handleFloorDecrement = () => handleFloorChange(floor - 1);
  const handleDataCaptured = (data: any) => {
    if (!questJson) return;
    const nextState = produce(questJson, (draft) => {
      const step = draft.questSteps[selectedStep];
      if (!step) return;
      step.floor = floor;
      const highlightTarget = step.highlights[targetType][targetIndex];
      if (!highlightTarget) return;

      if (data.type === "single") {
        if (targetType === "npc") {
          highlightTarget.npcLocation = data.payload;
        }
      } else if (data.type === "multi-point") {
        if (targetType === "object") {
          // Save the location array
          highlightTarget.objectLocation = data.payload;
          // ALSO save the color and number to the parent object
          highlightTarget.color = selectedObjectColor;
          highlightTarget.numberLabel = objectNumberLabel;
        }
      } else if (data.type === "radius") {
        const radiusKey =
          targetType === "npc" ? "wanderRadius" : "objectRadius";
        highlightTarget[radiusKey] = data.payload;
      } else if (data.type === "wanderRadius") {
        if (targetType === "npc") {
          highlightTarget.npcLocation = data.payload.center;
          highlightTarget.wanderRadius = data.payload.wanderRadius;
        }
      }
    });
    updateQuestState(nextState);
  };
  // --- FILE HANDLERS ---
  const handleFileLoadFromInput = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        handleJsonTextChange(text);
        setFileHandle(null);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadFile = async () => {
    if ("showOpenFilePicker" in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: "JSON Files",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        const file = await handle.getFile();
        const text = await file.text();
        handleJsonTextChange(text);
        setFileHandle(handle);
      } catch (err) {
        console.error("User cancelled the file open dialog.");
      }
    } else {
      document.getElementById("json-file-loader")?.click();
    }
  };

  const handleSaveFile = async () => {
    // If there's no file handle, we must use "Save As".
    if (!fileHandle) {
      handleSaveAsFile();
      return;
    }

    // This is the modern API that fails in Alt1.
    // Will Fail in Alt1 but Succeed in regular browsers
    try {
      const writable = await fileHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();
      alert(`Saved changes to ${fileHandle.name}`);
    } catch (err) {
      // This catch block will execute when the DOMException occurs in Alt1.
      console.error(
        "File System Access API failed, falling back to download:",
        err
      );

      handleSaveAsFile();
    }
  };

  const handleSaveAsFile = () => {
    if (!questJson) return;
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = questJson.questName
      ? `${questJson.questName.replace(/\s+/g, "_")}.json`
      : "quest_data.json";
    link.download = fileName;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- MAP COMPONENTS ---
  const snapToTileCoordinate = (latlng: L.LatLng) => {
    const visualCenterX = Math.floor(latlng.lng - 0.5) + 0.5;
    const visualCenterY = Math.floor(latlng.lat + 0.5) - 0.5;
    const storedLng = visualCenterX - 0.5;
    const storedLat = visualCenterY + 0.5;
    return { lat: storedLat, lng: storedLng };
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        const snappedCoord = snapToTileCoordinate(e.latlng);

        switch (captureMode) {
          case "single":
            handleDataCaptured({ type: "single", payload: snappedCoord });
            break;
          case "multi-point":
            if (targetType === "object") {
              const currentLocations =
                questJson?.questSteps[selectedStep]?.highlights.object[
                  targetIndex
                ]?.objectLocation || [];
              const isDuplicate = currentLocations.some(
                (loc: { lat: number; lng: number }) =>
                  loc.lat === snappedCoord.lat && loc.lng === snappedCoord.lng
              );

              if (isDuplicate) {
                return;
              }

              // --- FIX #1: Create the new point with all necessary data ---
              const newPoint = {
                ...snappedCoord,
                color: selectedObjectColor,
                numberLabel: objectNumberLabel,
              };
              // -----------------------------------------------------------

              const newLocations = [...currentLocations, newPoint];
              handleDataCaptured({
                type: "multi-point",
                payload: newLocations,
              });
            }
            break;
          case "radius":
            if (!firstCorner) {
              setFirstCorner(snappedCoord);
              return;
            }
            const minLat = Math.min(firstCorner.lat, snappedCoord.lat);
            const maxLat = Math.max(firstCorner.lat, snappedCoord.lat);
            const minLng = Math.min(firstCorner.lng, snappedCoord.lng);
            const maxLng = Math.max(firstCorner.lng, snappedCoord.lng);

            const radiusPayload = {
              bottomLeft: { lat: minLat, lng: minLng },
              topRight: { lat: maxLat, lng: maxLng },
            };
            handleDataCaptured({ type: "radius", payload: radiusPayload });
            setFirstCorner(null);
            setCaptureMode(targetType === "object" ? "multi-point" : "single");
            break;
          case "wanderRadius":
            const radius = wanderRadiusInput;
            handleDataCaptured({
              type: "wanderRadius",
              payload: {
                center: snappedCoord,
                wanderRadius: {
                  bottomLeft: {
                    lat: snappedCoord.lat - radius,
                    lng: snappedCoord.lng - radius,
                  },
                  topRight: {
                    lat: snappedCoord.lat + radius,
                    lng: snappedCoord.lng + radius,
                  },
                },
              },
            });
            setCaptureMode("single");
            break;
        }
      },
    });
    return null;
  };

  const ZoomHandler = () => {
    const map = useMapEvents({ zoom: () => setZoom(map.getZoom()) });
    return null;
  };

  const handleCursorMove = useCallback((x: number, y: number) => {
    setCursorX(x - 0.5);
    setCursorY(y + 0.5);
  }, []);

  const bound: LatLngBounds = bounds();
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
        keepBuffer: 8,
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
        keepBuffer: 8,
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
        keepBuffer: 8,
      },
    ],
    [floor]
  );

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <EditorPanel
        questJson={questJson}
        isOpen={isPanelOpen}
        onSubmitToGitHub={handleSubmitToGitHub}
        onResetRadius={handleResetRadius}
        itemsNeededValue={itemsNeededValue}
        onItemsNeededChange={(val) =>
          handleGenericArrayChange("itemsNeeded", val)
        }
        itemsRecommendedValue={itemsRecommendedValue}
        onItemsRecommendedChange={(val) =>
          handleGenericArrayChange("itemsRecommended", val)
        }
        additionalInfoValue={additionalInfoValue}
        onAdditionalInfoChange={(val) =>
          handleGenericArrayChange("additionalStepInformation", val)
        }
        wanderRadiusInput={wanderRadiusInput}
        onWanderRadiusInputChange={setWanderRadiusInput}
        onWanderRadiusCapture={handleWanderRadiusCapture}
        onApplyRadius={handleApplyRadius}
        jsonString={jsonString}
        onJsonChange={handleJsonTextChange}
        selectedStep={selectedStep}
        onStepChange={setSelectedStep}
        onStepIncrement={handleStepIncrement}
        onStepDecrement={handleStepDecrement}
        stepDescriptionValue={stepDescriptionValue}
        onStepDescriptionChange={handleStepDescriptionChange}
        targetNameValue={targetNameValue}
        onTargetNameChange={handleTargetNameChange}
        targetType={targetType}
        onTargetTypeChange={setTargetType}
        targetIndex={targetIndex}
        onTargetIndexChange={setTargetIndex}
        floor={floor}
        onClearObjectLocations={handleClearObjectLocations}
        selectedObjectColor={currentTargetObjectData.color}
        onSelectedObjectColorChange={handleSelectedObjectColorChange}
        objectNumberLabel={currentTargetObjectData.numberLabel}
        onObjectNumberLabelChange={handleObjectNumberLabelChange}
        onSetRadiusMode={handleSetRadiusMode}
        onResetNpcLocation={handleResetNpcLocation}
        onFileLoadFromInput={handleFileLoadFromInput}
        onLoadFile={handleLoadFile}
        onSaveFile={handleSaveFile}
        onSaveAsFile={handleSaveAsFile}
        selectEditDescription={stepDescriptionEdit}
        onSelectEditStepDescription={handleStepDescriptionView}
        onAddNpc={handleAddNpc}
        onDeleteStep={handleDeleteStep}
        onFloorDecrement={handleFloorDecrement}
        onFloorIncrement={handleFloorIncrement}
        onAddStep={handleAddStep}
        onNewQuest={handleNewQuest}
        onAddObject={handleAddObject}
        onDeleteNpc={handleDeleteNpc}
        onDeleteObject={handleDeleteObject}
        onAddChatheadOverride={handleAddChatheadOverride}
        onAddStepImage={handleAddStepImage}
        onLoadChatheadOverrides={handleLoadChatheadOverrides}
        onSaveChatheadOverrides={handleSaveChatheadOverrides}
        onLoadQuestImageList={handleLoadQuestImageList}
        onSaveQuestImageList={handleSaveQuestImageList}
        onSelectImageDirectory={handleSelectImageDirectory}
        imageDirectoryName={imageDirectoryHandle?.name || ""}
        onImagePaste={handleImagePaste}
        onSaveChatheadOverridesAs={handleSaveChatheadOverridesAs}
        onSaveQuestImageListAs={handleSaveQuestImageListAs}
        isAlt1Environment={isAlt1Environment}
      >
        <div className="panel-section">
          <NpcSearch
            onNpcSelect={handleNpcSearchSelect}
            onNpcHighlight={handleNpcHighlight}
          />
        </div>
        <div className="panel-section">
          <MapAreaSearch onAreaSelect={handleAreaSelect} />
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
        crs={gameMapOptions().crs}
        bounds={bound}
        id="map"
        zoom={zoom}
        maxBounds={gameMapOptions().maxBounds}
        zoomSnap={gameMapOptions().zoomSnap}
        zoomControl={false}
        dragging={true}
        center={[3288, 3023]}
      >
        <MapClickHandler />
        <ZoomHandler />
        <ChunkGridLayer />
        <div className="cursor-coordinates-box">
          <div className="coordinate-row">
            <span>Zoom: {Math.round(zoom)}</span>
            <span>X: {cursorX}</span>
            <span>Y: {cursorY}</span>
            <span>
              <IconSettings />
            </span>
          </div>
        </div>
        <div className="floorButtonContainer">
          <div className="floorButtonContainer">
            <button
              className="floor-button floor-button--up"
              onClick={handleFloorIncrement}
            >
              ↑
            </button>
            <div className="floor-display">Floor {floor}</div>
            <button
              className="floor-button floor-button--down"
              onClick={handleFloorDecrement}
            >
              ↓
            </button>
          </div>
        </div>
        <>
          {layers.map((layer) => (
            <TileLayer
              key={layer.name}
              url={layer.url}
              tileSize={layer.tileSize}
              maxNativeZoom={layer.maxNativeZoom}
              minZoom={layer.minZoom}
              opacity={layer.opacity}
              className={layer.className}
              updateWhenZooming={layer.updateWhenZooming}
              updateInterval={layer.updateInterval}
              noWrap={true}
              bounds={bound}
            />
          ))}
        </>
        <MapAreaFlyToHandler selectedArea={selectedArea} />
        <StepSnapHandler questJson={questJson} selectedStep={selectedStep} />
        <NpcFlyToHandler
          highlightedNpc={highlightedNpc}
          onFloorChange={handleFloorChange}
        />
        <SelectionHighlightLayer
          geometry={highlightedNpc ? highlightGeometry : selectionGeometry}
        />
        <GridLayer />
        <HighlightLayer onCursorMove={handleCursorMove} />
      </MapContainer>
    </div>
  );
};

export default App;
