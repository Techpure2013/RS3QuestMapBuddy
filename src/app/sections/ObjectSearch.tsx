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
  const [allMatches, setAllMatches] = useState<MapObject[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showCycler, setShowCycler] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);

  const listRef = React.useRef<HTMLUListElement>(null);

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
    if (areaSearchResults.length > 0) {
      setAllMatches(areaSearchResults);
      setCurrentIndex(0);
      setShowCycler(false); // Default to list view for area search
    }
  }, [areaSearchResults]);

  // Scroll into view for keyboard navigation
  useEffect(() => {
    if (isKeyboardNav && highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex, isKeyboardNav]);

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
      setAllMatches([]);
      setCurrentIndex(-1);
      setHighlightedIndex(-1);
      onClearAreaSearchResults();
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
              onClick={() => {
                onObjectSelect(obj);
                setAllMatches([]);
                setCurrentIndex(-1);
                setHighlightedIndex(-1);
                onClearAreaSearchResults();
              }}
              onMouseEnter={() => handleMouseEnter(index)}
              className={index === highlightedIndex ? "highlighted" : ""}
            >
              {obj.name} (F{obj.floor})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
