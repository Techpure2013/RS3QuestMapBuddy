// src/editor/sections/MapAreaSearch.tsx
import React, { useState, useEffect, useRef } from "react";
import allMapAreasData from "../../map/Map Data/combinedMapData.json";

interface MapArea {
  mapId: number;
  bounds: [[number, number], [number, number]];
  center: [number, number];
  name: string;
}

const allMapAreas: MapArea[] = allMapAreasData as MapArea[];

interface MapAreaSearchProps {
  onAreaSelect: (area: MapArea) => void;
}

export const MapAreaSearch: React.FC<MapAreaSearchProps> = ({
  onAreaSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAreas, setFilteredAreas] = useState<MapArea[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false); // NEW: Track navigation method

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter areas whenever the search term changes
  useEffect(() => {
    if (searchTerm.length > 1) {
      const results = allMapAreas
        .filter((area) =>
          area.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name));
      setFilteredAreas(results);
      setIsOpen(true);
      setHighlightedIndex(-1);
    } else {
      setFilteredAreas([]);
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  }, [searchTerm]);

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // FIXED: Only scroll highlighted item into view when using keyboard navigation
  useEffect(() => {
    if (isKeyboardNav && highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex, isKeyboardNav]);

  const handleSelect = (area: MapArea) => {
    onAreaSelect(area);
    setSearchTerm(area.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setIsKeyboardNav(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredAreas.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setIsKeyboardNav(true); // Mark as keyboard navigation
        setHighlightedIndex((prev) =>
          prev < filteredAreas.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setIsKeyboardNav(true); // Mark as keyboard navigation
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredAreas[highlightedIndex]) {
          handleSelect(filteredAreas[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        setIsKeyboardNav(false);
        break;
    }
  };

  const handleMouseEnter = (index: number) => {
    setIsKeyboardNav(false); // Mark as mouse navigation
    setHighlightedIndex(index);
  };

  return (
    <div className="map-area-search-container" ref={searchContainerRef}>
      <div className="control-group">
        <label>Map Area Search</label>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.length > 1 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search for a map area..."
          className="search-input"
        />
      </div>
      {isOpen && filteredAreas.length > 0 && (
        <ul className="map-area-results" ref={listRef}>
          {filteredAreas.map((area, index) => (
            <li
              key={area.mapId}
              onClick={() => handleSelect(area)}
              onMouseEnter={() => handleMouseEnter(index)}
              className={`map-area-result-item ${
                index === highlightedIndex ? "highlighted" : ""
              }`}
            >
              <div className="map-area-result-content">
                <span className="map-area-name">{area.name}</span>
                <span className="map-area-id">ID: {area.mapId}</span>
              </div>
              <div className="map-area-coords">
                Center: [{area.center[0].toFixed(0)},{" "}
                {area.center[1].toFixed(0)}]
              </div>
            </li>
          ))}
        </ul>
      )}
      {isOpen && searchTerm.length > 1 && filteredAreas.length === 0 && (
        <div className="search-no-results">No areas found</div>
      )}
    </div>
  );
};
