import React, { useEffect, useState } from "react";
import { produce } from "immer";
import {
  IconDeviceFloppy,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import type {
  Quest,
  QuestDetails,
  MemberRequirement,
  OfficialLength,
} from "../../state/types";
import {
  getQuestInfo,
  updateQuestInDatabase,
} from "../../utils/questDataloader";

interface QuestDetailsEditorProps {
  questJson: Quest | null;
  onUpdateQuest: (updatedQuest: Quest) => void;
}

export const QuestDetailsEditor: React.FC<QuestDetailsEditorProps> = ({
  questJson,
  onUpdateQuest,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [questDetails, setQuestDetails] = useState<QuestDetails>({
    Quest: "",
    StartPoint: "",
    MemberRequirement: "Free to Play",
    OfficialLength: "Short",
    Requirements: [],
    ItemsRequired: [],
    Recommended: [],
    EnemiesToDefeat: [],
  });
  const [tempDetails, setTempDetails] = useState<QuestDetails>(questDetails);

  // Helper to create defaults based on a name
  const defaultsFor = (name: string): QuestDetails => ({
    Quest: name,
    StartPoint: "",
    MemberRequirement: "Free to Play",
    OfficialLength: "Short",
    Requirements: [],
    ItemsRequired: [],
    Recommended: [],
    EnemiesToDefeat: [],
  });

  useEffect(() => {
    const loadQuestDetails = async () => {
      // If we don't have a quest loaded, reset to clean defaults.
      if (!questJson) {
        const d = defaultsFor("");
        setQuestDetails(d);
        setTempDetails(d);
        return;
      }

      // If questJson already carries details, prefer them.
      if (questJson.questDetails) {
        setQuestDetails(questJson.questDetails);
        setTempDetails(questJson.questDetails);
        return;
      }

      // Otherwise, fetch from API using the quest name and write back.
      if (questJson.questName) {
        setIsLoading(true);
        try {
          const info = await getQuestInfo(questJson.questName);
          if (info) {
            setQuestDetails(info);
            setTempDetails(info);

            const updatedQuest = produce(questJson, (draft) => {
              draft.questDetails = info;
            });
            onUpdateQuest(updatedQuest);
          } else {
            const d = defaultsFor(questJson.questName);
            setQuestDetails(d);
            setTempDetails(d);

            const updatedQuest = produce(questJson, (draft) => {
              draft.questDetails = d;
            });
            onUpdateQuest(updatedQuest);
          }
        } catch (err) {
          console.error("Error loading quest details:", err);
          const d = defaultsFor(questJson.questName);
          setQuestDetails(d);
          setTempDetails(d);
        } finally {
          setIsLoading(false);
        }
      } else {
        const d = defaultsFor("");
        setQuestDetails(d);
        setTempDetails(d);
      }
    };

    loadQuestDetails();
  }, [questJson, onUpdateQuest]);

  const handleEdit = () => {
    setTempDetails(questDetails);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempDetails(questDetails);
    setIsEditing(false);
  };

  const handleSave = () => {
    // Update the in-memory details cache
    updateQuestInDatabase(tempDetails);

    // Update questJson in the parent
    if (!questJson) return;

    const updatedQuest = produce(questJson, (draft) => {
      draft.questDetails = tempDetails;
      if (tempDetails.Quest && tempDetails.Quest !== draft.questName) {
        draft.questName = tempDetails.Quest;
      }
    });
    onUpdateQuest(updatedQuest);

    // Update local display state
    setQuestDetails(tempDetails);
    setIsEditing(false);
  };

  const handleRefresh = async () => {
    if (!questJson?.questName) return;
    setIsLoading(true);
    try {
      const info = await getQuestInfo(questJson.questName);
      if (info) {
        setQuestDetails(info);
        setTempDetails(info);

        const updatedQuest = produce(questJson, (draft) => {
          if (!draft) return;
          draft.questDetails = info;
        });
        onUpdateQuest(updatedQuest as Quest);
      }
    } catch (err) {
      console.error("Error refreshing quest details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (
    field: keyof QuestDetails,
    value: string | string[]
  ) => {
    setTempDetails((prev) => ({
      ...prev,
      [field]: value as never,
    }));
  };

  const handleArrayItemChange = (
    field: "Requirements" | "ItemsRequired" | "Recommended" | "EnemiesToDefeat",
    index: number,
    value: string
  ) => {
    setTempDetails((prev) => {
      const next = [...prev[field]];
      next[index] = value;
      return { ...prev, [field]: next };
    });
  };

  const addArrayItem = (
    field: "Requirements" | "ItemsRequired" | "Recommended" | "EnemiesToDefeat"
  ) => {
    setTempDetails((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const removeArrayItem = (
    field: "Requirements" | "ItemsRequired" | "Recommended" | "EnemiesToDefeat",
    index: number
  ) => {
    setTempDetails((prev) => {
      const next = [...prev[field]];
      next.splice(index, 1);
      return { ...prev, [field]: next };
    });
  };

  const renderArrayField = (
    field: "Requirements" | "ItemsRequired" | "Recommended" | "EnemiesToDefeat",
    title: string
  ) => {
    const items = isEditing ? tempDetails[field] : questDetails[field];

    return (
      <div className="quest-array-field">
        <h4>{title}</h4>
        {isEditing ? (
          <div className="array-items">
            {items.map((item, index) => (
              <div key={index} className="array-item">
                <input
                  type="text"
                  value={item}
                  onChange={(e) =>
                    handleArrayItemChange(field, index, e.target.value)
                  }
                  className="array-input"
                />
                <button
                  onClick={() => removeArrayItem(field, index)}
                  className="array-remove-button"
                  title="Remove item"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem(field)}
              className="array-add-button"
              title="Add new item"
            >
              <IconPlus size={16} /> Add Item
            </button>
          </div>
        ) : (
          <ul className="array-display">
            {items.length > 0 ? (
              items.map((item, index) => <li key={index}>{item}</li>)
            ) : (
              <li className="empty-array">None</li>
            )}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className={`quest-details-editor ${isCollapsed ? "collapsed" : ""}`}>
      <div className="quest-details-header">
        <h3>Quest Details</h3>
        <div className="quest-details-actions">
          {questJson?.questName && !isEditing && (
            <button
              onClick={handleRefresh}
              className="refresh-button"
              title="Refresh quest data from database"
              disabled={isLoading}
            >
              <IconRefresh size={18} />
            </button>
          )}
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="save-button"
                title="Save changes"
              >
                <IconDeviceFloppy size={18} />
              </button>
              <button
                onClick={handleCancel}
                className="cancel-button"
                title="Cancel editing"
              >
                <IconX size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={handleEdit}
              className="edit-button"
              title="Edit quest details"
            >
              <IconEdit size={18} />
            </button>
          )}
          <button
            onClick={() => setIsCollapsed((c) => !c)}
            className="collapse-button"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? "▼" : "▲"}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="quest-details-content">
          {isLoading ? (
            <div className="quest-details-loading">
              <div className="loading-spinner"></div>
              <p>Loading quest details...</p>
            </div>
          ) : isEditing ? (
            <div className="quest-details-form">
              <div className="form-field">
                <label>Quest Name</label>
                <input
                  type="text"
                  value={tempDetails.Quest}
                  onChange={(e) => handleFieldChange("Quest", e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-field">
                <label>Start Point</label>
                <input
                  type="text"
                  value={tempDetails.StartPoint}
                  onChange={(e) =>
                    handleFieldChange("StartPoint", e.target.value)
                  }
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Member Requirement</label>
                  <select
                    value={tempDetails.MemberRequirement}
                    onChange={(e) =>
                      handleFieldChange("MemberRequirement", e.target.value)
                    }
                    className="form-select"
                  >
                    <option value="Free to Play">Free to Play</option>
                    <option value="Members Only">Members Only</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Official Length</label>
                  <select
                    value={tempDetails.OfficialLength}
                    onChange={(e) =>
                      handleFieldChange("OfficialLength", e.target.value)
                    }
                    className="form-select"
                  >
                    <option value="Very Short">Very Short</option>
                    <option value="Short">Short</option>
                    <option value="Short to Medium">Short to Medium</option>
                    <option value="Medium">Medium</option>
                    <option value="Medium to Long">Medium to Long</option>
                    <option value="Long">Long</option>
                    <option value="Very Long">Very Long</option>
                    <option value="Very Very Long">Very Very Long</option>
                  </select>
                </div>
              </div>

              {renderArrayField("Requirements", "Requirements")}
              {renderArrayField("ItemsRequired", "Items Required")}
              {renderArrayField("Recommended", "Recommended")}
              {renderArrayField("EnemiesToDefeat", "Enemies to Defeat")}
            </div>
          ) : (
            <div className="quest-details-display">
              <div className="detail-row">
                <span className="detail-label">Quest:</span>
                <span className="detail-value">
                  {questDetails.Quest || "Not set"}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Start Point:</span>
                <span className="detail-value">
                  {questDetails.StartPoint || "Not set"}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Member Requirement:</span>
                <span className="detail-value">
                  {questDetails.MemberRequirement}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Official Length:</span>
                <span className="detail-value">
                  {questDetails.OfficialLength}
                </span>
              </div>

              {questDetails.Requirements.length > 0 && (
                <div className="detail-section">
                  <h4>Requirements</h4>
                  <ul>
                    {questDetails.Requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {questDetails.ItemsRequired.length > 0 && (
                <div className="detail-section">
                  <h4>Items Required</h4>
                  <ul>
                    {questDetails.ItemsRequired.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {questDetails.Recommended.length > 0 && (
                <div className="detail-section">
                  <h4>Recommended</h4>
                  <ul>
                    {questDetails.Recommended.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {questDetails.EnemiesToDefeat.length > 0 && (
                <div className="detail-section">
                  <h4>Enemies to Defeat</h4>
                  <ul>
                    {questDetails.EnemiesToDefeat.map((enemy, i) => (
                      <li key={i}>{enemy}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
