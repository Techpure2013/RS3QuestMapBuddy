import React, { useEffect, useMemo, useState } from "react";
import { searchNpcs } from "../../api/npcApi";
import {
  loadNpcCache,
  saveNpcCache,
  addNpcSearchResultsToCache,
} from "../../idb/npcStore";

// Strongly-typed NPC as used by the editor and map
export interface Npc {
  id: number;
  name: string;
  lat: number;
  lng: number;
  floor: number;
}

interface NpcSearchProps {
  onNpcSelect: (npc: Npc) => void;
  onNpcHighlight: (npc: Npc | null) => void;
}

export const NpcSearch: React.FC<NpcSearchProps> = ({
  onNpcSelect,
  onNpcHighlight,
}) => {
  const [term, setTerm] = useState("");
  const [allMatches, setAllMatches] = useState<Npc[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  // When currentIndex changes, highlight that NPC (or clear)
  useEffect(() => {
    if (currentIndex >= 0 && allMatches[currentIndex]) {
      onNpcHighlight(allMatches[currentIndex]);
    } else {
      onNpcHighlight(null);
    }
  }, [currentIndex, allMatches, onNpcHighlight]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      void doSearch();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const doSearch = async () => {
    const name = term.trim();
    if (name.length < 2) {
      setAllMatches([]);
      setCurrentIndex(-1);
      onNpcHighlight(null);
      return;
    }
    setIsLoading(true);
    try {
      // Case-insensitive handled by server via lower(name) like
      // Increased limit to 50 for better coverage
      const results = await searchNpcs(name, 50);

      // Sort results: mapped NPCs first, then unmapped (0,0)
      const sortedResults = [...results].sort((a, b) => {
        const aUnmapped = a.lat === 0 && a.lng === 0;
        const bUnmapped = b.lat === 0 && b.lng === 0;
        if (aUnmapped && !bUnmapped) return 1;  // unmapped goes after
        if (!aUnmapped && bUnmapped) return -1; // mapped goes before
        return 0;
      });

      // Persist into IndexedDB cache (still cache all results for reference)
      const cache = await loadNpcCache();
      const nextCache = addNpcSearchResultsToCache(cache, results);
      await saveNpcCache(nextCache);

      setAllMatches(sortedResults);
      if (sortedResults.length > 0) {
        setCurrentIndex(0);
        onNpcHighlight(sortedResults[0]);
      } else {
        setCurrentIndex(-1);
        onNpcHighlight(null);
      }
    } catch (err) {
      console.error("NPC search failed:", err);
      setAllMatches([]);
      setCurrentIndex(-1);
      onNpcHighlight(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void doSearch();
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
      onNpcSelect(allMatches[currentIndex]);
      setTerm("");
      setAllMatches([]);
      setCurrentIndex(-1);
      onNpcHighlight(null);
    }
  };

  const cyclerInfo = useMemo(() => {
    if (currentIndex < 0 || allMatches.length === 0) return null;
    const cur = allMatches[currentIndex];
    return `${cur.name} (F${cur.floor})`;
  }, [currentIndex, allMatches]);

  // Check if current NPC is unmapped (0,0 coordinates)
  const isUnmapped = useMemo(() => {
    if (currentIndex < 0 || allMatches.length === 0) return false;
    const cur = allMatches[currentIndex];
    return cur.lat === 0 && cur.lng === 0;
  }, [currentIndex, allMatches]);

  return (
    <div className="npc-search-container">
      <strong>NPC Search</strong>
      <input
        type="text"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a name (min 2 chars) and press Enter"
        className="npc-search-input"
      />
      {isLoading && <div className="search-loading">Loading…</div>}

      {allMatches.length > 0 && (
        <div className="npc-cycler">
          <div className="npc-cycler-info">
            <span title={cyclerInfo || ""}>{cyclerInfo}</span>
            <span>
              {currentIndex + 1} of {allMatches.length}
            </span>
          </div>
          {isUnmapped && (
            <div className="npc-unmapped-warning" style={{
              background: "#78350f",
              color: "#fef3c7",
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: "0.8rem",
              marginBottom: 4,
            }}>
              ⚠️ No mapped location yet. You can still select this NPC and place it manually, or use Next/Previous to find a mapped instance.
            </div>
          )}
          <div className="npc-cycler-buttons">
            <button onClick={handlePrevious}>Previous</button>
            <button onClick={handleNext}>Next</button>
          </div>
          <button
            onClick={handleChoose}
            className="button--add"
            title={isUnmapped ? "Select this NPC (no mapped location yet)" : "Choose this NPC"}
          >
            {isUnmapped ? "Choose (Unmapped)" : "Choose this NPC"}
          </button>
        </div>
      )}
    </div>
  );
};
