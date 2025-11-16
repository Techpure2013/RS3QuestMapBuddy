import React, { useCallback } from "react";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";
import { questToBundle, type QuestRewards } from "../../state/types";
import { saveActiveBundle } from "../../idb/bundleStore";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconGripVertical, IconPlus, IconTrash } from "@tabler/icons-react";

type SortableItemProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
};

const SortableItem: React.FC<SortableItemProps> = ({
  id,
  value,
  onChange,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="array-item">
      <button
        className="drag-handle"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        type="button"
      >
        <IconGripVertical size={16} />
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="array-input"
      />
      <button
        onClick={onRemove}
        className="array-remove-button"
        title="Remove reward"
        type="button"
      >
        <IconTrash size={16} />
      </button>
    </div>
  );
};

function persistActiveBundle(): void {
  const q = EditorStore.getState().quest;
  if (q) void saveActiveBundle(questToBundle(q));
}

export const QuestRewardsPanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);

  const rewards: QuestRewards = quest?.rewards ?? {
    questPoints: 0,
    questRewards: [],
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const setPoints = useCallback((qp: number) => {
    EditorStore.patchQuest((draft) => {
      draft.rewards = draft.rewards ?? { questPoints: 0, questRewards: [] };
      draft.rewards.questPoints = Math.max(0, Math.floor(qp));
    });
    persistActiveBundle();
  }, []);

  const addReward = useCallback(() => {
    EditorStore.patchQuest((draft) => {
      const r = (draft.rewards =
        draft.rewards ??
        ({ questPoints: 0, questRewards: [] } as QuestRewards));
      r.questRewards.push("");
    });
    persistActiveBundle();
  }, []);

  const setRewardItem = useCallback((index: number, value: string) => {
    EditorStore.patchQuest((draft) => {
      const r = (draft.rewards =
        draft.rewards ??
        ({ questPoints: 0, questRewards: [] } as QuestRewards));
      if (index >= 0 && index < r.questRewards.length) {
        r.questRewards[index] = value;
      }
    });
    persistActiveBundle();
  }, []);

  const removeReward = useCallback((index: number) => {
    EditorStore.patchQuest((draft) => {
      const r = (draft.rewards =
        draft.rewards ??
        ({ questPoints: 0, questRewards: [] } as QuestRewards));
      if (index >= 0 && index < r.questRewards.length) {
        r.questRewards.splice(index, 1);
      }
    });
    persistActiveBundle();
  }, []);

  const onDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    EditorStore.patchQuest((draft) => {
      const r = (draft.rewards =
        draft.rewards ??
        ({ questPoints: 0, questRewards: [] } as QuestRewards));
      const ids = r.questRewards.map((_, i) => `reward-${i}`);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex >= 0 && newIndex >= 0) {
        r.questRewards = arrayMove(r.questRewards, oldIndex, newIndex);
      }
    });
    persistActiveBundle();
  }, []);

  return (
    <div className="panel-section">
      <div className="editor-controls-grid">
        <div className="control-group">
          <label>Quest Points</label>
          <input
            type="number"
            min={0}
            step={1}
            value={rewards.questPoints}
            onChange={(e) => setPoints(Number(e.target.value || 0))}
            placeholder="0"
          />
        </div>

        <div className="control-group full-width-control">
          <label>Rewards</label>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <div className="array-items">
              <SortableContext
                items={rewards.questRewards.map((_, i) => `reward-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                {rewards.questRewards.length === 0 ? (
                  <div className="qp-empty">No rewards yet</div>
                ) : (
                  rewards.questRewards.map((value, i) => (
                    <SortableItem
                      key={`reward-${i}`}
                      id={`reward-${i}`}
                      value={value}
                      onChange={(v) => setRewardItem(i, v)}
                      onRemove={() => removeReward(i)}
                    />
                  ))
                )}
              </SortableContext>

              <button
                onClick={addReward}
                className="array-add-button"
                title="Add reward"
                type="button"
              >
                <IconPlus size={16} /> Add Reward
              </button>
            </div>
          </DndContext>
        </div>
      </div>
    </div>
  );
};

export default QuestRewardsPanel;
