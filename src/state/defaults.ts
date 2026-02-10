import type { Quest } from "./types";

export function createDefaultQuest(name?: string): Quest {
  const questName = name || "New Quest";
  return {
    questName: questName,
    questSteps: [
      {
        stepDescription: "This is the first step of your new quest.",
        itemsNeeded: [],
        itemsRecommended: [],
        additionalStepInformation: [],
        dialogOptions: [],
        highlights: { npc: [], object: [] },
        floor: 0,
      },
    ],
    questDetails: {
      Quest: questName,
      StartPoint: "",
      MemberRequirement: "Free to Play",
      OfficialLength: "Short",
      Requirements: [],
      ItemsRequired: [],
      Recommended: [],
      EnemiesToDefeat: [],
    },
    questImages: [],
    rewards: { questPoints: 0, questRewards: [] },
  };
}
