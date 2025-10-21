// src/utils/questDataLoader.ts

export interface QuestInfo {
  Quest: string;
  StartPoint: string;
  MemberRequirement: string;
  OfficialLength: string;
  Requirements: string[];
  ItemsRequired: string[];
  Recommended: string[];
  EnemiesToDefeat: string[];
}

export interface QuestDatabase {
  [questName: string]: QuestInfo;
}

// Cache the loaded quest data
let questDatabaseCache: QuestDatabase | null = null;
// NEW: Cache the original array structure for saving
let questDataArrayCache: QuestInfo[] | null = null;

export const loadQuestDatabase = async (): Promise<QuestDatabase> => {
  // Return cached data if already loaded
  if (questDatabaseCache) {
    return questDatabaseCache;
  }

  try {
    // Import the quest database JSON file (as an array)
    const questDataArrayModule = await import("./../Map Data/QuestDetail.json");
    const questDataArray: QuestInfo[] = questDataArrayModule.default;
    questDataArrayCache = questDataArray; // Cache the array

    // Convert array to object for efficient lookup
    const questDatabase: QuestDatabase = {};
    questDataArray.forEach((quest) => {
      questDatabase[quest.Quest] = quest;
    });

    questDatabaseCache = questDatabase;
    return questDatabase;
  } catch (error) {
    console.error("Failed to load quest database:", error);
    return {};
  }
};

/**
 * NEW: Updates a quest's information in the in-memory database cache.
 * This is called when you save changes in the QuestDetailsEditor.
 */
export const updateQuestInDatabase = async (updatedQuestInfo: QuestInfo) => {
  await loadQuestDatabase(); // Ensure data is loaded

  if (!questDataArrayCache) {
    console.error("Quest database cache is not available.");
    return;
  }

  const questIndex = questDataArrayCache.findIndex(
    (q) => q.Quest === updatedQuestInfo.Quest
  );

  if (questIndex > -1) {
    // Quest exists, update it
    questDataArrayCache[questIndex] = updatedQuestInfo;
  } else {
    // Quest is new, add it
    questDataArrayCache.push(updatedQuestInfo);
  }

  // Re-build the lookup cache for consistency
  questDatabaseCache = {};
  questDataArrayCache.forEach((quest) => {
    if (questDatabaseCache) {
      questDatabaseCache[quest.Quest] = quest;
    }
  });

  console.log(`Updated "${updatedQuestInfo.Quest}" in the database cache.`);
};

export const getQuestDatabaseAsJsonString = async (): Promise<string> => {
  await loadQuestDatabase();
  if (!questDataArrayCache) {
    return "[]";
  }
  return JSON.stringify(questDataArrayCache, null, 2);
};

export const getQuestInfo = async (
  questName: string
): Promise<QuestInfo | null> => {
  const questDatabase = await loadQuestDatabase();
  return questDatabase[questName] || null;
};
