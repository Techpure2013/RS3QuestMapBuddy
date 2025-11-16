import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";
import {
  convertSearchedNPCCoordToVisual,
  convertSearchedObjectCoordToVisual,
} from "../../map/utils/coordinates";

const SearchHighlightFlyToHandler: React.FC = () => {
  const map = useMap();
  const highlights = useEditorSelector((s) => s.highlights);
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    const npc = highlights.highlightedNpc;
    const obj = highlights.highlightedObject;

    // Build a dedupe key so we only fly on real changes
    const key = npc
      ? `npc|${npc.id}|${npc.lat}|${npc.lng}|${npc.floor}`
      : obj
      ? `obj|${obj.id}|${obj.lat}|${obj.lng}|${obj.floor}`
      : "";
    if (!key || key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    // Pick target and compute visual center with your desired offsets
    if (npc) {
      // Sync floor first
      const sel = EditorStore.getState().selection;
      if (sel.floor !== npc.floor) {
        EditorStore.setSelection({ floor: npc.floor });
      }
      const v = convertSearchedNPCCoordToVisual(npc);
      if (!v) return;
      const lat = v.lat - 2;
      const lng = v.lng + 8;
      map.flyTo([lat, lng], 5, { duration: 0.5 });
      return;
    }

    if (obj) {
      const sel = EditorStore.getState().selection;
      if (sel.floor !== obj.floor) {
        EditorStore.setSelection({ floor: obj.floor });
      }
      const v = convertSearchedObjectCoordToVisual(obj);
      if (!v) return;
      const lat = v.lat - 2;
      const lng = v.lng + 8;
      map.flyTo([lat, lng], 5, { duration: 0.5 });
      return;
    }
  }, [map, highlights]);

  return null;
};

export default SearchHighlightFlyToHandler;
