import React, { useState, useEffect } from "react";
import { produce } from "immer";
import {
  IconEdit,
  IconDeviceFloppy,
  IconX,
  IconPlus,
  IconTrash,
  IconRefresh,
} from "@tabler/icons-react";
import { getQuestInfo, updateQuestInDatabase } from "./DetailsLoader";

interface QuestDetails {
  Quest: string;
  StartPoint: string;
  MemberRequirement: string;
  OfficialLength: string;
  Requirements: string[];
  ItemsRequired: string[];
  Recommended: string[];
  EnemiesToDefeat: string[];
}

interface QuestDetailsEditorProps {
  questJson: any;
  onUpdateQuest: (updatedQuest: any) => void;
}

export const QuestDetailsEditor: React.FC<QuestDetailsEditorProps> = ({
  questJson,
  onUpdateQuest,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [questDetails, setQuestDetails] = useState<QuestDetails>({
    Quest: "",
    StartPoint: "",
    MemberRequirement: "",
    OfficialLength: "",
    Requirements: [],
    ItemsRequired: [],
    Recommended: [],
    EnemiesToDefeat: [],
  });
  const [tempDetails, setTempDetails] = useState<QuestDetails>(questDetails);
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Initialize with quest data when it becomes available
  useEffect(() => {
    const loadQuestDetails = async () => {
      // If questJson already has questDetails, use it
      if (questJson && questJson.questDetails) {
        setQuestDetails(questJson.questDetails);
        setTempDetails(questJson.questDetails);
        return;
      }

      // If not, try to load from the quest database using questName
      if (questJson && questJson.questName) {
        setIsLoading(true);
        try {
          const questInfo = await getQuestInfo(questJson.questName);
          if (questInfo) {
            setQuestDetails(questInfo);
            setTempDetails(questInfo);

            // Automatically update the questJson with the loaded data
            const updatedQuest = produce(questJson, (draft: any) => {
              draft.questDetails = questInfo;
            });
            onUpdateQuest(updatedQuest);
          } else {
            // Set default values if no quest info found
            const defaultDetails: QuestDetails = {
              Quest: questJson.questName || "",
              StartPoint: "",
              MemberRequirement: "Free to play",
              OfficialLength: "Short",
              Requirements: [],
              ItemsRequired: [],
              Recommended: [],
              EnemiesToDefeat: [],
            };
            setQuestDetails(defaultDetails);
            setTempDetails(defaultDetails);

            // Add questDetails to questJson if it doesn't exist
            const updatedQuest = produce(questJson, (draft: any) => {
              draft.questDetails = defaultDetails;
            });
            onUpdateQuest(updatedQuest);
          }
        } catch (error) {
          console.error("Error loading quest data:", error);
          // Set default values on error
          const defaultDetails: QuestDetails = {
            Quest: questJson.questName || "",
            StartPoint: "",
            MemberRequirement: "Free to play",
            OfficialLength: "Short",
            Requirements: [],
            ItemsRequired: [],
            Recommended: [],
            EnemiesToDefeat: [],
          };
          setQuestDetails(defaultDetails);
          setTempDetails(defaultDetails);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Set default values if no questName provided
        const defaultDetails: QuestDetails = {
          Quest: "",
          StartPoint: "",
          MemberRequirement: "Free to play",
          OfficialLength: "Short",
          Requirements: [],
          ItemsRequired: [],
          Recommended: [],
          EnemiesToDefeat: [],
        };
        setQuestDetails(defaultDetails);
        setTempDetails(defaultDetails);
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
    // THIS IS THE KEY CHANGE
    // 1. Update the master database cache in the background
    updateQuestInDatabase(tempDetails);

    // 2. Update the currently loaded quest's state in the main app
    const updatedQuest = produce(questJson, (draft: any) => {
      draft.questDetails = tempDetails;
      if (tempDetails.Quest && tempDetails.Quest !== draft.questName) {
        draft.questName = tempDetails.Quest;
      }
    });
    onUpdateQuest(updatedQuest);

    // 3. Update the local component's display state
    setQuestDetails(tempDetails);
    setIsEditing(false);
  };

  const handleRefresh = async () => {
    if (!questJson || !questJson.questName) return;

    setIsLoading(true);
    try {
      const questInfo = await getQuestInfo(questJson.questName);
      if (questInfo) {
        setQuestDetails(questInfo);
        setTempDetails(questInfo);

        // Update the questJson with the refreshed data
        const updatedQuest = produce(questJson, (draft: any) => {
          draft.questDetails = questInfo;
        });
        onUpdateQuest(updatedQuest);
      }
    } catch (error) {
      console.error("Error refreshing quest data:", error);
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
      [field]: value,
    }));
  };

  const handleArrayItemChange = (
    field: "Requirements" | "ItemsRequired" | "Recommended" | "EnemiesToDefeat",
    index: number,
    value: string
  ) => {
    setTempDetails((prev) => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return {
        ...prev,
        [field]: newArray,
      };
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
      const newArray = [...prev[field]];
      newArray.splice(index, 1);
      return {
        ...prev,
        [field]: newArray,
      };
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
          {questJson && questJson.questName && !isEditing && (
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
            onClick={() => setIsCollapsed(!isCollapsed)}
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
                    <option value="Free to play">Free to play</option>
                    <option value="Members">Members</option>
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
                    <option value="Medium">Medium</option>
                    <option value="Long">Long</option>
                    <option value="Very Long">Very Long</option>
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
                    {questDetails.Requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {questDetails.ItemsRequired.length > 0 && (
                <div className="detail-section">
                  <h4>Items Required</h4>
                  <ul>
                    {questDetails.ItemsRequired.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {questDetails.Recommended.length > 0 && (
                <div className="detail-section">
                  <h4>Recommended</h4>
                  <ul>
                    {questDetails.Recommended.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {questDetails.EnemiesToDefeat.length > 0 && (
                <div className="detail-section">
                  <h4>Enemies to Defeat</h4>
                  <ul>
                    {questDetails.EnemiesToDefeat.map((enemy, index) => (
                      <li key={index}>{enemy}</li>
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
