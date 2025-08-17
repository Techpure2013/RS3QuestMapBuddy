import { useEffect } from "react";
import { useMap } from "react-leaflet";

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
    if (!step) return;

    // Always zoom to level 4
    const targetZoom = 4;

    // Snap to NPC location if available
    if (step.highlights?.npc?.length > 0) {
      const npc = step.highlights.npc[0];
      if (npc.npcLocation?.lat && npc.npcLocation?.lng) {
        map.flyTo([npc.npcLocation.lat, npc.npcLocation.lng], targetZoom, {
          duration: 0.5, // smooth animation
        });
      }
    }
    // Otherwise snap to object location if available
    else if (step.highlights?.object?.length > 0) {
      const obj = step.highlights.object[0];
      if (obj.objectLocation?.length > 0) {
        const loc = obj.objectLocation[0];
        map.flyTo([loc.lat, loc.lng], targetZoom, {
          duration: 0.5,
        });
      }
    }
  }, [questJson, selectedStep, map]);

  return null;
};

export default StepSnapHandler;
