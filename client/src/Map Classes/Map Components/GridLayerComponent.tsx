import Graticule from "Map Classes/Graticule";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

const GridLayer = () => {
  const map = useMap();

  useEffect(() => {
    const grid = new Graticule({
      intervals: [
        { min_zoom: -6, interval: 1024 },
        { min_zoom: -5, interval: 512 },
        { min_zoom: -4, interval: 128 },
        { min_zoom: -3, interval: 64 },
        { min_zoom: 0.5, interval: 8 },
        { min_zoom: 1, interval: 4 },
        { min_zoom: 2, interval: 1 },
      ],
      offset: { x: 0.5, y: 0.5 },
      lineStyle: {
        color: "#111111",
        opacity: 0.3,
        weight: 1,
        interactive: false,
      },
      pane: "overlayPane",
    });

    grid.addTo(map);

    return () => {
      grid.remove();
    };
  }, [map]);

  return null;
};
export default GridLayer;
