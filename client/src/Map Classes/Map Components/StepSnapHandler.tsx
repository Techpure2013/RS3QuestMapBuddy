import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { LatLngTuple } from "leaflet";

interface StepSnapHandlerProps {
  questJson: any;
  selectedStep: number;
  // --- NEW: Add props to know which target is active ---
  targetIndex: number;
  targetType: "npc" | "object";
}

const StepSnapHandler: React.FC<StepSnapHandlerProps> = ({
  questJson,
  selectedStep,
  // --- NEW: Destructure the new props ---
  targetIndex,
  targetType,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!questJson) return;

    const step = questJson.questSteps[selectedStep];
    if (!step?.highlights) return;

    const targetZoom = 4;
    let snapLocation: LatLngTuple | null = null;

    // --- REVISED LOGIC ---
    // 1. Get the specific target based on the current index and type
    const currentTarget = step.highlights[targetType]?.[targetIndex];

    if (!currentTarget) return; // No target at this index, so do nothing.

    // 2. Check if THIS SPECIFIC target has a valid location
    if (
      targetType === "npc" &&
      currentTarget.npcLocation &&
      (currentTarget.npcLocation.lat !== 0 ||
        currentTarget.npcLocation.lng !== 0)
    ) {
      snapLocation = [
        currentTarget.npcLocation.lat,
        currentTarget.npcLocation.lng,
      ];
    } else if (
      targetType === "object" &&
      currentTarget.objectLocation?.length > 0
    ) {
      // For objects, snap to the first valid location in its own array
      const firstLoc = currentTarget.objectLocation.find(
        (loc: any) => loc.lat !== 0 || loc.lng !== 0
      );
      if (firstLoc) {
        snapLocation = [firstLoc.lat, firstLoc.lng];
      }
    }

    // 3. Only fly if the CURRENT target has a location.
    // This prevents flying away when a new, empty NPC is added.
    if (snapLocation) {
      map.flyTo(snapLocation, targetZoom, {
        duration: 0.5, // smooth animation
      });
    }
  }, [questJson, selectedStep, targetIndex, targetType, map]); // Add dependencies

  return null;
};

export default StepSnapHandler;
