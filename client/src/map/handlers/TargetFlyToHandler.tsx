import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

interface TargetFlyToHandlerProps {
  questJson: any;
  selectedStep: number;
  targetType: "npc" | "object";
  targetIndex: number;
  floor: number; // ADD: The current floor from App's state
  onFloorChange: (floor: number) => void;
}

export const TargetFlyToHandler: React.FC<TargetFlyToHandlerProps> = ({
  questJson,
  selectedStep,
  targetType,
  targetIndex,
  floor, // ADD: Destructure the new prop
  onFloorChange,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!questJson) return;

    const target =
      questJson.questSteps[selectedStep]?.highlights?.[targetType]?.[
        targetIndex
      ];

    if (!target) return;

    let coords: { lat: number; lng: number } | null = null;
    if (targetType === "npc" && target.npcLocation) {
      coords = target.npcLocation;
    } else if (targetType === "object" && target.objectLocation?.[0]) {
      coords = target.objectLocation[0];
    }

    if (coords && (coords.lat !== 0 || coords.lng !== 0)) {
      // CHANGE: Compare the step's floor with the floor prop from App state.
      // WHY: This avoids trying to access a custom property on a generic
      // Leaflet type. It's a safer and more direct way to check if the
      // floor needs to be changed.
      const stepFloor = questJson.questSteps[selectedStep]?.floor;
      if (stepFloor !== undefined && floor !== stepFloor) {
        onFloorChange(stepFloor);
      }

      const visualCenter: L.LatLngTuple = [coords.lat + 0.5, coords.lng + 0.5];

      map.flyTo(visualCenter, map.getZoom(), {
        duration: 0.5,
      });
    }
  }, [
    map,
    questJson,
    selectedStep,
    targetType,
    targetIndex,
    floor, // ADD: Include the new prop in the dependency array
    onFloorChange,
  ]);

  return null;
};
