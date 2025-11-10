import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { MapObject } from "../../editor/sections/ObjectSearch";

interface SelectedObjectFlyToHandlerProps {
  selectedObject: MapObject | null;
}

const SelectedObjectFlyToHandler: React.FC<SelectedObjectFlyToHandlerProps> = ({
  selectedObject,
}) => {
  const map = useMap();

  useEffect(() => {
    if (selectedObject) {
      map.flyTo([selectedObject.lat, selectedObject.lng], 4, {
        animate: true,
        duration: 0.5,
      });
    }
  }, [selectedObject, map]);

  return null;
};

export default SelectedObjectFlyToHandler;
