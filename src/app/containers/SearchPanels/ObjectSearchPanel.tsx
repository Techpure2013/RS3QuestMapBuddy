import React, { useCallback, useState, useEffect } from "react";
import { ObjectSearch, type MapObject } from "./../../sections/ObjectSearch";
import {
  EditorStore,
  requestFlyToCurrentTargetAt,
  requestCaptureNavReturn,
  requestRestoreView,
} from "../../../state/editorStore";
import { useEditorSelector } from "./../../../state/useEditorSelector";

export const ObjectSearchPanel: React.FC = () => {
  const [areaSearchResults, setAreaSearchResults] = useState<MapObject[]>([]);
  const [isAreaSearchActive, setIsAreaSearchActive] = useState(false);
  const [session, setSession] = useState(0); // remount key
  const ui = useEditorSelector((s) => s.ui);

  useEffect(() => {
    const handleAreaSearchResults = (e: Event) => {
      const ce = e as CustomEvent<{ results: MapObject[] }>;
      setAreaSearchResults(ce.detail.results);
      setIsAreaSearchActive(false);
    };
    window.addEventListener("areaSearchResults", handleAreaSearchResults);
    return () =>
      window.removeEventListener("areaSearchResults", handleAreaSearchResults);
  }, []);

  const onObjectHighlight = useCallback((obj: MapObject | null) => {
    if (!EditorStore.getState().ui.navReturn) {
      requestCaptureNavReturn(true);
    }
    EditorStore.setHighlights({ highlightedObject: obj });
  }, []);

  const onObjectSelect = useCallback((chosen: MapObject) => {
    EditorStore.setSelection({ targetType: "object", floor: chosen.floor });
    const sel = EditorStore.getState().selection;

    EditorStore.patchQuest((draft) => {
      const t =
        draft.questSteps[sel.selectedStep]?.highlights.object?.[
          sel.targetIndex
        ];
      if (!t) return;
      t.name = chosen.name;
      t.objectLocation = [
        { lat: chosen.lat, lng: chosen.lng, color: "#FFFFFF", numberLabel: "" },
      ];
      t.floor = chosen.floor;
    });

    EditorStore.setHighlights({ highlightedObject: null });
    setIsAreaSearchActive(false);
    setAreaSearchResults([]);
    requestFlyToCurrentTargetAt(5, "selection");
  }, []);

  const handleToggleAreaSearch = useCallback((active: boolean) => {
    setIsAreaSearchActive(active);
    if (active && !EditorStore.getState().ui.navReturn) {
      requestCaptureNavReturn(true);
    }
    if (!active) setAreaSearchResults([]);
    EditorStore.setUi({ areaSearchMode: active ? "object" : null });
  }, []);

  const handleBack = useCallback(() => {
    EditorStore.setHighlights({ highlightedObject: null });
    requestRestoreView(true);
    setIsAreaSearchActive(false);
    setAreaSearchResults([]);
    setSession((s) => s + 1); // reset widget
  }, []);

  return (
    <>
      <div className="button-group" style={{ marginBottom: 6 }}>
        <button
          onClick={handleBack}
          disabled={!ui.navReturn}
          title="Return to previous view"
        >
          Back
        </button>
      </div>
      <ObjectSearch
        key={session} // force reset
        onObjectSelect={onObjectSelect}
        onObjectHighlight={onObjectHighlight}
        isAreaSearchActive={isAreaSearchActive}
        onToggleAreaSearch={handleToggleAreaSearch}
        areaSearchResults={areaSearchResults}
        onClearAreaSearchResults={() => setAreaSearchResults([])}
      />
    </>
  );
};

export default ObjectSearchPanel;
