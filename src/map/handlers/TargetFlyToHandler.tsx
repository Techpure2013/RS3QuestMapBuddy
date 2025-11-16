// src/map/handlers/TargetFlyToHandler.tsx
// Update the initialization check to ensure it fires on quest load

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import { EditorStore } from "../../state/editorStore";

interface TargetFlyToHandlerProps {
  questJson: any;
  selectedStep: number;
  targetIndex: number;
  targetType: "npc" | "object";
  floor: number;
  onFloorChange: (floor: number) => void;
}

export const TargetFlyToHandler: React.FC<TargetFlyToHandlerProps> = ({
  questJson,
  selectedStep,
  targetIndex,
  targetType,
  floor,
  onFloorChange,
}) => {
  const map = useMap();

  const prevRef = useRef({
    selectedStep,
    targetIndex,
    targetType,
    npcCount: 0,
    objectCount: 0,
    initialized: false,
    questName: "", // Track quest changes
  });

  useEffect(() => {
    if (!questJson) return;

    const step = questJson.questSteps?.[selectedStep];
    if (!step?.highlights) return;

    const currentNpcCount = step.highlights.npc?.length || 0;
    const currentObjectCount = step.highlights.object?.length || 0;
    const currentQuestName = questJson.questName || "";

    const prev = prevRef.current;

    // Check if quest changed (new quest loaded)
    const questChanged = prev.questName !== currentQuestName;

    const npcArrayGrew = currentNpcCount > prev.npcCount;
    const objectArrayGrew = currentObjectCount > prev.objectCount;

    // Handle initial mount OR quest change
    if (!prev.initialized || questChanged) {
      prevRef.current = {
        selectedStep,
        targetIndex,
        targetType,
        npcCount: currentNpcCount,
        objectCount: currentObjectCount,
        initialized: true,
        questName: currentQuestName,
      };

      // Fly to initial target
      const target = step.highlights[targetType]?.[targetIndex];
      if (!target) return;

      let snapLocation: LatLngTuple | null = null;

      if (targetType === "npc") {
        const loc = target.npcLocation;
        if (loc && (loc.lat !== 0 || loc.lng !== 0)) {
          snapLocation = [loc.lat + 0.5, loc.lng + 0.5];
        }
      } else if (targetType === "object") {
        const firstValid = target.objectLocation?.find(
          (loc: any) => loc.lat !== 0 || loc.lng !== 0
        );
        if (firstValid) {
          snapLocation = [firstValid.lat + 0.5, firstValid.lng + 0.5];
        }
      }

      if (snapLocation) {
        if (typeof step.floor === "number" && floor !== step.floor) {
          onFloorChange(step.floor);
        }
        console.log(
          `${
            questChanged ? "🆕 New quest" : "🎬 Initial"
          } fly to ${targetType} at`,
          snapLocation
        );
        map.flyTo(snapLocation, 4, { duration: 0.5 });
      }
      return;
    }

    // STEP CHANGE: Auto-select first valid target (don't fly here)
    if (prev.selectedStep !== selectedStep) {
      const isValidLocation = (loc: { lat: number; lng: number } | undefined) =>
        loc && (loc.lat !== 0 || loc.lng !== 0);

      const firstNpc = step.highlights.npc?.[0];
      const hasValidNpc = firstNpc && isValidLocation(firstNpc.npcLocation);

      const firstObject = step.highlights.object?.[0];
      const hasValidObject =
        firstObject &&
        firstObject.objectLocation?.some((loc: any) => isValidLocation(loc));

      prevRef.current = {
        selectedStep,
        targetIndex,
        targetType,
        npcCount: currentNpcCount,
        objectCount: currentObjectCount,
        initialized: true,
        questName: currentQuestName,
      };

      if (hasValidNpc) {
        console.log("Step changed: auto-selecting first NPC");
        EditorStore.setSelection({ targetType: "npc", targetIndex: 0 });
        return;
      } else if (hasValidObject) {
        console.log("Step changed: auto-selecting first object");
        EditorStore.setSelection({ targetType: "object", targetIndex: 0 });
        return;
      }

      console.log("Step changed: no valid targets found");
      return;
    }

    // NORMAL LOGIC: Fly when user manually changes selection
    const shouldFly =
      prev.targetType !== targetType ||
      (prev.targetIndex !== targetIndex &&
        !(targetType === "npc" && npcArrayGrew) &&
        !(targetType === "object" && objectArrayGrew));

    prevRef.current = {
      selectedStep,
      targetIndex,
      targetType,
      npcCount: currentNpcCount,
      objectCount: currentObjectCount,
      initialized: true,
      questName: currentQuestName,
    };

    if (!shouldFly) {
      console.log("Skipping fly-to: new item was added");
      return;
    }

    const target = step.highlights[targetType]?.[targetIndex];
    if (!target) return;

    let snapLocation: LatLngTuple | null = null;

    if (targetType === "npc") {
      const loc = target.npcLocation;
      if (loc && (loc.lat !== 0 || loc.lng !== 0)) {
        snapLocation = [loc.lat + 0.5, loc.lng + 0.5];
      }
    } else if (targetType === "object") {
      const firstValid = target.objectLocation?.find(
        (loc: any) => loc.lat !== 0 || loc.lng !== 0
      );
      if (firstValid) {
        snapLocation = [firstValid.lat + 0.5, firstValid.lng + 0.5];
      }
    }

    if (snapLocation) {
      if (typeof step.floor === "number" && floor !== step.floor) {
        onFloorChange(step.floor);
      }

      console.log(`Flying to ${targetType} at`, snapLocation);
      map.flyTo(snapLocation, 4, { duration: 0.5 });
    }
  }, [
    selectedStep,
    targetIndex,
    targetType,
    questJson,
    floor,
    map,
    onFloorChange,
  ]);

  return null;
};

export default TargetFlyToHandler;
