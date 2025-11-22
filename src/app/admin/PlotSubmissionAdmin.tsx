// src/app/admin/PlotSubmissionsAdmin.tsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  listPendingSubmissions,
  approveSubmission,
  rejectSubmission,
  type PlotSubmissionRow,
} from "../../api/plotSubmissionsAdmin";
import { useAuth } from "state/useAuth";
import Panel from "../sections/panel";
import { EditorStore } from "../../state/editorStore";

const JsonPanel: React.FC<{
  title: string;
  payload: unknown;
}> = ({ title, payload }) => (
  <div className="json-panel">
    <div className="json-header">{title}</div>
    <div className="json-content">
      <pre>{JSON.stringify(payload, null, 2)}</pre>
    </div>
  </div>
);

const AdminPlotSubmissions: React.FC = () => {
  const { isAuthed } = useAuth();
  const [items, setItems] = useState<PlotSubmissionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<{ quest?: string; stepId?: number }>({});
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  // Sync selected submission to Global Editor Store
  useEffect(() => {
    EditorStore.setUi({ previewSubmission: selected });

    if (selected && typeof selected.floor === "number") {
      EditorStore.setSelection({ floor: selected.floor });
    }

    return () => {
      if (!selected) EditorStore.setUi({ previewSubmission: null });
    };
  }, [selected]);

  useEffect(() => {
    return () => {
      EditorStore.setUi({ previewSubmission: null });
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPendingSubmissions(
        filter.stepId ? { stepId: filter.stepId } : undefined
      );
      const filtered = filter.quest
        ? data.items.filter((i) =>
            i.quest_name.toLowerCase().includes(filter.quest!.toLowerCase())
          )
        : data.items;
      setItems(filtered);
      if (filtered.length > 0 && !selectedId) setSelectedId(filtered[0].id);
    } finally {
      setLoading(false);
    }
  }, [filter, selectedId]);

  useEffect(() => {
    if (!isAuthed) return;
    void load();
  }, [isAuthed, load]);

  useEffect(() => {
    if (!listRef.current || !selectedId) return;
    const el = listRef.current.querySelector<HTMLLIElement>(
      `li[data-id="${selectedId}"]`
    );
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  if (!isAuthed) return null;

  return (
    <Panel title="Plot Submissions (Admin)" defaultOpen>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          height: "calc(100vh - 140px)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <input
            type="text"
            placeholder="Filter quest..."
            value={filter.quest ?? ""}
            onChange={(e) =>
              setFilter((f) => ({ ...f, quest: e.target.value }))
            }
            className="array-input"
          />
          <input
            type="number"
            placeholder="Step ID"
            value={filter.stepId ?? ""}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                stepId: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            className="array-input"
            style={{ width: "60px" }}
          />
          <button
            className="array-add-button"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "..." : "↻"}
          </button>
        </div>

        {/* List */}
        <ul
          ref={listRef}
          className="search-results"
          style={{
            flex: 1, // Grow to fill space
            overflowY: "auto",
            border: "1px solid #374151",
            borderRadius: 6,
            maxHeight: "none",
          }}
          tabIndex={0}
          onKeyDown={(e) => {
            if (!items.length) return;
            const idx = items.findIndex((it) => it.id === selectedId);
            if (e.key === "ArrowDown") {
              e.preventDefault();
              const next = Math.min(items.length - 1, Math.max(0, idx + 1));
              setSelectedId(items[next].id);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              const prev = Math.max(0, Math.max(0, idx - 1));
              setSelectedId(items[prev].id);
            }
          }}
        >
          {items.map((it) => {
            const isSel = it.id === selectedId;
            return (
              <li
                key={it.id}
                data-id={it.id}
                onClick={() => setSelectedId(it.id)}
                className={isSel ? "highlighted" : ""}
                style={{
                  cursor: "pointer",
                  padding: "10px",
                  borderBottom: "1px solid #1f2937",
                  background: isSel ? "rgba(37, 99, 235, 0.1)" : undefined,
                  borderLeft: isSel
                    ? "3px solid #2563eb"
                    : "3px solid transparent",
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <div style={{ fontWeight: 600, color: "#e5e7eb" }}>
                    {it.quest_name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Step {it.step_number}</span>
                    <span>{it.playername}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                    {new Date(it.createdat).toLocaleString()}
                  </div>
                </div>
              </li>
            );
          })}
          {items.length === 0 && (
            <li className="qp-empty">No pending submissions</li>
          )}
        </ul>
        {/* Actions */}
        <div
          style={{ display: "flex", gap: 10, paddingBottom: 4, flexShrink: 0 }}
        >
          <button
            className="button--add"
            style={{ flex: 2, height: "40px", fontSize: "0.9rem" }}
            onClick={async () => {
              if (!selected) return;
              await approveSubmission(selected.id);
              await load();
            }}
            disabled={!selected}
          >
            Approve
          </button>
          <button
            className="button--delete"
            style={{ flex: 1, height: "40px", fontSize: "0.9rem" }}
            onClick={async () => {
              if (!selected) return;
              const reason = prompt("Optional rejection reason:");
              if (reason === null) return;
              await rejectSubmission(selected.id, reason);
              await load();
            }}
            disabled={!selected}
          >
            Reject
          </button>
        </div>
      </div>
    </Panel>
  );
};

export default AdminPlotSubmissions;
