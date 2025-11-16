import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface ObjectFlyToHandlerProps {
  highlightedObject: { lat: number; lng: number } | null;
}

const ObjectFlyToHandler: React.FC<ObjectFlyToHandlerProps> = ({
  highlightedObject,
}) => {
  const map = useMap();

  useEffect(() => {
    if (highlightedObject) {
      map.flyTo([highlightedObject.lat, highlightedObject.lng], 5, {
        animate: true,
        duration: 0.5,
      });
    }
  }, [highlightedObject, map]);

  return null;
};

export default ObjectFlyToHandler;
