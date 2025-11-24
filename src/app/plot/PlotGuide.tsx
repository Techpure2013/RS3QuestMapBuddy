// src/app/plot/PlotGuide.tsx
import React from "react";
import { hardLocalReset } from "../../state/hardLocalReset";

export const PlotGuide: React.FC = () => (
  <div className="plot-guide-container">
    <GuideCard />
    <QuickTips />
    <SearchTools />
    <Troubleshooting />
    <LocalResetButton />
  </div>
);

const GuideCard: React.FC = () => (
  <div className="plot-guide-card">
    <h2 className="plot-guide-title">Plot Workspace Guide</h2>
    <p className="plot-guide-text">
      Capture & submit locations for this quest step. Use the left panel to add
      NPCs/Objects, click the map to place points, and the tools below to search
      NPCs, Objects, and Areas.
    </p>
  </div>
);

const QuickTips: React.FC = () => (
  <div className="plot-section">
    <h3 className="plot-section-title">Quick Tips</h3>
    <ul className="plot-tips-list">
      <li>
        NPC mode: one click sets NPC location; Radius draws a wander area.
      </li>
      <li>Object mode: clicks add tiles; last point can have color/number.</li>
      <li>Use Grids for alignment; cursor shows live X/Y/Zoom.</li>
      <li>Submit with your in‑game name; admin will merge on approval.</li>
    </ul>
  </div>
);

const SearchTools: React.FC = () => (
  <>
    <SearchSection
      title="Object Search"
      color="#22d3ee"
      description="Search by name or click a map area to find nearby objects. Pick a result to seed an object and add points on the map."
    >
      <ObjectSearchPanel />
    </SearchSection>

    <SearchSection
      title="NPC Search"
      color="#34d399"
      description="Type ≥4 chars, press Enter. Cycle results. Choosing fills id + name and snaps to the NPC's floor (best for approval)."
    >
      <NpcSearchPanel />
    </SearchSection>

    <SearchSection
      title="Map Area Search"
      color="#60a5fa"
      description='Find an area by name and fly there. Use "Back" to return to your previous view.'
    >
      <MapAreaSearchPanel />
    </SearchSection>
  </>
);

interface SearchSectionProps {
  title: string;
  color: string;
  description: string;
  children: React.ReactNode;
}

const SearchSection: React.FC<SearchSectionProps> = ({
  title,
  color,
  description,
  children,
}) => (
  <div className="plot-section plot-search-section">
    <div className="plot-section-header">
      <div className="plot-section-icon" style={{ background: color }} />
      <strong className="plot-section-label">{title}</strong>
    </div>
    <p className="plot-help-text">{description}</p>
    <div className="plot-search-content">{children}</div>
  </div>
);

const Troubleshooting: React.FC = () => (
  <div className="plot-section">
    <h3 className="plot-section-title">Troubleshooting</h3>
    <ul className="plot-tips-list">
      <li>
        Submitted but nothing changed: likely NPCs had no resolvable id or
        objects had no points. Use the search tools, then add points and
        resubmit.
      </li>
      <li>
        NPC didn't approve: ensure an exact DB name match via NPC Search to
        backfill id.
      </li>
      <li>
        If you cannot plot a point something might be hung up in the cache quick
        cache reset ctrl+shift+r or hit the local reset button.
      </li>
    </ul>
  </div>
);

const LocalResetButton: React.FC = () => (
  <button
    onClick={async () => {
      const ok = confirm(
        "This will clear local editor state, image cache, and chathead queues.\nContinue?"
      );
      if (!ok) return;
      await hardLocalReset();
    }}
    className="control-btn plot-reset-btn"
    type="button"
    title="Clear local caches and reset editor"
  >
    Local Reset
  </button>
);

// These would be imported from your actual components
import ObjectSearchPanel from "../containers/SearchPanels/ObjectSearchPanel";
import NpcSearchPanel from "../containers/SearchPanels/NpcSearchPanel";
import MapAreaSearchPanel from "../containers/SearchPanels/MapAreaSearchPanel";
