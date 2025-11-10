import { useCallback, useState } from "react";
import { produce } from "immer";
import type { Quest, QuestBundle } from "./types";
import { questToBundle, bundleToQuest } from "./types";
import { fetchQuestBundle, saveQuestBundle } from "../api/bundleApi";
import { saveActiveBundle, clearActiveBundle } from "../idb/bundleStore";

export function useQuestEditor() {
  const [quest, setQuest] = useState<Quest | null>(null);
  const [selectedStep, setSelectedStep] = useState(0);
  const [targetType, setTargetType] = useState<"npc" | "object">("npc");
  const [targetIndex, setTargetIndex] = useState(0);
  const [floor, setFloor] = useState(0);
  const [jsonString, setJsonString] = useState("");

  const updateQuest = useCallback((q: Quest) => {
    setQuest(q);
    setJsonString(JSON.stringify(q, null, 2));
  }, []);

  const createNewQuest = useCallback(() => {
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
    setSelectedStep(0);
    setTargetIndex(0);
    setTargetType("npc");
    updateQuest(q);
  }, [updateQuest]);

  const setStepDescription = useCallback(
    (desc: string) => {
      if (!quest) return;
      updateQuest(
        produce(quest, (draft) => {
          draft.questSteps[selectedStep].stepDescription = desc;
        })
      );
    },
    [quest, selectedStep, updateQuest]
  );

  const setArrayField = useCallback(
    (
      field: "itemsNeeded" | "itemsRecommended" | "additionalStepInformation",
      value: string
    ) => {
      if (!quest) return;
      const arr = value.split("\n");
      updateQuest(
        produce(quest, (draft) => {
          (draft.questSteps[selectedStep] as any)[field] = arr;
        })
      );
    },
    [quest, selectedStep, updateQuest]
  );

  const addStep = useCallback(() => {
    if (!quest) return;
    updateQuest(
      produce(quest, (draft) => {
        draft.questSteps.splice(selectedStep + 1, 0, {
          stepDescription: "New step description...",
          itemsNeeded: [],
          itemsRecommended: [],
          additionalStepInformation: [],
          highlights: { npc: [], object: [] },
          floor,
        });
      })
    );
    setSelectedStep(selectedStep + 1);
  }, [quest, selectedStep, floor, updateQuest]);

  const deleteStep = useCallback(() => {
    if (!quest || quest.questSteps.length <= 1) return;
    const next = produce(quest, (draft) => {
      draft.questSteps.splice(selectedStep, 1);
    });
    updateQuest(next);
    if (selectedStep >= next.questSteps.length) {
      setSelectedStep(next.questSteps.length - 1);
    }
  }, [quest, selectedStep, updateQuest]);

  const setTargetName = useCallback(
    (name: string) => {
      if (!quest) return;
      updateQuest(
        produce(quest, (draft) => {
          const target =
            draft.questSteps[selectedStep].highlights[targetType][targetIndex];
          if (!target) return;
          if (targetType === "npc") (target as any).npcName = name;
          else (target as any).name = name;
        })
      );
    },
    [quest, selectedStep, targetType, targetIndex, updateQuest]
  );

  const setStepFloor = useCallback(
    (f: number) => {
      if (!quest) return;
      setFloor(f);
      updateQuest(
        produce(quest, (draft) => {
          draft.questSteps[selectedStep].floor = f;
        })
      );
    },
    [quest, selectedStep, updateQuest]
  );

  // DB IO
  const saveToDb = useCallback(
    async (adminToken: string) => {
      if (!quest) return;
      const bundle = questToBundle(quest);
      await saveQuestBundle(bundle, adminToken);
      await saveActiveBundle(bundle);
    },
    [quest]
  );

  const loadFromDb = useCallback(
    async (questName: string) => {
      const bundle = await fetchQuestBundle(questName);
      const q = bundleToQuest(bundle);
      updateQuest(q);
    },
    [updateQuest]
  );

  const clearEphemeral = useCallback(async () => {
    await clearActiveBundle();
  }, []);

  return {
    quest,
    selectedStep,
    targetType,
    targetIndex,
    floor,
    jsonString,

    setSelectedStep,
    setTargetType,
    setTargetIndex,
    setStepFloor,
    setStepDescription,
    setArrayField,
    setTargetName,
    setJsonString,
    updateQuest,

    createNewQuest,
    addStep,
    deleteStep,
    saveToDb,
    loadFromDb,
    clearEphemeral,
  };
}
