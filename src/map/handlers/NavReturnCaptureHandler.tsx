import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";

const NavReturnCaptureHandler: React.FC = () => {
  const map = useMap();
  const ui = useEditorSelector((s) => s.ui);
  const seen = useRef<number>(ui.captureNavReturnRequest?.token ?? 0);

  useEffect(() => {
    const req = ui.captureNavReturnRequest;
    if (!req) return;
    if (req.token === seen.current) return;
    seen.current = req.token;

    const center = map.getCenter();
    const zoom = map.getZoom();

    const { selection } = EditorStore.getState();
    EditorStore.setUi({
      navReturn: {
        center: { lat: center.lat, lng: center.lng },
        zoom,
        floor: selection.floor,
        selection: req.includeSelection ? { ...selection } : undefined,
      },
      captureNavReturnRequest: undefined,
    });
  }, [map, ui.captureNavReturnRequest]);

  return null;
};

export default NavReturnCaptureHandler;
