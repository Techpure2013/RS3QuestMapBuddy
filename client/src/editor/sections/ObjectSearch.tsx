import React, { useState, useEffect } from "react";

// Define the structure of an Object from your JSON files
export interface MapObject {
  id: number;
  name: string;
  file: string;
  lng: number;
  lat: number;
  floor: number;
  center: [number, number];
}

interface ObjectSearchProps {
  onObjectSelect: (obj: MapObject) => void;
  onObjectHighlight: (obj: MapObject | null) => void;
  isAreaSearchActive: boolean;
  onToggleAreaSearch: (isActive: boolean) => void;
  areaSearchResults: MapObject[];
  onClearAreaSearchResults: () => void;
}

export const ObjectSearch: React.FC<ObjectSearchProps> = ({
  onObjectSelect,
  onObjectHighlight,
  isAreaSearchActive,
  onToggleAreaSearch,
  areaSearchResults,
  onClearAreaSearchResults,
}) => {
  const [searchMode, setSearchMode] = useState<"name" | "area">("name");
  const [searchTerm, setSearchTerm] = useState("");
  const [allMatches, setAllMatches] = useState<MapObject[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [showCycler, setShowCycler] = useState(false);

  // --- RESTORED: Cache for the letter-based name search ---
  const [dataCache, setDataCache] = useState<Record<string, MapObject[]>>({});

  // Highlight the current object when the index changes (for cycler view)
  useEffect(() => {
    if (showCycler && currentIndex >= 0 && allMatches[currentIndex]) {
      onObjectHighlight(allMatches[currentIndex]);
    } else if (showCycler) {
      onObjectHighlight(null);
    }
  }, [currentIndex, allMatches, onObjectHighlight, showCycler]);

  // Listen for results from the area search
  useEffect(() => {
    if (searchMode === "area" && areaSearchResults.length > 0) {
      setAllMatches(areaSearchResults);
      setCurrentIndex(0);
    }
  }, [areaSearchResults, searchMode]);

  const handleNameSearch = async () => {
    if (searchTerm.length < 3) {
      setAllMatches([]);
      setCurrentIndex(-1);
      onObjectHighlight(null);
      return;
    }

    onClearAreaSearchResults();
    const firstLetter = searchTerm[0].toUpperCase();
    let searchData: MapObject[] = [];

    if (dataCache[firstLetter]) {
      searchData = dataCache[firstLetter];
    } else {
      setIsLoading(true);
      try {
        const response = await fetch(`/Objects_By_Letter/${firstLetter}.json`);
        if (!response.ok) throw new Error("File not found");
        const jsonData: MapObject[] = await response.json();
        setDataCache((prev) => ({ ...prev, [firstLetter]: jsonData }));
        searchData = jsonData;
      } catch (error) {
        console.error("Failed to fetch object data:", error);
        setAllMatches([]);
        setCurrentIndex(-1);
        return;
      } finally {
        setIsLoading(false);
      }
    }

    const results = searchData.filter((obj) =>
      obj.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setAllMatches(results);
    setCurrentIndex(results.length > 0 ? 0 : -1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNameSearch(); // Call the restored name search function
    }
  };

  const handleModeChange = (mode: "name" | "area") => {
    setSearchMode(mode);
    setSearchTerm("");
    setAllMatches([]);
    setCurrentIndex(-1);
    onClearAreaSearchResults();
    onToggleAreaSearch(false);
  };

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
          className="search-input"
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
          <div
            className="npc-cycler-info"
            title={allMatches[currentIndex]?.name}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {allMatches[currentIndex]?.name} (F
              {allMatches[currentIndex]?.floor})
            </span>
            <span>
              {currentIndex + 1} of {allMatches.length}
            </span>
          </div>
          <div className="npc-cycler-buttons">
            <button onClick={handlePrevious}>Previous</button>
            <button onClick={handleNext}>Next</button>
          </div>
          <button onClick={handleChoose} className="button--add">
            Choose this Object
          </button>
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
