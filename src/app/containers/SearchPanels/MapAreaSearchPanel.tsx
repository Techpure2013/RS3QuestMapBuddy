import React, { useCallback } from "react";
import Panel from "./../../sections/panel";
import { MapAreaSearch } from "./../../sections/MapAreaSearch";
import { EditorStore } from "../../../state/editorStore";

export const MapAreaSearchPanel: React.FC = () => {
  const onAreaSelect = useCallback(
    (area: {
      mapId: number;
      bounds: [[number, number], [number, number]];
      center: [number, number];
      name: string;
    }) => {
      EditorStore.setHighlights({ selectedArea: area });
    },
    []
  );

  return (
    <Panel title="Map Areas" defaultOpen={false}>
      <MapAreaSearch onAreaSelect={onAreaSelect} />
    </Panel>
  );
};

export default MapAreaSearchPanel;
