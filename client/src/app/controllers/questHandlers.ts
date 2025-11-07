// client/src/app/controllers/questHandlers.ts
import { produce } from "immer";
import type {
  Quest,
  QuestImage,
  Clipboard,
  ObjectHighlight,
  NpcHighlight,
} from "../../state/types";

export type QuestHandlersDeps = {
  // state getters
  getQuest: () => Quest | null;
  getSelectedStep: () => number;
  getTargetType: () => "npc" | "object";
  getTargetIndex: () => number;
  getFloor: () => number;
  updateQuestState: (next: Quest) => void;
  // state setters
  setQuest: (q: Quest) => void;
  setJsonString: (s: string) => void;
  setSelectedStep: (i: number) => void;
  setTargetType: (t: "npc" | "object") => void;
  setTargetIndex: (i: number) => void;
  setFloor: (f: number) => void;
  setClipboard: (c: Clipboard) => void;
  getClipboard: () => Clipboard;

  // external image list state
  getQuestImageList: () => Array<{ name: string; images: QuestImage[] }>;
  setQuestImageList: (v: Array<{ name: string; images: QuestImage[] }>) => void;
  setQuestImageListString: (s: string) => void;

  // colors/labels (object tools)
  getSelectedObjectColor: () => string;
  getObjectNumberLabel: () => string;

  // utils
  normalizeJsonTextChange?: (text: string) => Quest | null;
};

function serializeQuest(q: Quest) {
  return JSON.stringify(q, null, 2);
}

