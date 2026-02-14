import React, { useEffect, useRef, useState } from "react";
import { autoGrow } from "./../../state/editorStore";
import type { StepCompletionConditions, QuestHighlights } from "../../state/types";
import { searchItems, type ItemSearchRow } from "../../api/itemApi";

export interface CompletionConditionsSectionProps {
  value: StepCompletionConditions | null;
  onChange: (v: StepCompletionConditions | null) => void;
  highlights: QuestHighlights;
  stepDialogOptions?: string[];
}

type ConditionType = "dialog" | "location" | "items" | "mixed" | "none";

export const CompletionConditionsSection: React.FC<
  CompletionConditionsSectionProps
> = ({ value, onChange, highlights, stepDialogOptions }) => {
  const [type, setType] = useState<ConditionType>(value?.type ?? "none");
  const [dialogText, setDialogText] = useState<string>(
    value?.dialog?.join("\n") ?? ""
  );
  const [locations, setLocations] = useState<
    Array<{ lat: number; lng: number; floor?: number; radius?: number }>
  >(value?.location ?? []);
  const [items, setItems] = useState<
    Array<{ name: string; quantity: number }>
  >(value?.items ?? []);

  // Item search state
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [itemSearchResults, setItemSearchResults] = useState<ItemSearchRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);

  // Sync from parent
  useEffect(() => {
    setType(value?.type ?? "none");
    setDialogText(value?.dialog?.join("\n") ?? "");
    setLocations(value?.location ?? []);
    setItems(value?.items ?? []);
  }, [value]);

  useEffect(() => {
    if (taRef.current) autoGrow(taRef.current);
  }, [dialogText]);

  // Debounced item search
  useEffect(() => {
    if (itemSearchTerm.trim().length < 2) {
      setItemSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchItems(itemSearchTerm, 20);
        setItemSearchResults(results);
      } catch {
        setItemSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [itemSearchTerm]);

  // Build available highlight locations
  const availableLocations = React.useMemo(() => {
    const locs: Array<{ label: string; lat: number; lng: number; floor: number }> = [];
    for (const npc of highlights.npc) {
      locs.push({
        label: `NPC: ${npc.npcName}`,
        lat: npc.npcLocation.lat,
        lng: npc.npcLocation.lng,
        floor: npc.floor ?? 0,
      });
    }
    for (const obj of highlights.object) {
      for (const pt of obj.objectLocation) {
        locs.push({
          label: `Object: ${obj.name}`,
          lat: pt.lat,
          lng: pt.lng,
          floor: obj.floor ?? 0,
        });
      }
    }
    return locs;
  }, [highlights]);

  // --- Helpers to build and emit conditions ---
  const buildConditions = (
    overrideType?: ConditionType,
    overrideDialog?: string,
    overrideLocs?: typeof locations,
    overrideItems?: typeof items
  ): StepCompletionConditions | null => {
    const t = overrideType ?? type;
    if (t === "none") return null;
    const dText = overrideDialog ?? dialogText;
    const locs = overrideLocs ?? locations;
    const itms = overrideItems ?? items;
    return {
      type: t,
      ...(t === "dialog" || t === "mixed"
        ? {
            dialog: dText
              .split(/\r?\n/)
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : {}),
      ...(t === "location" || t === "mixed" ? { location: locs } : {}),
      ...(t === "items" || t === "mixed" ? { items: itms } : {}),
    };
  };

  const handleTypeChange = (newType: ConditionType) => {
    setType(newType);
    if (newType === "none") {
      onChange(null);
      return;
    }

    // Auto-populate dialog from step's Dialog Options when switching to dialog/mixed
    let newDialogText = dialogText;
    if (
      (newType === "dialog" || newType === "mixed") &&
      !dialogText.trim() &&
      stepDialogOptions &&
      stepDialogOptions.length > 0
    ) {
      newDialogText = stepDialogOptions.join("\n");
      setDialogText(newDialogText);
    }

    onChange(buildConditions(newType, newDialogText));
  };

  const handleDialogBlur = () => {
    if (type === "none") return;
    onChange(buildConditions());
  };

  // Location: add from highlight picker
  const handleAddHighlightLocation = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value);
    if (isNaN(idx) || idx < 0) return;
    const loc = availableLocations[idx];
    if (!loc) return;
    const newLocs = [...locations, { lat: loc.lat, lng: loc.lng, floor: loc.floor, radius: 1 }];
    setLocations(newLocs);
    if (type !== "none") onChange(buildConditions(undefined, undefined, newLocs));
    e.target.value = ""; // reset select
  };

  const handleLocationFieldChange = (
    index: number,
    field: "floor" | "radius",
    val: number
  ) => {
    const newLocs = [...locations];
    newLocs[index] = { ...newLocs[index], [field]: val };
    setLocations(newLocs);
    if (type !== "none") onChange(buildConditions(undefined, undefined, newLocs));
  };

  const removeLocation = (index: number) => {
    const newLocs = locations.filter((_, i) => i !== index);
    setLocations(newLocs);
    if (type !== "none") onChange(buildConditions(undefined, undefined, newLocs));
  };

  // Items: add from search results
  const handleAddItem = (item: ItemSearchRow) => {
    // Don't add duplicates
    if (items.some((i) => i.name.toLowerCase() === item.name.toLowerCase())) return;
    const newItems = [...items, { name: item.name, quantity: 1 }];
    setItems(newItems);
    setItemSearchTerm("");
    setItemSearchResults([]);
    if (type !== "none") onChange(buildConditions(undefined, undefined, undefined, newItems));
  };

  const handleItemQuantityChange = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], quantity: Math.max(1, quantity) };
    setItems(newItems);
    if (type !== "none") onChange(buildConditions(undefined, undefined, undefined, newItems));
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    if (type !== "none") onChange(buildConditions(undefined, undefined, undefined, newItems));
  };

  const showDialog = type === "dialog" || type === "mixed";
  const showLocation = type === "location" || type === "mixed";
  const showItems = type === "items" || type === "mixed";

  return (
    <div className="panel-section">
      <div className="item-list full-width">
        <strong>Completion Conditions</strong>

        {/* Type Selector */}
        <label style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: 12
        }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem", fontWeight: 500 }}>
            Condition Type
          </span>
          <select
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as ConditionType)}
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: `1px solid var(--border-subtle)`,
              borderRadius: "var(--radius-md)",
              fontSize: "0.95rem",
              cursor: "pointer",
              transition: "border-color var(--transition-base)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
            }}
          >
            <option value="none">None</option>
            <option value="dialog">Dialog</option>
            <option value="location">Location</option>
            <option value="items">Items</option>
            <option value="mixed">Mixed</option>
          </select>
        </label>

        {/* Dialog Section */}
        {showDialog && (
          <div style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: `1px solid var(--border-subtle)`
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10
            }}>
              <div style={{
                width: 3,
                height: 16,
                background: "var(--accent-info)",
                borderRadius: 2
              }} />
              <span style={{
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>
                Dialog Options
              </span>
            </div>
            <label style={{ display: "block", color: "var(--text-muted)", marginBottom: 6, fontSize: "0.85rem" }}>
              Enter dialog options, one per line:
            </label>
            <textarea
              ref={taRef}
              value={dialogText}
              onChange={(e) => setDialogText(e.target.value)}
              rows={1}
              placeholder="Enter dialog options, one per line"
              style={{
                resize: "none",
                overflow: "hidden",
                width: "100%",
                padding: 10,
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                border: `1px solid var(--border-subtle)`,
                borderRadius: "var(--radius-md)",
                fontSize: "0.9rem",
                transition: "border-color var(--transition-base)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-primary)";
              }}
              onBlur={(e) => {
                handleDialogBlur();
                e.currentTarget.style.borderColor = "var(--border-subtle)";
              }}
            />
          </div>
        )}

        {/* Location Section */}
        {showLocation && (
          <div style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: `1px solid var(--border-subtle)`
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10
            }}>
              <div style={{
                width: 3,
                height: 16,
                background: "var(--accent-warning)",
                borderRadius: 2
              }} />
              <span style={{
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>
                Location Requirements
              </span>
            </div>
            <label style={{ display: "block", color: "var(--text-muted)", marginBottom: 8, fontSize: "0.85rem" }}>
              Locations from step highlights — player must reach ALL:
            </label>

            {availableLocations.length > 0 ? (
              <select
                defaultValue=""
                onChange={handleAddHighlightLocation}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  border: `1px solid var(--border-subtle)`,
                  borderRadius: "var(--radius-md)",
                  marginBottom: 12,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "border-color var(--transition-base)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                }}
              >
                <option value="" disabled>
                  Select a highlight to add...
                </option>
                {availableLocations.map((loc, i) => (
                  <option key={i} value={i}>
                    {loc.label} ({loc.lat.toFixed(1)}, {loc.lng.toFixed(1)}, Floor {loc.floor})
                  </option>
                ))}
              </select>
            ) : (
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                  fontStyle: "italic",
                  marginBottom: 12,
                  padding: 12,
                  background: "var(--bg-surface)",
                  borderRadius: "var(--radius-md)",
                  border: `1px dashed var(--border-subtle)`,
                }}
              >
                No NPC or Object highlights on this step. Add highlights first.
              </div>
            )}

            {locations.map((loc, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginBottom: 10,
                  padding: 12,
                  background: "var(--bg-elevated)",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid var(--border-subtle)`,
                  borderLeft: `3px solid var(--accent-warning)`,
                  transition: "background var(--transition-base)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--bg-elevated)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-primary)", fontSize: "0.9rem" }}>
                    <strong style={{ color: "var(--accent-primary)" }}>#{i + 1}</strong>{" "}
                    ({loc.lat.toFixed(1)}, {loc.lng.toFixed(1)})
                  </span>
                  <button
                    onClick={() => removeLocation(i)}
                    style={{
                      width: 24,
                      height: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--bg-surface)",
                      color: "var(--accent-danger)",
                      border: `1px solid var(--border-subtle)`,
                      borderRadius: "var(--radius-full)",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      transition: "all var(--transition-base)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--accent-danger)";
                      e.currentTarget.style.color = "#fff";
                      e.currentTarget.style.borderColor = "var(--accent-danger)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--bg-surface)";
                      e.currentTarget.style.color = "var(--accent-danger)";
                      e.currentTarget.style.borderColor = "var(--border-subtle)";
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                    fontWeight: 500
                  }}>
                    Floor
                    <input
                      type="number"
                      value={loc.floor ?? 0}
                      onChange={(e) =>
                        handleLocationFieldChange(i, "floor", parseInt(e.target.value) || 0)
                      }
                      style={{
                        width: 48,
                        padding: "4px 6px",
                        background: "var(--bg-surface)",
                        color: "var(--text-primary)",
                        border: `1px solid var(--border-subtle)`,
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.85rem",
                        textAlign: "center",
                      }}
                    />
                  </label>
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                    fontWeight: 500
                  }}>
                    Radius
                    <input
                      type="number"
                      value={loc.radius ?? 1}
                      onChange={(e) =>
                        handleLocationFieldChange(i, "radius", parseFloat(e.target.value) || 1)
                      }
                      style={{
                        width: 48,
                        padding: "4px 6px",
                        background: "var(--bg-surface)",
                        color: "var(--text-primary)",
                        border: `1px solid var(--border-subtle)`,
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.85rem",
                        textAlign: "center",
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Items Section */}
        {showItems && (
          <div style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: `1px solid var(--border-subtle)`
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10
            }}>
              <div style={{
                width: 3,
                height: 16,
                background: "var(--accent-success)",
                borderRadius: 2
              }} />
              <span style={{
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>
                Items Required
              </span>
            </div>

            {/* Item search input */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input
                type="text"
                value={itemSearchTerm}
                onChange={(e) => setItemSearchTerm(e.target.value)}
                placeholder="Search items by name..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  border: `1px solid var(--border-subtle)`,
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.9rem",
                  transition: "border-color var(--transition-base)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-primary)";
                }}
                onBlur={(e) => {
                  setTimeout(() => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                  }, 200);
                }}
              />
              {isSearching && (
                <div style={{
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                  marginTop: 4,
                  paddingLeft: 4
                }}>
                  Searching...
                </div>
              )}
              {itemSearchResults.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "var(--bg-elevated)",
                    border: `1px solid var(--border-default)`,
                    borderRadius: "var(--radius-md)",
                    maxHeight: 240,
                    overflowY: "auto",
                    zIndex: 10,
                    boxShadow: "var(--shadow-md)",
                    marginTop: 4,
                  }}
                >
                  {itemSearchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleAddItem(item)}
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        color: "var(--text-primary)",
                        borderBottom: `1px solid var(--border-subtle)`,
                        fontSize: "0.9rem",
                        transition: "all var(--transition-fast)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg-hover)";
                        e.currentTarget.style.paddingLeft = "16px";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.paddingLeft = "12px";
                      }}
                    >
                      {item.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected items list */}
            {items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr auto",
                  gap: 10,
                  marginBottom: 10,
                  padding: 12,
                  background: "var(--bg-elevated)",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid var(--border-subtle)`,
                  borderLeft: `3px solid var(--accent-success)`,
                  alignItems: "center",
                  transition: "background var(--transition-base)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--bg-elevated)";
                }}
              >
                <span style={{
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  fontWeight: 500
                }}>
                  {item.name}
                </span>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    handleItemQuantityChange(i, parseInt(e.target.value) || 1)
                  }
                  style={{
                    padding: "6px 8px",
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    border: `1px solid var(--border-subtle)`,
                    borderRadius: "var(--radius-sm)",
                    width: "100%",
                    fontSize: "0.9rem",
                    textAlign: "center",
                  }}
                />
                <button
                  onClick={() => removeItem(i)}
                  style={{
                    width: 28,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--bg-surface)",
                    color: "var(--accent-danger)",
                    border: `1px solid var(--border-subtle)`,
                    borderRadius: "var(--radius-full)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    transition: "all var(--transition-base)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--accent-danger)";
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.borderColor = "var(--accent-danger)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--bg-surface)";
                    e.currentTarget.style.color = "var(--accent-danger)";
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompletionConditionsSection;
