// src/app/containers/MapLocationEditor.tsx
// Editor panel for managing map locations (areas) in the database

import React, { useState, useEffect, useCallback } from "react";
import {
  getMapLocations,
  createMapLocation,
  updateMapLocation,
  deleteMapLocation,
  getNextMapId,
  type MapLocation,
} from "../../api/mapLocationsApi";
import {
  EditorStore,
  requestCaptureNavReturn,
  requestFlyToAreaAt,
} from "../../state/editorStore";
import type { MapArea } from "../../state/model";

interface EditingLocation {
  mapId: number;
  name: string;
  centerLat: string;
  centerLng: string;
  boundsMinLat: string;
  boundsMinLng: string;
  boundsMaxLat: string;
  boundsMaxLng: string;
  isNew?: boolean;
}

const emptyEditForm = (): EditingLocation => ({
  mapId: 0,
  name: "",
  centerLat: "",
  centerLng: "",
  boundsMinLat: "",
  boundsMinLng: "",
  boundsMaxLat: "",
  boundsMaxLng: "",
  isNew: true,
});

export const MapLocationEditor: React.FC = () => {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editing state
  const [editingLocation, setEditingLocation] = useState<EditingLocation | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await getMapLocations(search, 200);
      setLocations(results);
    } catch (err) {
      setError("Failed to fetch map locations");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  // Initial load
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLocations();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchLocations]);

  // Clear success message after 3s
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Start editing an existing location
  const handleEdit = (loc: MapLocation) => {
    setEditingLocation({
      mapId: loc.mapId,
      name: loc.name,
      centerLat: String(loc.center[0]),
      centerLng: String(loc.center[1]),
      boundsMinLat: String(loc.bounds[0][0]),
      boundsMinLng: String(loc.bounds[0][1]),
      boundsMaxLat: String(loc.bounds[1][0]),
      boundsMaxLng: String(loc.bounds[1][1]),
      isNew: false,
    });
    setError(null);
  };

  // Start creating a new location
  const handleNew = async () => {
    try {
      const nextId = await getNextMapId();
      setEditingLocation({
        ...emptyEditForm(),
        mapId: nextId,
      });
      setError(null);
    } catch (err) {
      // Fallback: calculate from current max
      const maxId = locations.reduce((max, loc) => Math.max(max, loc.mapId), 0);
      setEditingLocation({
        ...emptyEditForm(),
        mapId: maxId + 1,
      });
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingLocation(null);
    setError(null);
  };

  // Save location (create or update)
  const handleSave = async () => {
    if (!editingLocation) return;

    // Validate
    const { mapId, name, centerLat, centerLng, boundsMinLat, boundsMinLng, boundsMaxLat, boundsMaxLng } = editingLocation;

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const center: [number, number] = [parseInt(centerLat, 10), parseInt(centerLng, 10)];
    const bounds: [[number, number], [number, number]] = [
      [parseInt(boundsMinLat, 10), parseInt(boundsMinLng, 10)],
      [parseInt(boundsMaxLat, 10), parseInt(boundsMaxLng, 10)],
    ];

    if (center.some(isNaN) || bounds.flat().some(isNaN)) {
      setError("All coordinate fields must be valid numbers");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (editingLocation.isNew) {
        await createMapLocation({ mapId, name: name.trim(), center, bounds });
        setSuccessMsg(`Created "${name.trim()}" (ID: ${mapId})`);
      } else {
        await updateMapLocation(mapId, { name: name.trim(), center, bounds });
        setSuccessMsg(`Updated "${name.trim()}"`);
      }
      setEditingLocation(null);
      fetchLocations();
    } catch (err: any) {
      setError(err?.message || "Failed to save location");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete location
  const handleDelete = async (loc: MapLocation) => {
    if (!window.confirm(`Delete "${loc.name}" (ID: ${loc.mapId})? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteMapLocation(loc.mapId);
      setSuccessMsg(`Deleted "${loc.name}"`);
      fetchLocations();
      if (editingLocation?.mapId === loc.mapId) {
        setEditingLocation(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to delete location");
    }
  };

  // Update editing form field
  const updateField = (field: keyof EditingLocation, value: string) => {
    if (!editingLocation) return;
    setEditingLocation({ ...editingLocation, [field]: value });
  };

  // View location on map
  const handleViewOnMap = (loc: MapLocation) => {
    // Convert MapLocation to MapArea format
    const area: MapArea = {
      mapId: loc.mapId,
      name: loc.name,
      center: loc.center,
      bounds: loc.bounds,
    };

    // Capture current view for "Back" button
    if (!EditorStore.getState().ui.navReturn) {
      requestCaptureNavReturn(true);
    }

    // Highlight the area and fly to it
    EditorStore.setHighlights({ selectedArea: area });
    requestFlyToAreaAt(area, 2);
  };

  // Styles
  const panelStyle: React.CSSProperties = {
    background: "#111827",
    borderRadius: 8,
    padding: 16,
    color: "#e5e7eb",
  };

  const inputStyle: React.CSSProperties = {
    padding: "6px 10px",
    fontSize: 13,
    background: "#1e293b",
    border: "1px solid #374151",
    borderRadius: 4,
    color: "#e5e7eb",
    width: "100%",
  };

  const btnStyle: React.CSSProperties = {
    padding: "6px 12px",
    fontSize: 12,
    borderRadius: 4,
    border: "none",
    cursor: "pointer",
  };

  const primaryBtn: React.CSSProperties = {
    ...btnStyle,
    background: "#2563eb",
    color: "#fff",
  };

  const dangerBtn: React.CSSProperties = {
    ...btnStyle,
    background: "#7f1d1d",
    color: "#fecaca",
  };

  const secondaryBtn: React.CSSProperties = {
    ...btnStyle,
    background: "#374151",
    color: "#e5e7eb",
  };

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Map Locations Editor</h3>
        <button onClick={handleNew} style={primaryBtn}>
          + New Location
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search locations..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...inputStyle, marginBottom: 12 }}
      />

      {/* Messages */}
      {error && (
        <div style={{ background: "#7f1d1d", color: "#fecaca", padding: 8, borderRadius: 4, marginBottom: 12, fontSize: 13 }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ background: "#065f46", color: "#6ee7b7", padding: 8, borderRadius: 4, marginBottom: 12, fontSize: 13 }}>
          {successMsg}
        </div>
      )}

      {/* Edit Form */}
      {editingLocation && (
        <div style={{ background: "#1f2937", padding: 12, borderRadius: 6, marginBottom: 12, border: "1px solid #374151" }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: 14, color: "#93c5fd" }}>
            {editingLocation.isNew ? "New Location" : `Editing: ${editingLocation.name}`}
          </h4>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 2 }}>Map ID</label>
              <input
                type="number"
                value={editingLocation.mapId}
                onChange={(e) => updateField("mapId", e.target.value)}
                disabled={!editingLocation.isNew}
                style={{ ...inputStyle, opacity: editingLocation.isNew ? 1 : 0.6 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 2 }}>Name *</label>
              <input
                type="text"
                value={editingLocation.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Location name"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Center Coordinates</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 2 }}>Center Lat</label>
              <input
                type="number"
                value={editingLocation.centerLat}
                onChange={(e) => updateField("centerLat", e.target.value)}
                placeholder="e.g. 2440"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 2 }}>Center Lng</label>
              <input
                type="number"
                value={editingLocation.centerLng}
                onChange={(e) => updateField("centerLng", e.target.value)}
                placeholder="e.g. 4420"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Bounds (Min → Max)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 2 }}>Min Lat</label>
              <input
                type="number"
                value={editingLocation.boundsMinLat}
                onChange={(e) => updateField("boundsMinLat", e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 2 }}>Min Lng</label>
              <input
                type="number"
                value={editingLocation.boundsMinLng}
                onChange={(e) => updateField("boundsMinLng", e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 2 }}>Max Lat</label>
              <input
                type="number"
                value={editingLocation.boundsMaxLat}
                onChange={(e) => updateField("boundsMaxLat", e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 2 }}>Max Lng</label>
              <input
                type="number"
                value={editingLocation.boundsMaxLng}
                onChange={(e) => updateField("boundsMaxLng", e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave} disabled={isSaving} style={primaryBtn}>
              {isSaving ? "Saving..." : editingLocation.isNew ? "Create" : "Update"}
            </button>
            <button onClick={handleCancel} style={secondaryBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Location List */}
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        {isLoading && <div style={{ color: "#6b7280", padding: 12 }}>Loading...</div>}

        {!isLoading && locations.length === 0 && (
          <div style={{ color: "#6b7280", padding: 12, textAlign: "center" }}>
            {search ? "No locations match your search" : "No locations found"}
          </div>
        )}

        {locations.map((loc) => (
          <div
            key={loc.mapId}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 10px",
              borderBottom: "1px solid #1f2937",
              background: editingLocation?.mapId === loc.mapId ? "rgba(37, 99, 235, 0.1)" : "transparent",
            }}
          >
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => handleViewOnMap(loc)} title="Click to view on map">
              <div style={{ fontWeight: 500, fontSize: 13, color: "#93c5fd" }}>{loc.name}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                ID: {loc.mapId} | Center: [{loc.center[0]}, {loc.center[1]}]
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => handleViewOnMap(loc)}
                style={{ ...btnStyle, background: "#065f46", color: "#6ee7b7" }}
                title="View on map"
              >
                📍
              </button>
              <button onClick={() => handleEdit(loc)} style={secondaryBtn}>
                Edit
              </button>
              <button onClick={() => handleDelete(loc)} style={dangerBtn}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 12, textAlign: "right" }}>
        {locations.length} location{locations.length !== 1 ? "s" : ""} loaded
      </div>
    </div>
  );
};

export default MapLocationEditor;