export function createQuestHandlers(deps: QuestHandlersDeps) {
  const {
    getQuest,
    getSelectedStep,
    getTargetType,
    getTargetIndex,
    getFloor,
    setQuest,
    setJsonString,
    setSelectedStep,
    setTargetType,
    setTargetIndex,
    setFloor,
    setClipboard,
    getClipboard,
    getQuestImageList,
    setQuestImageList,
    setQuestImageListString,
    getSelectedObjectColor,
    getObjectNumberLabel,
    normalizeJsonTextChange,
  } = deps;

  const updateQuestState = (next: Quest) => {
    setQuest(next);
    setJsonString(serializeQuest(next));
  };
  const handleAddObjectPointAt = (coord: { lat: number; lng: number }) => {
    const q = getQuest();
    if (!q) return;
    const idx = getSelectedStep();
    const tIdx = getTargetIndex();

    const color = getSelectedObjectColor();
    const numberLabel = getObjectNumberLabel();

    const next = produce(q, (draft) => {
      const target = draft.questSteps[idx]?.highlights.object?.[tIdx];
      if (!target) return;

      const locations = target.objectLocation ?? [];
      const isDuplicate = locations.some(
        (l) => l.lat === coord.lat && l.lng === coord.lng
      );
      if (isDuplicate) return;

      locations.push({
        lat: coord.lat,
        lng: coord.lng,
        color,
        numberLabel,
      });
      target.objectLocation = locations;
    });

    updateQuestState(next);
  };

  const handleNewQuest = () => {
    const q: Quest = {
      questName: "New Quest",
      questSteps: [
        {
          stepDescription: "This is the first step of your new quest.",
          itemsNeeded: [],
          itemsRecommended: [],
          additionalStepInformation: [],
          highlights: {
            npc: [],
            object: [],
          },
          floor: 0,
        },
      ],
      questDetails: {
        Quest: "New Quest",
        StartPoint: "",
        MemberRequirement: "Free to Play",
        OfficialLength: "Short",
        Requirements: [],
        ItemsRequired: [],
        Recommended: [],
        EnemiesToDefeat: [],
      },
      questImages: [],
    };
    updateQuestState(q);
    setSelectedStep(0);
    setTargetIndex(0);
    setTargetType("npc");
  };

  const handleAddStep = () => {
    const q = getQuest();
    if (!q) return;
    const floor = getFloor();
    const idx = getSelectedStep();
    const next = produce(q, (draft) => {
      draft.questSteps.splice(idx + 1, 0, {
        stepDescription: "New step description...",
        itemsNeeded: [],
        itemsRecommended: [],
        additionalStepInformation: [],
        highlights: { npc: [], object: [] },
        floor,
      });
    });
    updateQuestState(next);
    setSelectedStep(idx + 1);
  };

  const handleDeleteStep = () => {
    const q = getQuest();
    const idx = getSelectedStep();
    if (!q || q.questSteps.length <= 1) return;
    const next = produce(q, (draft) => {
      draft.questSteps.splice(idx, 1);
    });
    updateQuestState(next);
    if (idx >= next.questSteps.length) {
      setSelectedStep(next.questSteps.length - 1);
    }
  };

  const handleStepDescriptionChange = (desc: string) => {
    const q = getQuest();
    if (!q) return;
    const idx = getSelectedStep();
    const next = produce(q, (draft) => {
      draft.questSteps[idx].stepDescription = desc;
    });
    updateQuestState(next);
  };

  const handleGenericArrayChange = (
    field: "itemsNeeded" | "itemsRecommended" | "additionalStepInformation",
    value: string
  ) => {
    const q = getQuest();
    if (!q) return;
    const idx = getSelectedStep();
    const lines = value.split("\n");
    const next = produce(q, (draft) => {
      (draft.questSteps[idx] as any)[field] = lines;
    });
    updateQuestState(next);
  };

  const handleFloorChange = (newFloor: number) => {
    const q = getQuest();
    if (!q) return;
    const idx = getSelectedStep();
    setFloor(newFloor);
    const next = produce(q, (draft) => {
      draft.questSteps[idx].floor = newFloor;
    });
    updateQuestState(next);
  };

  const handleTargetNameChange = (newName: string) => {
    const q = getQuest();
    if (!q) return;
    const idx = getSelectedStep();
    const type = getTargetType();
    const tIdx = getTargetIndex();
    const next = produce(q, (draft) => {
      const target = draft.questSteps[idx].highlights[type][tIdx] as any;
      if (!target) return;
      if (type === "npc") target.npcName = newName;
      else target.name = newName;
    });
    updateQuestState(next);
  };

  const handleAddNpc = () => {
    const q = getQuest();
    if (!q) return;
    const idx = getSelectedStep();
    let newIndex = 0;
    const next = produce(q, (draft) => {
      const step = draft.questSteps[idx];
      if (!step.highlights.npc) step.highlights.npc = [];
      step.highlights.npc.push({
        npcName: "New NPC",
        npcLocation: { lat: 0, lng: 0 },
        wanderRadius: {
          bottomLeft: { lat: 0, lng: 0 },
          topRight: { lat: 0, lng: 0 },
        },
      });
      newIndex = step.highlights.npc.length - 1;
    });
    updateQuestState(next);
    setTargetType("npc");
    setTargetIndex(newIndex);
  };

  const handleAddObject = () => {
    const q = getQuest();
    if (!q) return;
    const idx = getSelectedStep();
    let newIndex = 0;
    const next = produce(q, (draft) => {
      const step = draft.questSteps[idx];
      if (!step.highlights.object) step.highlights.object = [];
      step.highlights.object.push({
        name: "New Object",
        objectLocation: [],
        objectRadius: {
          bottomLeft: { lat: 0, lng: 0 },
          topRight: { lat: 0, lng: 0 },
        },
      });
      newIndex = step.highlights.object.length - 1;
    });
    updateQuestState(next);
    setTargetType("object");
    setTargetIndex(newIndex);
  };

  const handleDeleteNpc = () => {
    const q = getQuest();
    if (!q) return;
    const idx = getSelectedStep();
    const tIdx = getTargetIndex();
    const next = produce(q, (draft) => {
      const step = draft.questSteps[idx];
      if (!step.highlights?.npc) return;
      step.highlights.npc.splice(tIdx, 1);
    });
    updateQuestState(next);
    const after = next.questSteps[idx].highlights.npc.length;
    if (tIdx >= after) setTargetIndex(Math.max(0, after - 1));
  };

  const handleDeleteObject = () => {
    const q = getQuest();
    if (!q) return;
    const idx = getSelectedStep();
    const tIdx = getTargetIndex();
    const next = produce(q, (draft) => {
      const step = draft.questSteps[idx];
      if (!step.highlights?.object) return;
      step.highlights.object.splice(tIdx, 1);
    });
    updateQuestState(next);
    const after = next.questSteps[idx].highlights.object.length;
    if (tIdx >= after) setTargetIndex(Math.max(0, after - 1));
  };

  const handleDeleteObjectLocation = (locIndex: number) => {
    const q = getQuest();
    if (!q) return;
    const idx = getSelectedStep();
    const tIdx = getTargetIndex();
    const next = produce(q, (draft) => {
      const target = draft.questSteps[idx].highlights.object?.[tIdx];
      if (target?.objectLocation) {
        target.objectLocation.splice(locIndex, 1);
      }
    });
    updateQuestState(next);
  };

  const handleCopyTarget = () => {
    const q = getQuest();
    if (!q) return;

    const idx = getSelectedStep();
    const type = getTargetType();
    const tIdx = getTargetIndex();
    const item = q.questSteps[idx]?.highlights?.[type]?.[tIdx];

    if (!item) return;

    if (type === "npc") {
      setClipboard({
        type: "npc",
        data: JSON.parse(JSON.stringify(item)) as NpcHighlight,
      });
    } else {
      setClipboard({
        type: "object",
        data: JSON.parse(JSON.stringify(item)) as ObjectHighlight,
      });
    }
  };

  const handlePasteTarget = () => {
    const q = getQuest();
    if (!q) return;

    const cb = getClipboard();
    if (cb.type === "none" || cb.type.endsWith("-list")) return;

    const idx = getSelectedStep();
    const type = getTargetType();
    const tIdx = getTargetIndex();

    if (type === "npc" && cb.type === "npc") {
      const next = produce(q, (draft) => {
        draft.questSteps[idx].highlights.npc[tIdx] = cb.data;
      });
      updateQuestState(next);
    } else if (type === "object" && cb.type === "object") {
      const next = produce(q, (draft) => {
        draft.questSteps[idx].highlights.object[tIdx] = cb.data;
      });
      updateQuestState(next);
    }
  };

  const handleCopyTargetList = () => {
    const q = getQuest();
    if (!q) return;

    const idx = getSelectedStep();
    const type = getTargetType();
    const list = q.questSteps[idx]?.highlights?.[type];

    if (!list || !list.length) return;

    if (type === "npc") {
      setClipboard({
        type: "npc-list",
        data: JSON.parse(JSON.stringify(list)) as NpcHighlight[],
      });
    } else {
      setClipboard({
        type: "object-list",
        data: JSON.parse(JSON.stringify(list)) as ObjectHighlight[],
      });
    }
  };

  const handlePasteTargetList = () => {
    const q = getQuest();
    if (!q) return;

    const cb = getClipboard();
    if (cb.type !== "npc-list" && cb.type !== "object-list") return;

    const idx = getSelectedStep();

    if (cb.type === "npc-list") {
      const next = produce(q, (draft) => {
        draft.questSteps[idx].highlights.npc = cb.data;
      });
      updateQuestState(next);
    } else {
      const next = produce(q, (draft) => {
        draft.questSteps[idx].highlights.object = cb.data;
      });
      updateQuestState(next);
    }
  };

  const handleResetNpcLocation = () => {
    const q = getQuest();
    if (!q) return;
    const idx = getSelectedStep();
    const tIdx = getTargetIndex();
    const next = produce(q, (draft) => {
      const target = draft.questSteps[idx]?.highlights.npc?.[tIdx];
      if (target) target.npcLocation = { lat: 0, lng: 0 };
    });
    updateQuestState(next);
  };

  const handleApplyRadius = (radius: number) => {
    const q = getQuest();
    if (!q) return;
    const idx = getSelectedStep();
    const tIdx = getTargetIndex();
    const target = q.questSteps[idx].highlights.npc[tIdx];
    const center = target?.npcLocation;
    if (!center || (center.lat === 0 && center.lng === 0)) return;

    const next = produce(q, (draft) => {
      const t = draft.questSteps[idx].highlights.npc[tIdx];
      t.wanderRadius = {
        bottomLeft: { lat: center.lat - radius, lng: center.lng - radius },
        topRight: { lat: center.lat + radius, lng: center.lng + radius },
      };
    });
    updateQuestState(next);
  };

  const handleResetRadius = () => {
    const q = getQuest();
    if (!q) return;
    const idx = getSelectedStep();
    const type = getTargetType();
    const tIdx = getTargetIndex();
    const next = produce(q, (draft) => {
      const target = draft.questSteps[idx].highlights[type][tIdx] as any;
      if (!target) return;
      const empty = {
        bottomLeft: { lat: 0, lng: 0 },
        topRight: { lat: 0, lng: 0 },
      };
      if (type === "npc") target.wanderRadius = empty;
      else target.objectRadius = empty;
    });
    updateQuestState(next);
  };

  const handleSelectedObjectColorChange = (newColor: string) => {
    const q = getQuest();
    if (!q) return;
    const idx = getSelectedStep();
    const tIdx = getTargetIndex();

    const next = produce(q, (draft) => {
      const t = draft.questSteps[idx]?.highlights.object?.[tIdx];
      if (!t || !t.objectLocation?.length) return;
      t.objectLocation[t.objectLocation.length - 1].color = newColor;
    });

    updateQuestState(next);
  };

  const handleObjectNumberLabelChange = (label: string) => {
    const q = getQuest();
    if (!q) return;
    const idx = getSelectedStep();
    const tIdx = getTargetIndex();

    const next = produce(q, (draft) => {
      const t = draft.questSteps[idx]?.highlights.object?.[tIdx];
      if (!t || !t.objectLocation?.length) return;
      t.objectLocation[t.objectLocation.length - 1].numberLabel = label;
    });

    updateQuestState(next);
  };

  const handleDeleteObjectLocationAt = (locationIndex: number) => {
    return handleDeleteObjectLocation(locationIndex);
  };

  const handleJsonTextChange = (text: string) => {
    setJsonString(text);
    if (normalizeJsonTextChange) {
      const parsed = normalizeJsonTextChange(text);
      if (parsed) setQuest(parsed);
    } else {
      try {
        const parsed = JSON.parse(text) as Quest;
        setQuest(parsed);
      } catch {
        /* ignore invalid json */
      }
    }
  };

  return {
    updateQuestState,
    handleNewQuest,
    handleAddStep,
    handleDeleteStep,
    handleStepDescriptionChange,
    handleGenericArrayChange,
    handleFloorChange,
    handleTargetNameChange,
    handleAddNpc,
    handleAddObject,
    handleDeleteNpc,
    handleDeleteObject,
    handleDeleteObjectLocation: handleDeleteObjectLocationAt,
    handleCopyTarget,
    handlePasteTarget,
    handleCopyTargetList,
    handlePasteTargetList,
    handleResetNpcLocation,
    handleApplyRadius,
    handleResetRadius,
    handleSelectedObjectColorChange,
    handleObjectNumberLabelChange,
    handleAddObjectPointAt,
    handleJsonTextChange,
  };
}
