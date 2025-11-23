import React, { useEffect, useMemo, useState, useCallback } from "react";
import Panel from "./../sections/panel";
import AssetToolsSection from "./../sections/AssetToolSection";
import { useEditorSelector } from "../../state/useEditorSelector";
import {
  loadObservedChatheads,
  removeObservedChatheads,
  clearObservedChatheads,
  type ObservedChathead,
  recordObservedChathead,
} from "../../idb/chatheadsObserved";
import {
  loadPendingChatheads,
  addPendingChathead,
  removePendingChathead,
  clearPendingChatheads,
  type PendingChathead,
} from "../../idb/chatheadQueue";

type QueueRowKey = {
  idKey: string;
  identity: string;
  variant: string;
  sourceUrl: string;
  step?: number;
  stepDescription?: string;
};

function toObservedKey(o: ObservedChathead): QueueRowKey {
  const identity =
    typeof o.npcId === "number" ? `#${o.npcId}` : o.name ?? "(unknown)";
  const base = `${identity}|${o.variant}|${o.sourceUrl}`;
  return {
    idKey: base,
    identity,
    variant: o.variant,
    sourceUrl: o.sourceUrl,
    step: o.step,
    stepDescription: o.stepDescription,
  };
}

function toPendingKey(p: PendingChathead): QueueRowKey {
  const identity =
    typeof p.npcId === "number" ? `#${p.npcId}` : p.name ?? "(unknown)";
  const base = `${identity}|${p.variant}|${p.sourceUrl}`;
  return {
    idKey: base,
    identity,
    variant: p.variant,
    sourceUrl: p.sourceUrl,
    step: p.step,
    stepDescription: p.stepDescription,
  };
}

