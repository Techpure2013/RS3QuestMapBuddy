import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  EditorStore,
  requestCaptureNavReturn,
  requestFlyToAreaAt,
  requestRestoreView,
} from "../../../state/editorStore";
import { useEditorSelector } from "../../../state/useEditorSelector";
import type { MapArea } from "../../../state/model";
import allMapAreasData from "../../../map/Map Data/combinedMapData.json";

const areaKey = (a: MapArea): string =>
  `${a.mapId}|${a.name}|${a.bounds[0][0]},${a.bounds[0][1]}|${a.bounds[1][0]},${a.bounds[1][1]}`;

const ALL_AREAS: MapArea[] = allMapAreasData as MapArea[];

const MapAreaSearchPanel: React.FC = () => {
  const ui = useEditorSelector((s) => s.ui);

  const [term, setTerm] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isKeyboardNav, setIsKeyboardNav] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered: MapArea[] = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (t.length < 1) return [];
    const results = ALL_AREAS.filter((a) =>
      a.name.toLowerCase().includes(t)
    ).sort((a, b) => a.name.localeCompare(b.name));
    const m = new Map<string, MapArea>();
    for (const a of results) {
      const k = areaKey(a);
      if (!m.has(k)) m.set(k, a);
    }
    return Array.from(m.values());
  }, [term]);

  useEffect(() => {
    setIsOpen(filtered.length > 0);
    setHighlightedIndex(-1);
  }, [filtered.length]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsKeyboardNav(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (isKeyboardNav && highlightedIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement;
      if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [highlightedIndex, isKeyboardNav]);

  const handleSelect = useCallback((area: MapArea) => {
    if (!EditorStore.getState().ui.navReturn) {
      requestCaptureNavReturn(true);
    }
    EditorStore.setHighlights({ selectedArea: area });
    // You can pass preferred zoom 2 or 3 if desired
    requestFlyToAreaAt(area, 2);
    setTerm(area.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setIsKeyboardNav(false);
    inputRef.current?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filtered.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setIsKeyboardNav(true);
        setHighlightedIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setIsKeyboardNav(true);
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter": {
        e.preventDefault();
        const idx =
          highlightedIndex >= 0
            ? highlightedIndex
            : filtered.length === 1
            ? 0
            : -1;
        if (idx >= 0) handleSelect(filtered[idx]);
        break;
      }
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        setIsKeyboardNav(false);
        break;
    }
  };

  return (
    <div className="map-area-search-container" ref={containerRef}>
      <div className="button-group" style={{ marginBottom: 6 }}>
        <button
          onClick={() => {
            EditorStore.setHighlights({ selectedArea: null });
            requestRestoreView(true);
            setTerm("");
            setIsOpen(false);
            setHighlightedIndex(-1);
          }}
          disabled={!ui.navReturn}
          title="Return to previous view"
        >
          Back
        </button>
      </div>

      <div className="control-group">
        <label>Map Area Search</label>
        <input
          ref={inputRef}
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => setIsOpen(filtered.length > 0)}
          onKeyDown={onKeyDown}
          placeholder="Search for a map area..."
          className="search-input"
        />
      </div>

      {isOpen && filtered.length > 0 && (
        <ul className="map-area-results" ref={listRef}>
          {filtered.map((area, index) => (
            <li
              key={areaKey(area)}
              onClick={() => handleSelect(area)}
              onMouseEnter={() => {
                setIsKeyboardNav(false);
                setHighlightedIndex(index);
              }}
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

      {isOpen && term.trim().length >= 1 && filtered.length === 0 && (
        <div className="search-no-results">No areas found</div>
      )}
    </div>
  );
};

export default MapAreaSearchPanel;
