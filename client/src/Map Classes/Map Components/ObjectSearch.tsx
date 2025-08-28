import React, { useState, useEffect } from "react";

// Define the structure of an Object from your JSON files
export interface MapObject {
  id: number;
  name: string;
  file: string;
  lng: number;
  lat: number;
  floor: number;
}

interface ObjectSearchProps {
  onObjectSelect: (obj: MapObject) => void;
  onObjectHighlight: (obj: MapObject | null) => void;
  isAreaSearchActive: boolean;
  onToggleAreaSearch: (isActive: boolean) => void;
  areaSearchResults: MapObject[];
  onClearAreaSearchResults: () => void;
}

// This will store the loaded index file so we only fetch it once.
let nameIndexCache: Record<string, string[]> | null = null;

export const ObjectSearch: React.FC<ObjectSearchProps> = ({
  onObjectSelect,
  onObjectHighlight,
  isAreaSearchActive,
  onToggleAreaSearch,
  areaSearchResults,
  onClearAreaSearchResults,
}) => {
  // --- NEW: State to control which search UI is shown ---
  const [searchMode, setSearchMode] = useState<"name" | "area">("name");

  const [searchTerm, setSearchTerm] = useState("");
  const [allMatches, setAllMatches] = useState<MapObject[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [showCycler, setShowCycler] = useState(false);

  // Highlight the current object when the index changes (for cycler view)
  useEffect(() => {
    if (showCycler && currentIndex >= 0 && allMatches[currentIndex]) {
      onObjectHighlight(allMatches[currentIndex]);
    } else if (showCycler) {
      // Only clear the highlight if the cycler is active but has no valid index
      onObjectHighlight(null);
    }
  }, [currentIndex, allMatches, onObjectHighlight, showCycler]);

  // Listen for results from the area search
  useEffect(() => {
    if (areaSearchResults.length > 0) {
      setAllMatches(areaSearchResults);
      setCurrentIndex(0);
    }
  }, [areaSearchResults]);

  const handleSearch = async () => {
    // ... (This function remains exactly the same as before)
    if (searchTerm.length < 3) {
      setAllMatches([]);
      setCurrentIndex(-1);
      onObjectHighlight(null);
      return;
    }
    setIsLoading(true);
    onClearAreaSearchResults();
    try {
      if (!nameIndexCache) {
        const response = await fetch("/object_name_index.json");
        if (!response.ok) throw new Error("Name index not found");
        nameIndexCache = await response.json();
      }
      const prefix = searchTerm.substring(0, 3).toLowerCase();
      const chunksToFetch = nameIndexCache[prefix] || [];
      if (chunksToFetch.length === 0) {
        setAllMatches([]);
        setCurrentIndex(-1);
        return;
      }
      const promises = chunksToFetch.map((chunkId) =>
        fetch(`/Objects_By_Chunk/${chunkId}.json`).then((res) =>
          res.ok ? res.json() : Promise.resolve([])
        )
      );
      const chunkResults = await Promise.all(promises);
      const allObjectsInChunks: MapObject[] = chunkResults.flat();
      const finalResults = allObjectsInChunks.filter((obj) =>
        obj.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setAllMatches(finalResults);
      setCurrentIndex(finalResults.length > 0 ? 0 : -1);
    } catch (error) {
      console.error("Failed to perform name search:", error);
      setAllMatches([]);
      setCurrentIndex(-1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  // --- NEW: Function to handle switching modes ---
  const handleModeChange = (mode: "name" | "area") => {
    setSearchMode(mode);
    // Clear all previous results and state when switching
    setSearchTerm("");
    setAllMatches([]);
    setCurrentIndex(-1);
    onClearAreaSearchResults();
    onToggleAreaSearch(false); // Ensure listening mode is off
  };

  // ... (handleNext, handlePrevious, handleChoose functions remain the same)
  const handleNext = () => {
    if (allMatches.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % allMatches.length);
  };
  const handlePrevious = () => {
    if (allMatches.length === 0) return;
    setCurrentIndex(
      (prev) => (prev - 1 + allMatches.length) % allMatches.length
    );
  };
  const handleChoose = () => {
    if (currentIndex >= 0 && allMatches[currentIndex]) {
      onObjectSelect(allMatches[currentIndex]);
      setSearchTerm("");
      setAllMatches([]);
      setCurrentIndex(-1);
    }
  };

  return (
    <div className="search-container">
      <strong>Object Search</strong>

      {/* --- NEW: The Mode Switcher UI --- */}
      <div className="search-mode-switcher">
        <button
          className={`switcher-button ${searchMode === "name" ? "active" : ""}`}
          onClick={() => handleModeChange("name")}
        >
          Search by Name
        </button>
        <button
          className={`switcher-button ${searchMode === "area" ? "active" : ""}`}
          onClick={() => handleModeChange("area")}
        >
          Search by Area
        </button>
      </div>

      {/* --- NEW: Conditionally Render Search Controls --- */}
      {searchMode === "name" && (
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a name and press Enter"
          className="search-input"
        />
      )}

      {searchMode === "area" && (
        <button
          onClick={() => onToggleAreaSearch(true)}
          className="search-input" /* Reuse style for consistency */
          style={{
            outline: isAreaSearchActive ? "2px solid #3b82f6" : "none",
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          {isAreaSearchActive
            ? "Click on the map to search..."
            : "Activate Area Search"}
        </button>
      )}

      {isLoading && <div className="search-loading">Loading...</div>}

      {allMatches.length > 0 && (
        <div className="control-group" style={{ marginTop: "8px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={showCycler}
              onChange={() => setShowCycler(!showCycler)}
            />
            Use Cycler View
          </label>
        </div>
      )}

      {allMatches.length > 0 && showCycler && (
        <div className="npc-cycler">
          {/* ... (cycler JSX remains the same) */}
        </div>
      )}

      {allMatches.length > 0 && !showCycler && (
        <ul className="search-results">
          {allMatches.map((obj, index) => (
            <li
              key={`${obj.id}-${index}`}
              onClick={() => onObjectSelect(obj)}
              onMouseEnter={() => onObjectHighlight(obj)}
              onMouseLeave={() => onObjectHighlight(null)}
            >
              {obj.name} (F{obj.floor})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
