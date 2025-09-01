import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { MapObject } from "./ObjectSearch"; // Import the type

interface ObjectFlyToHandlerProps {
  highlightedObject: MapObject | null;
}

const ObjectFlyToHandler: React.FC<ObjectFlyToHandlerProps> = ({
  highlightedObject,
}) => {
  const map = useMap();

  useEffect(() => {
    if (highlightedObject) {
      // --- IMPROVEMENT: Set a specific zoom level (e.g., 4) for consistency ---
      map.flyTo([highlightedObject.lat, highlightedObject.lng], 5, {
        animate: true,
        duration: 0.5,
      });
    }
  }, [highlightedObject, map]);

  return null;
};

export default ObjectFlyToHandler;
