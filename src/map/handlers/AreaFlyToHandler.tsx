import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";

/** Offset fly target using container-point conversion at current zoom */
function offsetFly(map: L.Map, lat: number, lng: number): [number, number] {
  const c = map.getCenter();
  const pt = map.latLngToContainerPoint(c);
  const shifted = map.containerPointToLatLng(L.point(pt.x, pt.y - 150));
  return [lat + (shifted.lat - c.lat), lng + (shifted.lng - c.lng)];
}

/**
 * Consumes ui.areaFlyRequest (one-shot token).
 * Flies to the selected area center at the current zoom level.
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
    const lat = (bounds[0][0] + bounds[1][0]) / 2;
    const lng = (bounds[0][1] + bounds[1][1]) / 2;

    const flyTarget = offsetFly(map, lat, lng);
    map.flyTo(flyTarget, map.getZoom(), { duration: 1.0 });

    EditorStore.setUi({ areaFlyRequest: undefined });
  }, [map, ui.areaFlyRequest]);

  return null;
};

export default AreaFlyToHandler;