export const ChatheadsPanel: React.FC = () => {
  const questName = useEditorSelector((s) => s.quest?.questName ?? "");
  const isAlt1Environment = useEditorSelector((s) => s.ui.isAlt1Environment);

  const [chatheadName, setChatheadName] = useState<string>("");
  const [chatheadUrl, setChatheadUrl] = useState<string>("");

  const [observed, setObserved] = useState<ObservedChathead[]>([]);
  const [pending, setPending] = useState<PendingChathead[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const observedRows = useMemo<QueueRowKey[]>(
    () => observed.map(toObservedKey),
    [observed]
  );
  const pendingRows = useMemo<QueueRowKey[]>(
    () => pending.map(toPendingKey),
    [pending]
  );

  const refreshQueues = useCallback(async () => {
    setLoading(true);
    try {
      const [o, p] = await Promise.all([
        loadObservedChatheads(),
        loadPendingChatheads(),
      ]);
      o.sort((a, b) => b.lastObservedAt - a.lastObservedAt);
      p.sort((a, b) => {
        const ai = typeof a.npcId === "number" ? `#${a.npcId}` : a.name ?? "";
        const bi = typeof b.npcId === "number" ? `#${b.npcId}` : b.name ?? "";
        const c1 = ai.localeCompare(bi);
        if (c1 !== 0) return c1;
        const c2 = a.variant.localeCompare(b.variant);
        if (c2 !== 0) return c2;
        return a.sourceUrl.localeCompare(b.sourceUrl);
      });
      setObserved(o);
      setPending(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshQueues();
  }, [refreshQueues]);
  useEffect(() => {
    const handleQueueChange = () => {
      void refreshQueues();
    };

    window.addEventListener("chatheadQueuesChanged", handleQueueChange);
    return () => {
      window.removeEventListener("chatheadQueuesChanged", handleQueueChange);
    };
  }, [refreshQueues]);
  const handleAddChathead = useCallback(() => {
    console.log("Add/Update chathead override:", {
      chatheadName,
      chatheadUrl,
    });
  }, [chatheadName, chatheadUrl]);

  // NEW: Promote from observed to pending AND remove from observed
  const promoteObservedToPending = useCallback(
    async (row: QueueRowKey) => {
      const picked = observed.find((o) => toObservedKey(o).idKey === row.idKey);
      if (!picked) return;

      // Add to pending
      await addPendingChathead({
        npcId: picked.npcId,
        name: picked.name,
        variant: picked.variant,
        sourceUrl: picked.sourceUrl,
        step: picked.step,
        stepDescription: picked.stepDescription,
      });

      // Remove from observed
      await removeObservedChatheads((x) => {
        const k = toObservedKey(x).idKey;
        return k === row.idKey;
      });

      await refreshQueues();
    },
    [observed, refreshQueues]
  );

  const removeFromObserved = useCallback(
    async (row: QueueRowKey) => {
      await removeObservedChatheads((x) => {
        const k = toObservedKey(x).idKey;
        return k === row.idKey;
      });
      await refreshQueues();
    },
    [refreshQueues]
  );

  // NEW: Remove from pending and optionally move back to observed
  const removeFromPending = useCallback(
    async (row: QueueRowKey, moveBackToObserved: boolean = false) => {
      const picked = pending.find((p) => toPendingKey(p).idKey === row.idKey);

      if (moveBackToObserved && picked) {
        // Move back to observed
        await recordObservedChathead({
          npcId: picked.npcId,
          name: picked.name,
          variant: picked.variant,
          sourceUrl: picked.sourceUrl,
          step: picked.step,
          stepDescription: picked.stepDescription,
        });
      }

      // Remove from pending
      await removePendingChathead((x) => {
        const k = toPendingKey(x).idKey;
        return k === row.idKey;
      });

      await refreshQueues();
    },
    [pending, refreshQueues]
  );

  const clearObserved = useCallback(async () => {
    await clearObservedChatheads();
    await refreshQueues();
  }, [refreshQueues]);

  const clearPending = useCallback(async () => {
    await clearPendingChatheads();
    await refreshQueues();
  }, [refreshQueues]);

  return (
    <>
      <AssetToolsSection
        isOpen={true}
        onToggle={() => {}}
        questName={questName}
        previewBaseUrl="https://techpure.dev/RS3QuestBuddy/Images"
        isAlt1Environment={isAlt1Environment}
        chatheadName={chatheadName}
        onChatheadNameChange={setChatheadName}
        chatheadUrl={chatheadUrl}
        onChatheadUrlChange={setChatheadUrl}
        onAddChathead={handleAddChathead}
      />

      <div className="panel-section" style={{ marginTop: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 6,
            justifyContent: "space-between",
          }}
        >
          <strong>Observed queue</strong>
          <div className="button-group" style={{ maxWidth: 260 }}>
            <button onClick={() => void refreshQueues()} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              className="button--delete"
              onClick={() => void clearObserved()}
            >
              Clear
            </button>
          </div>
        </div>

        {observedRows.length === 0 ? (
          <div className="qp-empty">No observed chatheads yet</div>
        ) : (
          <ul className="target-list">
            {observedRows.map((r) => (
              <li key={r.idKey}>
                <div className="target-item-header">
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr",
                      gap: 4,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{r.identity}</div>
                    {r.step && (
                      <div style={{ fontSize: 11, color: "#6ee7b7" }}>
                        Step {r.step}: {r.stepDescription || "(no description)"}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      variant: {r.variant}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                        wordBreak: "break-all",
                      }}
                      title={r.sourceUrl}
                    >
                      {r.sourceUrl}
                    </div>
                  </div>
                  <div className="button-group" style={{ marginTop: 6 }}>
                    <button
                      className="button--add"
                      onClick={() => void promoteObservedToPending(r)}
                      title="Promote to pending queue (removes from observed)"
                    >
                      Promote
                    </button>
                    <button
                      className="button--delete"
                      onClick={() => void removeFromObserved(r)}
                      title="Remove from observed"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel-section" style={{ marginTop: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 6,
            justifyContent: "space-between",
          }}
        >
          <strong>Pending queue</strong>
          <div
            className="button-group"
            style={{ maxWidth: 260, flexDirection: "row" }}
          >
            <button onClick={() => void refreshQueues()} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              className="button--delete"
              onClick={() => void clearPending()}
            >
              Clear
            </button>
          </div>
        </div>

        {pendingRows.length === 0 ? (
          <div className="qp-empty">No pending chatheads</div>
        ) : (
          <ul className="target-list">
            {pendingRows.map((r) => (
              <li key={r.idKey}>
                <div className="target-item-header">
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr",
                      gap: 4,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{r.identity}</div>
                    {r.step && (
                      <div style={{ fontSize: 11, color: "#6ee7b7" }}>
                        Step {r.step}: {r.stepDescription || "(no description)"}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      variant: {r.variant}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                        wordBreak: "break-all",
                      }}
                      title={r.sourceUrl}
                    >
                      {r.sourceUrl}
                    </div>
                  </div>
                  <div className="button-group" style={{ marginTop: 6 }}>
                    <button
                      onClick={() => void removeFromPending(r, true)}
                      title="Move back to observed"
                      style={{ background: "#f59e0b", borderColor: "#f59e0b" }}
                    >
                      Unqueue
                    </button>
                    <button
                      className="button--delete"
                      onClick={() => void removeFromPending(r, false)}
                      title="Remove completely"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default ChatheadsPanel;
