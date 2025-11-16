import { recordNpcLocation } from "./recordNpcLocations";
import type { Quest } from "../state/types";

export async function recordQuestNpcLocations(quest: Quest): Promise<{
  recorded: number;
  skipped: number;
  failed: number;
  details: Array<{
    npcName: string;
    npcId: number;
    result: "success" | "failed" | "skipped";
    reason?: string;
  }>;
}> {
  let recorded = 0;
  let skipped = 0;
  let failed = 0;
  const details: Array<{
    npcName: string;
    npcId: number;
    result: "success" | "failed" | "skipped";
    reason?: string;
  }> = [];

  console.log(
    `📍 Starting NPC location recording for quest: ${quest.questName}`
  );

  for (let stepIndex = 0; stepIndex < quest.questSteps.length; stepIndex++) {
    const step = quest.questSteps[stepIndex];
    const floor = typeof step.floor === "number" ? step.floor : 0;

    for (const npc of step.highlights.npc ?? []) {
      const npcName = npc.npcName || "(unnamed)";

      // Skip if no ID
      if (!npc.id || !Number.isFinite(npc.id)) {
        skipped++;
        details.push({
          npcName,
          npcId: npc.id ?? 0,
          result: "skipped",
          reason: "No valid NPC ID",
        });
        console.log(
          `⏭️  Skipped ${npcName} (step ${stepIndex + 1}): No valid ID`
        );
        continue;
      }

      // Skip if location is unset (0,0)
      const loc = npc.npcLocation;
      if (!loc || (loc.lat === 0 && loc.lng === 0)) {
        skipped++;
        details.push({
          npcName,
          npcId: npc.id,
          result: "skipped",
          reason: "Location not set (0,0)",
        });
        console.log(
          `⏭️  Skipped ${npcName} (ID: ${npc.id}, step ${
            stepIndex + 1
          }): Location not set`
        );
        continue;
      }

      try {
        await recordNpcLocation(npc.id, npcName, {
          lat: loc.lat,
          lng: loc.lng,
          floor,
        });
        recorded++;
        details.push({
          npcName,
          npcId: npc.id,
          result: "success",
        });
        console.log(
          `✅ Recorded: ${npcName} (ID: ${npc.id}) at {${loc.lat}, ${
            loc.lng
          }, F${floor}} (step ${stepIndex + 1})`
        );
      } catch (err) {
        failed++;
        details.push({
          npcName,
          npcId: npc.id,
          result: "failed",
          reason: err instanceof Error ? err.message : "Unknown error",
        });
        console.error(
          `❌ Failed: ${npcName} (ID: ${npc.id}, step ${stepIndex + 1})`,
          err
        );
      }
    }
  }

  console.log(
    `📍 NPC location recording complete: ${recorded} recorded, ${skipped} skipped, ${failed} failed`
  );

  return { recorded, skipped, failed, details };
}
