import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import type { LatLngTuple } from "leaflet";

interface StepSnapHandlerProps {
  questJson: any;
  selectedStep: number;
  targetIndex: number;
  targetType: "npc" | "object";
  onFloorChange: (floor: number) => void;
}

const StepSnapHandler: React.FC<StepSnapHandlerProps> = ({
  questJson,
  selectedStep,
  targetIndex,
  targetType,
  onFloorChange,
}) => {
  const map = useMap();
  const lastStepRef = useRef<number>(selectedStep);

  useEffect(() => {
    // Only run when the step actually changes
    if (lastStepRef.current === selectedStep) return;
    lastStepRef.current = selectedStep;

    if (!questJson) return;

    const step = questJson.questSteps?.[selectedStep];
    if (!step?.highlights) return;

    const target = step.highlights[targetType]?.[targetIndex];
    if (!target) return;

    let snapLocation: LatLngTuple | null = null;

    if (targetType === "npc") {
      const loc = target.npcLocation;
      if (loc && (loc.lat !== 0 || loc.lng !== 0)) {
        snapLocation = [loc.lat, loc.lng];
      }
    } else if (targetType === "object") {
      const firstValid = target.objectLocation?.find(
        (loc: any) => loc.lat !== 0 || loc.lng !== 0
      );
      if (firstValid) {
        snapLocation = [firstValid.lat, firstValid.lng];
      }
    }

    if (snapLocation) {
      // Sync floor if available
      if (typeof step.floor === "number") {
        onFloorChange(step.floor);
      }

      // Fly smoothly to the target
      map.flyTo(snapLocation, 4, { duration: 0.5 });
    }
  }, [selectedStep, questJson, targetIndex, targetType, map, onFloorChange]);

  return null;
};

export default StepSnapHandler;
