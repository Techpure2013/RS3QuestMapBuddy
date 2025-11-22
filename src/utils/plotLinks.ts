export function buildPlotLink(questName: string, stepIndex: number): string {
  const origin = window.location.origin;
  return `${origin}/plot/${encodeURIComponent(questName)}/${stepIndex + 1}`;
}
