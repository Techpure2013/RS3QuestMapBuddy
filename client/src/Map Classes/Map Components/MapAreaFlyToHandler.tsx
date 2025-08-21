import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface MapArea {
  mapId: number;
  bounds: [[number, number], [number, number]];
  center: [number, number];
  name: string;
}

interface MapAreaFlyToHandlerProps {
  selectedArea: MapArea | null;
}

const MapAreaFlyToHandler: React.FC<MapAreaFlyToHandlerProps> = ({
  selectedArea,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!selectedArea) return;

    // Calculate the true geometric center for a better visual flight path
    const lng = (selectedArea.bounds[0][0] + selectedArea.bounds[1][0]) / 2;
    const lat = (selectedArea.bounds[0][1] + selectedArea.bounds[1][1]) / 2;

    // Fly to the location with a smooth animation and a reasonable zoom
    map.flyTo([lat, lng], 2, {
      duration: 1.0,
    });
  }, [selectedArea, map]);

  return null; // This component does not render anything
};

export default MapAreaFlyToHandler;
