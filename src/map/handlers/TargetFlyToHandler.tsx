// src/map/handlers/TargetFlyToHandler.tsx
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";
import type { NpcHighlight, ObjectHighlight } from "../../state/types";
import { convertManualCoordToVisual } from "../../map/utils/coordinates";

/**
 * Computes the same center the renderer uses:
 * - convertManualCoordToVisual (manual -> visual tile origin)
 * - then +0.5,+0.5 to land in the middle of the tile
 * - for objects with multiple tiles, fly to the average center
 */
const TargetFlyToHandler: React.FC = () => {
  const map = useMap();
  // wake on new token; read latest quest/selection directly from store to avoid races
  const ui = useEditorSelector((s) => s.ui);
  const tokenRef = useRef<number>(ui.flyToTargetRequest?.token ?? 0);

  useEffect(() => {
    const req = ui.flyToTargetRequest;
    if (!req) return;
    if (req.token === tokenRef.current) return;
    tokenRef.current = req.token;

    const { quest, selection: sel } = EditorStore.getState();
    if (!quest) {
      EditorStore.setUi({ flyToTargetRequest: undefined });
      return;
    }
    const step = quest.questSteps?.[sel.selectedStep];
    if (!step?.highlights) {
      EditorStore.setUi({ flyToTargetRequest: undefined });
      return;
    }

    let centerLat: number | null = null;
    let centerLng: number | null = null;
    let targetFloor: number = 0;

    if (sel.targetType === "npc") {
      const npc = (step.highlights.npc ?? [])[sel.targetIndex] as
        | NpcHighlight
        | undefined;
      if (npc?.npcLocation) {
        const v = convertManualCoordToVisual(npc.npcLocation);
        if (v) {
          centerLat = v.lat - 2;
          centerLng = v.lng + 8;
        }
        targetFloor = npc.floor ?? 0;
      }
    } else {
      const obj = (step.highlights.object ?? [])[sel.targetIndex] as
        | ObjectHighlight
        | undefined;
      const pts = (obj?.objectLocation ?? []).filter(
        (p) => p && (p.lat !== 0 || p.lng !== 0)
      );
      if (pts.length > 0) {
        // average of all valid object tiles in visual space, then +0.5,+0.5
        let sumLat = 0;
        let sumLng = 0;
        for (const p of pts) {
          const v = convertManualCoordToVisual({ lat: p.lat, lng: p.lng });
          if (!v) continue;
          sumLat += v.lat - 2;
          sumLng += v.lng + 8;
        }
        centerLat = sumLat / pts.length;
        centerLng = sumLng / pts.length;
      }
      targetFloor = obj?.floor ?? 0;
    }

    if (centerLat === null || centerLng === null) {
      EditorStore.setUi({ flyToTargetRequest: undefined });
      return;
    }

    // sync floor to the target's floor
    if (sel.floor !== targetFloor) {
      EditorStore.setSelection({ floor: targetFloor });
    }

    // always zoom 5 for targets
    map.flyTo([centerLat, centerLng], 5, { duration: 0.5 });

    EditorStore.setUi({ flyToTargetRequest: undefined });
  }, [map, ui.flyToTargetRequest]);

  return null;
};

export default TargetFlyToHandler;
