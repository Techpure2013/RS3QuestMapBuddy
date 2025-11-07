import React, { useState, useEffect, useRef } from "react";
import allMapAreasData from "../../map/Map Data/combinedMapData.json";

// Define the type for a single map area
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
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Filter areas whenever the search term changes
  useEffect(() => {
    if (searchTerm.length > 1) {
      const results = allMapAreas
        .filter((area) =>
          area.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
      setFilteredAreas(results);
      setIsOpen(true);
    } else {
      setFilteredAreas([]);
      setIsOpen(false);
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

  const handleSelect = (area: MapArea) => {
    onAreaSelect(area);
    setSearchTerm(area.name); // Show the selected name
    setIsOpen(false);
  };

  return (
    <div className="map-area-search-container" ref={searchContainerRef}>
      <strong>Map Area Search</strong>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => searchTerm.length > 1 && setIsOpen(true)}
        placeholder="Search for a map area..."
        className="npc-search-input" // Reuse existing style
      />
      {isOpen && filteredAreas.length > 0 && (
        <ul className="search-results-list">
          {filteredAreas.map((area) => (
            <li key={area.mapId} onClick={() => handleSelect(area)}>
              {area.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
