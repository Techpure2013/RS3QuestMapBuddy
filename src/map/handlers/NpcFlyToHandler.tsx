import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { Npc } from "../../editor/sections/NpcSearch"; // Assuming Npc type is exported from NpcSearch

interface NpcFlyToHandlerProps {
  highlightedNpc: Npc | null;
  onFloorChange: (floor: number) => void;
}

const NpcFlyToHandler: React.FC<NpcFlyToHandlerProps> = ({
  highlightedNpc,
  onFloorChange,
}) => {
  const map = useMap();

  useEffect(() => {
    // If there's no map or no highlighted NPC, do nothing.
    if (!map || !highlightedNpc) {
      return;
    }

    // 1. Tell the parent component to change the floor.
    // This will trigger a re-render of the map's tile layers.
    onFloorChange(highlightedNpc.floor);

    // 2. Fly the map to the NPC's location.
    // This happens after the floor change is initiated.
    map.flyTo([highlightedNpc.lat, highlightedNpc.lng], 4, {
      duration: 0.5, // A quick, smooth animation
    });
  }, [highlightedNpc, map, onFloorChange]); // This effect runs ONLY when the highlighted NPC changes.

  return null; // This component renders nothing.
};

export default NpcFlyToHandler;
