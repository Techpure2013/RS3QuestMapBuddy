import { getApiBase } from "../utils/apiBase";

export type PlotSubmissionRow = {
  id: number;
  stepid: number;
  playername: string;
  playernameci: string;
  ipdigest: string;
  ipalgo: string;
  basehighlights: {
    npc: Array<{
      id?: number;
      npcName: string;
      npcLocation?: { lat: number; lng: number };
      wanderRadius?: {
        bottomLeft: { lat: number; lng: number };
        topRight: { lat: number; lng: number };
      };
    }>;
    object: Array<{
      id?: number;
      name: string;
      objectLocation?: Array<{
        lat: number;
        lng: number;
        color?: string;
        numberLabel?: string;
      }>;
      objectRadius?: {
        bottomLeft: { lat: number; lng: number };
        topRight: { lat: number; lng: number };
      };
    }>;
  };
  proposedhighlights: PlotSubmissionRow["basehighlights"];
  floor: number | null;
  contenthash: string;
  status: "pending" | "approved" | "rejected";
  rejectionreason: string | null;
  createdat: string;
  reviewedat: string | null;
  reviewedby: string | null;
  // joined fields
  step_description: string;
  step_number: number;
  quest_name: string;
};

export async function listPendingSubmissions(params?: {
  questId?: number;
  stepId?: number;
}): Promise<{ ok: true; items: PlotSubmissionRow[] }> {
  const base = getApiBase();
  const qs = new URLSearchParams();
  if (params?.questId) qs.set("questId", String(params.questId));
  if (params?.stepId) qs.set("stepId", String(params.stepId));
  const res = await fetch(`${base}/api/plot-submissions/pending?${qs}`, {
    credentials: "include",
    cache: "no-store",
    headers: { "Cache-Control": "no-store" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { ok: true; items: PlotSubmissionRow[] };
}

export async function approveSubmission(id: number): Promise<{ ok: true }> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/plot-submissions/${id}/approve`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { ok: true };
}

export async function rejectSubmission(
  id: number,
  reason?: string
): Promise<{ ok: true }> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/plot-submissions/${id}/reject`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason ?? null }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { ok: true };
}
