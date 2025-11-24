// src/app/admin/PlotSubmissionsAdmin.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  listPendingSubmissions,
  approveSubmission,
  rejectSubmission,
} from "../../api/plotSubmissionsAdmin";
import { useAuth } from "../../state/useAuth";
import Panel from "../sections/panel";
import { EditorStore } from "../../state/editorStore";

import { SubmissionPreview } from "./SubmissionPreview";
import { showSuccessToast, showErrorToast } from "../../utils/toast";
import { AdminFilter, AdminState } from "./../../state/types";
import { PlotSubmissionItem } from "./PlotSubmissionsItem";

const AdminPlotSubmissions: React.FC = () => {
  const { isAuthed } = useAuth();
  const [state, setState] = useState<AdminState>({
    items: [],
    selectedId: null,
    filter: {},
    loading: false,
    processing: false,
    error: null,
  });

  const listRef = useRef<HTMLUListElement>(null);
  const filterTimeoutRef = useRef<number | null>(null);

  const selectedSubmission =
    state.items.find((i) => i.id === state.selectedId) ?? null;

  // Sync selected submission to Global Editor Store for map preview
  useEffect(() => {
    EditorStore.setUi({ previewSubmission: selectedSubmission });

    if (selectedSubmission && typeof selectedSubmission.floor === "number") {
      EditorStore.setSelection({ floor: selectedSubmission.floor });
    }

    return () => {
      if (!selectedSubmission) {
        EditorStore.setUi({ previewSubmission: null });
      }
    };
  }, [selectedSubmission]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      EditorStore.setUi({ previewSubmission: null });
    };
  }, []);

  const loadSubmissions = useCallback(async (filter: AdminFilter) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await listPendingSubmissions(
        filter.stepId ? { stepId: filter.stepId } : undefined
      );

      const filtered = filter.quest
        ? data.items.filter((i) =>
            i.quest_name.toLowerCase().includes(filter.quest!.toLowerCase())
          )
        : data.items;

      setState((prev) => ({
        ...prev,
        items: filtered,
        loading: false,
        selectedId: filtered.length > 0 ? filtered[0].id : null,
      }));
    } catch (err) {
      console.error("Failed to load submissions:", err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          err instanceof Error ? err.message : "Failed to load submissions",
      }));
      showErrorToast("Failed to load submissions");
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!isAuthed) return;
    void loadSubmissions(state.filter);
  }, [isAuthed]); // Only run on auth change

  // Debounced filter
  const handleFilterChange = useCallback(
    (updates: Partial<AdminFilter>) => {
      const newFilter = { ...state.filter, ...updates };
      setState((prev) => ({ ...prev, filter: newFilter }));

      if (filterTimeoutRef.current !== null) {
        window.clearTimeout(filterTimeoutRef.current);
      }

      filterTimeoutRef.current = window.setTimeout(() => {
        void loadSubmissions(newFilter);
      }, 300);
    },
    [state.filter, loadSubmissions]
  );

  const handleApprove = useCallback(async () => {
    if (!selectedSubmission || state.processing) return;

    const confirmed = confirm(
      `Approve submission from ${selectedSubmission.playername} for ${selectedSubmission.quest_name}?`
    );
    if (!confirmed) return;

    setState((prev) => ({ ...prev, processing: true }));

    try {
      await approveSubmission(selectedSubmission.id);
      showSuccessToast(
        `Approved submission from ${selectedSubmission.playername}`
      );
      await loadSubmissions(state.filter);
    } catch (err) {
      console.error("Failed to approve submission:", err);
      showErrorToast(
        err instanceof Error ? err.message : "Failed to approve submission"
      );
    } finally {
      setState((prev) => ({ ...prev, processing: false }));
    }
  }, [selectedSubmission, state.processing, state.filter, loadSubmissions]);

  const handleReject = useCallback(async () => {
    if (!selectedSubmission || state.processing) return;

    const reason = prompt(
      `Reject submission from ${selectedSubmission.playername}?\n\nOptional reason:`
    );
    if (reason === null) return; // Cancelled

    setState((prev) => ({ ...prev, processing: true }));

    try {
      await rejectSubmission(selectedSubmission.id, reason);
      showSuccessToast(
        `Rejected submission from ${selectedSubmission.playername}`
      );
      await loadSubmissions(state.filter);
    } catch (err) {
      console.error("Failed to reject submission:", err);
      showErrorToast(
        err instanceof Error ? err.message : "Failed to reject submission"
      );
    } finally {
      setState((prev) => ({ ...prev, processing: false }));
    }
  }, [selectedSubmission, state.processing, state.filter, loadSubmissions]);

  const handleKeyboardNav = useCallback(
    (e: React.KeyboardEvent) => {
      if (!state.items.length) return;

      const idx = state.items.findIndex((it) => it.id === state.selectedId);

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (idx < state.items.length - 1) {
            setState((prev) => ({
              ...prev,
              selectedId: state.items[idx + 1].id,
            }));
          }
          break;

        case "ArrowUp":
          e.preventDefault();
          if (idx > 0) {
            setState((prev) => ({
              ...prev,
              selectedId: state.items[idx - 1].id,
            }));
          }
          break;

        case "Enter":
          if (e.shiftKey) {
            void handleReject();
          } else {
            void handleApprove();
          }
          break;

        case "Escape":
          setState((prev) => ({ ...prev, selectedId: null }));
          break;
      }
    },
    [state.items, state.selectedId, handleApprove, handleReject]
  );

  // Auto-scroll to selected item
  useEffect(() => {
    if (!listRef.current || !state.selectedId) return;

    const el = listRef.current.querySelector<HTMLLIElement>(
      `li[data-id="${state.selectedId}"]`
    );
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [state.selectedId]);

  if (!isAuthed) {
    return null;
  }

  return (
    <div className="admin-plot-submissions">
      <div className="admin-container">
        {/* Filters */}
        <div className="admin-filters">
          <input
            type="text"
            placeholder="Filter by quest name..."
            value={state.filter.quest ?? ""}
            onChange={(e) => handleFilterChange({ quest: e.target.value })}
            className="admin-filter-input"
            disabled={state.loading}
          />
          <input
            type="number"
            placeholder="Step ID"
            value={state.filter.stepId ?? ""}
            onChange={(e) =>
              handleFilterChange({
                stepId: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="admin-filter-input admin-filter-step"
            disabled={state.loading}
          />
          <button
            className="admin-refresh-btn"
            onClick={() => void loadSubmissions(state.filter)}
            disabled={state.loading}
            title="Refresh list"
          >
            {state.loading ? "⏳" : "↻"}
          </button>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="admin-error">
            <span>⚠️ {state.error}</span>
            <button onClick={() => void loadSubmissions(state.filter)}>
              Retry
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="admin-content">
          {/* Submissions List */}
          <div className="admin-list-container">
            <div className="admin-list-header">
              <span>
                {state.items.length} submission
                {state.items.length !== 1 ? "s" : ""}
              </span>
            </div>

            <ul
              ref={listRef}
              className="admin-submissions-list"
              role="listbox"
              tabIndex={0}
              onKeyDown={handleKeyboardNav}
              aria-label="Plot submissions"
            >
              {state.items.map((item) => (
                <PlotSubmissionItem
                  key={item.id}
                  item={item}
                  isSelected={item.id === state.selectedId}
                  onSelect={() =>
                    setState((prev) => ({ ...prev, selectedId: item.id }))
                  }
                />
              ))}

              {state.items.length === 0 && !state.loading && (
                <li className="admin-empty">
                  {state.filter.quest || state.filter.stepId
                    ? "No submissions match your filters"
                    : "No pending submissions"}
                </li>
              )}

              {state.loading && (
                <li className="admin-loading">Loading submissions...</li>
              )}
            </ul>
          </div>

          {/* Preview Panel */}
          <div className="admin-preview-container">
            <SubmissionPreview submission={selectedSubmission} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="admin-actions">
          <button
            className="button--add admin-action-btn"
            onClick={() => void handleApprove()}
            disabled={!selectedSubmission || state.processing}
            title="Approve submission (Enter)"
          >
            {state.processing ? "Processing..." : "✓ Approve"}
          </button>

          <button
            className="button--delete admin-action-btn"
            onClick={() => void handleReject()}
            disabled={!selectedSubmission || state.processing}
            title="Reject submission (Shift+Enter)"
          >
            {state.processing ? "Processing..." : "✗ Reject"}
          </button>

          <div className="admin-keyboard-hint">
            <kbd>↑/↓</kbd> Navigate • <kbd>Enter</kbd> Approve •{" "}
            <kbd>Shift+Enter</kbd> Reject
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPlotSubmissions;
