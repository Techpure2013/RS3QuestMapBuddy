import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { MapObject } from "./ObjectSearch";

interface SelectedObjectFlyToHandlerProps {
  selectedObject: MapObject | null;
  onFloorChange: (floor: number) => void;
}

const SelectedObjectFlyToHandler: React.FC<SelectedObjectFlyToHandlerProps> = ({
  selectedObject,
  onFloorChange,
}) => {
  const map = useMap();

  useEffect(() => {
    if (selectedObject) {
      onFloorChange(selectedObject.floor);
      map.flyTo([selectedObject.lat, selectedObject.lng], 4, {
        animate: true,
        duration: 0.5,
      });
    }
  }, [selectedObject, map, onFloorChange]);

  return null;
};

export default SelectedObjectFlyToHandler;
