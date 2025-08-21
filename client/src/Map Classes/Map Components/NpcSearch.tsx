import React, { useState, useEffect } from "react";
import allNpcsData from "./../Map Data/NPCData.json";

export interface Npc {
  name: string;
  id: number;
  lng: number;
  lat: number;
  floor: number;
}

const allNpcs: Npc[] = allNpcsData;

interface NpcSearchProps {
  // <-- FIX #3: This prop now expects the full Npc object.
  onNpcSelect: (npc: Npc) => void;
  onNpcHighlight: (npc: Npc | null) => void;
}

export const NpcSearch: React.FC<NpcSearchProps> = ({
  onNpcSelect,
  onNpcHighlight,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [allMatches, setAllMatches] = useState<Npc[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    if (currentIndex >= 0 && allMatches[currentIndex]) {
      onNpcHighlight(allMatches[currentIndex]);
    } else {
      onNpcHighlight(null);
    }
  }, [currentIndex, allMatches, onNpcHighlight]);

  const handleSearch = () => {
    if (searchTerm.length < 2) {
      setAllMatches([]);
      setCurrentIndex(-1);
      onNpcHighlight(null);
      return;
    }
    const results = allNpcs.filter(
      (npc) =>
        npc.name && npc.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setAllMatches(results);

    if (results.length > 0) {
      setCurrentIndex(0);
      onNpcHighlight(results[0]);
    } else {
      setCurrentIndex(-1);
      onNpcHighlight(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
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
      const chosenNpc = allMatches[currentIndex];
      // <-- FIX #3: Pass the entire object, not just its parts.
      onNpcSelect(chosenNpc);
      setSearchTerm("");
      setAllMatches([]);
      setCurrentIndex(-1);
    }
  };

  return (
    <div className="npc-search-container">
      <strong>NPC Search</strong>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a name and press Enter"
        className="npc-search-input"
      />

      {allMatches.length > 0 && (
        <div className="npc-cycler">
          <div className="npc-cycler-info">
            <span>
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
            Choose this NPC
          </button>
        </div>
      )}
    </div>
  );
};
