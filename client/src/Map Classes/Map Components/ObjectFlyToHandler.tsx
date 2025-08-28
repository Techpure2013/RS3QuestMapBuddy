import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { MapObject } from "./ObjectSearch"; // Import the type

interface ObjectFlyToHandlerProps {
  highlightedObject: MapObject | null;
  onFloorChange: (floor: number) => void;
}

const ObjectFlyToHandler: React.FC<ObjectFlyToHandlerProps> = ({
  highlightedObject,
  onFloorChange,
}) => {
  const map = useMap();

  useEffect(() => {
    if (highlightedObject) {
      onFloorChange(highlightedObject.floor);
      // --- IMPROVEMENT: Set a specific zoom level (e.g., 4) for consistency ---
      map.flyTo([highlightedObject.lat, highlightedObject.lng], 4, {
        animate: true,
        duration: 0.5,
      });
    }
  }, [highlightedObject, map, onFloorChange]);

  return null;
};

export default ObjectFlyToHandler;
