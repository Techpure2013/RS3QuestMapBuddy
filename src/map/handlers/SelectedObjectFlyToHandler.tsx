import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface SelectedObjectFlyToHandlerProps {
  selectedObject: { lat: number; lng: number } | null;
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
