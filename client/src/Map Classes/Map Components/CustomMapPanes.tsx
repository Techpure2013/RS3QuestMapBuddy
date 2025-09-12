import { useEffect } from "react";
import { useMap } from "react-leaflet";

/**
 * A simple component that creates custom panes on the Leaflet map instance.
 * Panes are used to control the stacking order (z-index) of layers.
 */
export const CustomMapPanes: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    // --- Pane for background highlights (e.g., from search results) ---
    map.createPane("highlightPane");
    const highlightPane = map.getPane("highlightPane");
    if (highlightPane) {
      highlightPane.style.zIndex = "590"; // Below markers
      highlightPane.style.pointerEvents = "none";
    }

    // --- Pane for foreground selections (the primary active item) ---
    map.createPane("selectionPane");
    const selectionPane = map.getPane("selectionPane");
    if (selectionPane) {
      selectionPane.style.zIndex = "650"; // Above markers
      selectionPane.style.pointerEvents = "none";
    }

    // --- Create a new, top-most pane specifically for text labels ---
    map.createPane("selectionLabelPane");
    const selectionLabelPane = map.getPane("selectionLabelPane");
    if (selectionLabelPane) {
      // Z-index 670 is safely above the selectionPane.
      selectionLabelPane.style.zIndex = "670";
      selectionLabelPane.style.pointerEvents = "none";
    }
  }, [map]);

  return null; // This component does not render any visible JSX.
};
