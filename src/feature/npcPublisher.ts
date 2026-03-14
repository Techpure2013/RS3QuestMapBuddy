import { recordNpcLocation } from "./recordNpcLocations";
import { lookupNpcIdByName } from "../api/npcApi";
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
    for (const npc of step.highlights.npc ?? []) {
      const npcName = npc.npcName || "(unnamed)";

      // Try to get NPC ID - use existing or backfill by name lookup
      let npcId = npc.id;
      if (!npcId || !Number.isFinite(npcId)) {
        // Attempt to backfill ID by looking up the NPC name
        if (npcName && npcName !== "(unnamed)") {
          console.log(`🔍 Backfilling ID for "${npcName}" (step ${stepIndex + 1})...`);
          const lookedUpId = await lookupNpcIdByName(npcName);
          if (lookedUpId) {
            npcId = lookedUpId;
            console.log(`✅ Found ID ${npcId} for "${npcName}"`);
          } else {
            console.log(`❌ Could not find ID for "${npcName}" in database`);
          }
        }
      }

      // Skip if still no valid ID after backfill attempt
      if (!npcId || !Number.isFinite(npcId)) {
        skipped++;
        details.push({
          npcName,
          npcId: npcId ?? 0,
          result: "skipped",
          reason: "No valid NPC ID (backfill failed)",
        });
        console.log(
          `⏭️  Skipped ${npcName} (step ${stepIndex + 1}): No valid ID and backfill failed`
        );
        continue;
      }

      // Skip if location is unset (0,0)
      const loc = npc.npcLocation;
      if (!loc || (loc.lat === 0 && loc.lng === 0)) {
        skipped++;
        details.push({
          npcName,
          npcId,
          result: "skipped",
          reason: "Location not set (0,0)",
        });
        console.log(
          `⏭️  Skipped ${npcName} (ID: ${npcId}, step ${
            stepIndex + 1
          }): Location not set`
        );
        continue;
      }

      try {
        await recordNpcLocation(npcId, npcName, {
          lat: loc.lat,
          lng: loc.lng,
          floor: npc.floor ?? 0,
        });
        recorded++;
        details.push({
          npcName,
          npcId,
          result: "success",
        });
        console.log(
          `✅ Recorded: ${npcName} (ID: ${npcId}) at {${loc.lat}, ${
            loc.lng
          }, F${npc.floor ?? 0}} (step ${stepIndex + 1})`
        );
      } catch (err) {
        failed++;
        details.push({
          npcName,
          npcId,
          result: "failed",
          reason: err instanceof Error ? err.message : "Unknown error",
        });
        console.error(
          `❌ Failed: ${npcName} (ID: ${npcId}, step ${stepIndex + 1})`,
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
