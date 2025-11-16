import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";

const RestoreViewHandler: React.FC = () => {
  const map = useMap();
  const ui = useEditorSelector((s) => s.ui);
  const seen = useRef<number>(ui.restoreViewRequest?.token ?? 0);

  useEffect(() => {
    const req = ui.restoreViewRequest;
    if (!req) return;
    if (req.token === seen.current) return;
    seen.current = req.token;

    const nav = EditorStore.getState().ui.navReturn;
    if (!nav) {
      EditorStore.setUi({ restoreViewRequest: undefined });
      return;
    }

    // restore selection and floor if captured
    if (nav.selection) {
      const sel = nav.selection;
      // basic clamping guard in case quest changed
      const q = EditorStore.getState().quest;
      const steps = q?.questSteps?.length ?? 0;
      const nextStep = Math.max(
        0,
        Math.min(sel.selectedStep, Math.max(0, steps - 1))
      );
      EditorStore.setSelection({
        ...sel,
        selectedStep: nextStep,
        floor: nav.floor,
      });
    } else {
      EditorStore.setSelection({ floor: nav.floor });
    }

    map.flyTo([nav.center.lat, nav.center.lng], nav.zoom, { duration: 0.5 });

    EditorStore.setUi({
      restoreViewRequest: undefined,
      navReturn: req.clearReturn ? undefined : nav,
    });
  }, [map, ui.restoreViewRequest]);

  return null;
};

export default RestoreViewHandler;
