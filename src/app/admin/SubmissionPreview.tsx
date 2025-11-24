// src/app/admin/SubmissionPreview.tsx
import React, { useState } from "react";
import type { PlotSubmissionRow } from "../../api/plotSubmissionsAdmin";

interface SubmissionPreviewProps {
  submission: PlotSubmissionRow | null;
}

export const SubmissionPreview: React.FC<SubmissionPreviewProps> = ({
  submission,
}) => {
  const [expandedSection, setExpandedSection] = useState<
    "npcs" | "objects" | "raw" | null
  >("npcs");

  if (!submission) {
    return (
      <div className="submission-preview-empty">
        <p>Select a submission to preview</p>
      </div>
    );
  }

  const { proposedhighlights } = submission;
  const npcs = proposedhighlights.npc ?? [];
  const objects = proposedhighlights.object ?? [];

  const toggleSection = (section: "npcs" | "objects" | "raw") => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="submission-preview">
      <div className="preview-header">
        <h3>Preview</h3>
        <div className="preview-meta">
          <span className="preview-badge">
            {submission.quest_name} - Step {submission.step_number}
          </span>
        </div>
      </div>

      {/* NPCs Section */}
      {npcs.length > 0 && (
        <div className="preview-section">
          <button
            className="preview-section-header"
            onClick={() => toggleSection("npcs")}
          >
            <span className="preview-section-icon">
              {expandedSection === "npcs" ? "▼" : "▶"}
            </span>
            <span className="preview-section-title">NPCs ({npcs.length})</span>
          </button>

          {expandedSection === "npcs" && (
            <div className="preview-section-content">
              {npcs.map((npc, i) => (
                <div key={i} className="preview-item">
                  <div className="preview-item-header">
                    <span className="preview-item-name">
                      {npc.npcName || `NPC ${i + 1}`}
                    </span>
                    {npc.id && (
                      <span className="preview-item-id">ID: {npc.id}</span>
                    )}
                  </div>
                  <div className="preview-item-coords">
                    Location: ({npc.npcLocation.lat}, {npc.npcLocation.lng})
                  </div>
                  {npc.wanderRadius &&
                    (npc.wanderRadius.bottomLeft.lat !== 0 ||
                      npc.wanderRadius.topRight.lat !== 0) && (
                      <div className="preview-item-radius">
                        Wander: ({npc.wanderRadius.bottomLeft.lat},{" "}
                        {npc.wanderRadius.bottomLeft.lng}) to (
                        {npc.wanderRadius.topRight.lat},{" "}
                        {npc.wanderRadius.topRight.lng})
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Objects Section */}
      {objects.length > 0 && (
        <div className="preview-section">
          <button
            className="preview-section-header"
            onClick={() => toggleSection("objects")}
          >
            <span className="preview-section-icon">
              {expandedSection === "objects" ? "▼" : "▶"}
            </span>
            <span className="preview-section-title">
              Objects ({objects.length})
            </span>
          </button>

          {expandedSection === "objects" && (
            <div className="preview-section-content">
              {objects.map((obj, i) => (
                <div key={i} className="preview-item">
                  <div className="preview-item-header">
                    <span className="preview-item-name">
                      {obj.name || `Object ${i + 1}`}
                    </span>
                    {obj.id && (
                      <span className="preview-item-id">ID: {obj.id}</span>
                    )}
                  </div>
                  <div className="preview-item-locations">
                    {obj.objectLocation.map((loc, j) => (
                      <div key={j} className="preview-location">
                        <span className="preview-location-coords">
                          ({loc.lat}, {loc.lng})
                        </span>
                        {loc.color && (
                          <span
                            className="preview-location-color"
                            style={{ background: loc.color }}
                          />
                        )}
                        {loc.numberLabel && (
                          <span className="preview-location-label">
                            #{loc.numberLabel}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Raw JSON Section */}
      <div className="preview-section">
        <button
          className="preview-section-header"
          onClick={() => toggleSection("raw")}
        >
          <span className="preview-section-icon">
            {expandedSection === "raw" ? "▼" : "▶"}
          </span>
          <span className="preview-section-title">Raw JSON</span>
        </button>

        {expandedSection === "raw" && (
          <div className="preview-section-content">
            <pre className="preview-json">
              {JSON.stringify(proposedhighlights, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
