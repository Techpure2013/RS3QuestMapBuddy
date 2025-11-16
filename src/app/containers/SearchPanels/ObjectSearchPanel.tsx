import React, { useCallback, useState, useEffect } from "react";
import Panel from "./../../sections/panel";
import { ObjectSearch, type MapObject } from "./../../sections/ObjectSearch";
import { EditorStore } from "../../../state/editorStore";

export const ObjectSearchPanel: React.FC = () => {
  const [areaSearchResults, setAreaSearchResults] = useState<MapObject[]>([]);
  const [isAreaSearchActive, setIsAreaSearchActive] = useState(false);

  // Listen for area search results from map clicks
  useEffect(() => {
    const handleAreaSearchResults = (e: Event) => {
      const customEvent = e as CustomEvent<{ results: MapObject[] }>;
      const results = customEvent.detail.results;
      console.log("ObjectSearchPanel received results:", results.length);
      setAreaSearchResults(results);
      setIsAreaSearchActive(false); // Deactivate after results
    };

    window.addEventListener("areaSearchResults", handleAreaSearchResults);
    return () => {
      window.removeEventListener("areaSearchResults", handleAreaSearchResults);
    };
  }, []);

  const onObjectHighlight = useCallback((obj: MapObject | null) => {
    EditorStore.setHighlights({ highlightedObject: obj });
  }, []);

  const onObjectSelect = useCallback((chosen: MapObject) => {
    const sel = EditorStore.getState().selection;
    EditorStore.setSelection({ floor: chosen.floor });
    EditorStore.patchQuest((draft) => {
      const target =
        draft.questSteps[sel.selectedStep]?.highlights.object?.[
          sel.targetIndex
        ];
      if (!target) return;
      target.name = chosen.name;
      target.objectLocation = [
        { lat: chosen.lat, lng: chosen.lng, color: "#FFFFFF", numberLabel: "" },
      ];
      draft.questSteps[sel.selectedStep].floor = chosen.floor;
    });
    EditorStore.setHighlights({ highlightedObject: null });

    // Deactivate area search after selection
    setIsAreaSearchActive(false);
    setAreaSearchResults([]);
  }, []);

  const handleToggleAreaSearch = useCallback((active: boolean) => {
    setIsAreaSearchActive(active);
    if (!active) {
      setAreaSearchResults([]);
    }
    // Store in UI state so map can read it
    EditorStore.setUi({ areaSearchMode: active ? "object" : null });
  }, []);

  return (
    <Panel title="Object Search" defaultOpen={false}>
      <ObjectSearch
        onObjectSelect={onObjectSelect}
        onObjectHighlight={onObjectHighlight}
        isAreaSearchActive={isAreaSearchActive}
        onToggleAreaSearch={handleToggleAreaSearch}
        areaSearchResults={areaSearchResults}
        onClearAreaSearchResults={() => setAreaSearchResults([])}
      />
    </Panel>
  );
};

export default ObjectSearchPanel;
