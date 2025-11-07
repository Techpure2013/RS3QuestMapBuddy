import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  loadQuestListAllFull,
  type QuestListFullCache,
  type QuestRowFull,
} from "./../../idb/questListStore";

interface QuestPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPick: (name: string) => Promise<void> | void;
}

const PAGE_SIZE = 40;

export const QuestPickerModal: React.FC<QuestPickerModalProps> = ({
  isOpen,
  onClose,
  onPick,
}) => {
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState<QuestListFullCache | null>(null);
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [alpha, setAlpha] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    (async () => {
      try {
        const data = await loadQuestListAllFull(false);
        setCache(data);
      } catch (e) {
        console.error(e);
        setCache({ items: [], total: 0, updatedAt: new Date().toISOString() });
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    })();
  }, [isOpen]);

  const items = cache?.items ?? [];

  // client-side filter: alphabet + substring (names only)
  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    return items.filter((q) => {
      if (alpha && !q.quest_name.toUpperCase().startsWith(alpha)) return false;
      if (t && !q.quest_name.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [items, term, alpha]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [term, alpha]);

  const resetAndClose = () => {
    setTerm("");
    setAlpha("");
    setPage(1);
    onClose();
  };

  if (!isOpen) return null;

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div
      className="qp-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) resetAndClose();
      }}
    >
      <div className="qp-modal">
        <div className="qp-header">
          <h3>All Quests</h3>
          <button
            className="qp-close"
            onClick={resetAndClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="qp-body">
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Filter quests (client-side only)…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="qp-input"
            />
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const data = await loadQuestListAllFull(true);
                  setCache(data);
                } catch (e) {
                  console.error(e);
                } finally {
                  setLoading(false);
                }
              }}
              title="Refresh from server"
            >
              Refresh
            </button>
          </div>

          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}
          >
            <button
              className="switcher-button"
              style={{
                padding: "4px 8px",
                background: !alpha ? "#2563eb" : "#374151",
                color: "#fff",
              }}
              onClick={() => setAlpha("")}
            >
              All
            </button>
            {letters.map((L) => (
              <button
                key={L}
                className="switcher-button"
                style={{
                  padding: "4px 8px",
                  background: alpha === L ? "#2563eb" : "#374151",
                  color: "#fff",
                }}
                onClick={() => setAlpha(L)}
              >
                {L}
              </button>
            ))}
          </div>

          {loading && <div className="qp-loading">Loading…</div>}

          {!loading && (
            <>
              <div style={{ color: "#9ca3af", marginTop: 6 }}>
                {filtered.length} quests • Page {page} / {totalPages}{" "}
                {cache?.updatedAt
                  ? `• Updated ${new Date(cache.updatedAt).toLocaleString()}`
                  : ""}
              </div>

              <ul className="qp-results" style={{ marginTop: 8 }}>
                {pageItems.map((q: QuestRowFull) => (
                  <li key={q.id}>
                    <span className="qp-result-name">{q.quest_name}</span>
                    <button
                      className="qp-load"
                      onClick={() => void onPick(q.quest_name)}
                    >
                      Load
                    </button>
                  </li>
                ))}
                {pageItems.length === 0 && (
                  <li className="qp-empty">No matches</li>
                )}
              </ul>

              <div className="qp-footer">
                <div className="qp-pagination">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  <span>
                    Page {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
                <button className="qp-cancel" onClick={resetAndClose}>
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
