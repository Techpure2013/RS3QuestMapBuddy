// src/editor/sections/ObjectSearch.tsx
import React, { useState, useEffect } from "react";

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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);

  const listRef = React.useRef<HTMLUListElement>(null);

  // Cache for letter-based search
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
      setShowCycler(false); // Default to list view for area search
    }
  }, [areaSearchResults, searchMode]);

  // Scroll into view for keyboard navigation
  useEffect(() => {
    if (isKeyboardNav && highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex, isKeyboardNav]);

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
        // Try multiple possible paths
        const possiblePaths = [
          `/Objects_By_Letter/${firstLetter}.json`,
          `/public/Objects_By_Letter/${firstLetter}.json`,
          `./Objects_By_Letter/${firstLetter}.json`,
        ];

        let response: Response | null = null;
        let lastError: Error | null = null;

        for (const path of possiblePaths) {
          try {
            response = await fetch(path);
            if (response.ok) break;
          } catch (err) {
            lastError = err as Error;
            console.warn(`Failed to fetch from ${path}:`, err);
          }
        }

        if (!response || !response.ok) {
          throw lastError || new Error("All paths failed");
        }

        const jsonData: MapObject[] = await response.json();
        setDataCache((prev) => ({ ...prev, [firstLetter]: jsonData }));
        searchData = jsonData;
      } catch (error) {
        console.error("Failed to fetch object data:", error);
        alert(
          `Failed to load object data for letter "${firstLetter}". ` +
            `Make sure Objects_By_Letter/${firstLetter}.json exists in your public folder.`
        );
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
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleNameSearch();
      return;
    }

    if (!allMatches.length || showCycler) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setIsKeyboardNav(true);
        setHighlightedIndex((prev) =>
          prev < allMatches.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setIsKeyboardNav(true);
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Escape":
        e.preventDefault();
        setHighlightedIndex(-1);
        setIsKeyboardNav(false);
        break;
    }
  };

  const handleModeChange = (mode: "name" | "area") => {
    setSearchMode(mode);
    setSearchTerm("");
    setAllMatches([]);
    setCurrentIndex(-1);
    setHighlightedIndex(-1);
    onClearAreaSearchResults();

    // Deactivate area search when switching modes
    if (mode === "name") {
      onToggleAreaSearch(false);
    }
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
      setHighlightedIndex(-1);
    }
  };

  const handleMouseEnter = (index: number) => {
    setIsKeyboardNav(false);
    setHighlightedIndex(index);
    if (!showCycler) {
      onObjectHighlight(allMatches[index]);
    }
  };

  const handleMouseLeave = () => {
    if (!showCycler) {
      onObjectHighlight(null);
    }
  };

  return (
    <div className="search-container">
      <div className="control-group">
        <label>Object Search</label>
      </div>

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
          placeholder="Type object name (min 3 chars) and press Enter"
          className="search-input"
        />
      )}

      {searchMode === "area" && (
        <div className="area-search-controls">
          <button
            onClick={() => onToggleAreaSearch(!isAreaSearchActive)}
            className={`area-search-toggle ${
              isAreaSearchActive ? "active" : ""
            }`}
          >
            {isAreaSearchActive ? (
              <>
                <span className="pulse-indicator"></span>
                Click on map to search...
              </>
            ) : (
              "Activate Area Search"
            )}
          </button>
          {isAreaSearchActive && (
            <p className="help-text">
              Click anywhere on the map to search for objects in that area
            </p>
          )}
        </div>
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
        <ul
          className="search-results"
          ref={listRef}
          onMouseLeave={handleMouseLeave}
        >
          {allMatches.map((obj, index) => (
            <li
              key={`${obj.id}-${index}`}
              onClick={() => onObjectSelect(obj)}
              onMouseEnter={() => handleMouseEnter(index)}
              className={index === highlightedIndex ? "highlighted" : ""}
            >
              {obj.name} (F{obj.floor})
            </li>
          ))}
        </ul>
      )}

      {searchMode === "name" &&
        searchTerm.length >= 3 &&
        !isLoading &&
        allMatches.length === 0 && (
          <div className="search-no-results">
            No objects found matching "{searchTerm}"
          </div>
        )}
    </div>
  );
};
