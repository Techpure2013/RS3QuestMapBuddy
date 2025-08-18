import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { LatLngTuple } from "leaflet";

interface StepSnapHandlerProps {
  questJson: any;
  selectedStep: number;
}

const StepSnapHandler: React.FC<StepSnapHandlerProps> = ({
  questJson,
  selectedStep,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!questJson) return;

    const step = questJson.questSteps[selectedStep];
    if (!step?.highlights) return;

    const targetZoom = 4;
    let snapLocation: LatLngTuple | null = null;

    // 1. Try to find the first valid NPC location
    const firstValidNpc = step.highlights.npc?.find(
      (npc: any) => npc.npcLocation?.lat !== 0 || npc.npcLocation?.lng !== 0
    );

    if (firstValidNpc) {
      snapLocation = [
        firstValidNpc.npcLocation.lat,
        firstValidNpc.npcLocation.lng,
      ];
    }

    // 2. If no valid NPC, try to find the first valid Object location
    if (!snapLocation) {
      const firstValidObject = step.highlights.object?.find((obj: any) =>
        obj.objectLocation?.some((loc: any) => loc.lat !== 0 || loc.lng !== 0)
      );

      if (firstValidObject) {
        const firstLoc = firstValidObject.objectLocation.find(
          (loc: any) => loc.lat !== 0 || loc.lng !== 0
        );
        if (firstLoc) {
          snapLocation = [firstLoc.lat, firstLoc.lng];
        }
      }
    }

    // 3. If we found any valid location, fly to it
    if (snapLocation) {
      map.flyTo(snapLocation, targetZoom, {
        duration: 0.5, // smooth animation
      });
    }
  }, [questJson, selectedStep, map]);

  return null;
};

export default StepSnapHandler;
