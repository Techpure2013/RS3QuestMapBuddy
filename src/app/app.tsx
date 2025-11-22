// src/app/index.tsx
import React, { useMemo } from "react";
import "./../Assets/CSS/index.css";
import "./../Assets/CSS/leafless.css";

import WorkspaceLayout from "./../feature/WorkspaceLayouts";
import StepControlBar from "./containers/FixedControlBar"; // export default from the fixed version
import QuestDetailsPanel from "./containers/QuestDetailsPanel";
import ItemsNeededPanel from "./containers/ItemsNeededPanel";
import ItemsRecommendedPanel from "./containers/ItemsRecommendedPanel";
import AdditionalInfoPanel from "./containers/AdditionalInfoPanel";
import QuestImagesPanelContainer from "./containers/QuestImagesPanel";
import NpcObjectToolsPanel from "./containers/NpcObjectToolsPanel";
import QuestImagePastePanel from "./containers/QuestImagePastePanel";
import ChatheadsPanel from "./containers/ChatheadsPanel";
import NpcSearchPanel from "./containers/SearchPanels/NpcSearchPanel";
import { MapAreaSearchPanel } from "./containers/SearchPanels/MapAreaSearchPanel";
import ObjectSearchPanel from "./containers/SearchPanels/ObjectSearchPanel";
import MapCenter from "./map/MapCenter";
import CenterControls from "./containers/CenterControlPanel";
import Panel from "./sections/panel";
import QuestRewardsPanel from "./containers/QuestRewardsPanel";
import { useAuth } from "state/useAuth";
import AdminPlotSubmissions from "./admin/PlotSubmissionAdmin";

const App: React.FC = () => {
  const { isAuthed } = useAuth();

  const leftDock = useMemo(
    () => (
      <>
        {isAuthed && (
          <>
            <Panel defaultOpen={true} title="Quest Details" compact>
              <QuestDetailsPanel />
            </Panel>
            <Panel defaultOpen={false} title="Items Needed" compact>
              <ItemsNeededPanel />
            </Panel>
            <Panel defaultOpen={false} title="Items Recommended" compact>
              <ItemsRecommendedPanel />
            </Panel>
            <Panel defaultOpen={false} title="Additional Information" compact>
              <AdditionalInfoPanel />
            </Panel>
            <Panel defaultOpen={true} title="Quest Rewards" compact>
              <QuestRewardsPanel />
            </Panel>
            <Panel defaultOpen={true} title="NPC/Object Tools" compact>
              <NpcObjectToolsPanel />
            </Panel>
          </>
        )}
      </>
    ),
    [isAuthed]
  );

  const rightDock = useMemo(
    () => (
      <>
        {isAuthed && (
          <>
            <Panel defaultOpen={false} title="Submissions (Admin)" compact>
              <AdminPlotSubmissions />
            </Panel>
            <Panel defaultOpen={false} title="Chathead Creation" compact>
              <ChatheadsPanel />
            </Panel>
            <Panel defaultOpen={false} title="Quest Images" compact>
              <QuestImagesPanelContainer />
            </Panel>
            <Panel defaultOpen={false} title="Image Paste" compact>
              <QuestImagePastePanel />
            </Panel>
          </>
        )}

        {/* Always available search/navigation panels */}
        <Panel defaultOpen={false} title="NPC Search" compact>
          <NpcSearchPanel />
        </Panel>
        <Panel defaultOpen={false} title="Object Search" compact>
          <ObjectSearchPanel />
        </Panel>
        <Panel defaultOpen={false} title="Map Area Search" compact>
          <MapAreaSearchPanel />
        </Panel>
      </>
    ),
    [isAuthed]
  );

  const center = useMemo(
    () => (
      <>
        <CenterControls />
        <MapCenter />
      </>
    ),
    []
  );

  // Create the control bar element once (it’s a stable component)
  const controlBar = useMemo(() => <StepControlBar />, []);

  return (
    <WorkspaceLayout
      left={leftDock}
      right={rightDock}
      center={center}
      controlBar={controlBar}
      initialLeftWidth={380}
      initialRightWidth={380}
      minLeftWidth={280}
      minRightWidth={280}
      maxLeftWidth={600}
      maxRightWidth={600}
      storageKey="rs3qb_workspace_v2"
    />
  );
};

export default App;
