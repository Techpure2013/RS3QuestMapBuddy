import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";

/**
 * Consumes ui.areaFlyRequest (one-shot token).
 * Flies to the selected area center at zoom 1.
 */
const AreaFlyToHandler: React.FC = () => {
  const map = useMap();
  const ui = useEditorSelector((s) => s.ui);
  const tokenRef = useRef<number>(ui.areaFlyRequest?.token ?? 0);

  useEffect(() => {
    const req = ui.areaFlyRequest;
    if (!req) return;
    if (req.token === tokenRef.current) return;
    tokenRef.current = req.token;

    const bounds = req.area.bounds;
    // Geometric center from bounds
    const lng = (bounds[0][0] + bounds[1][0]) / 2;
    const lat = (bounds[0][1] + bounds[1][1]) / 2;

    // Always use zoom 1 (as requested), ignore any preferredZoom
    map.flyTo([lat, lng], 1, { duration: 1.0 });

    // Clear request
    EditorStore.setUi({ areaFlyRequest: undefined });
  }, [map, ui.areaFlyRequest]);

  return null;
};

export default AreaFlyToHandler;
