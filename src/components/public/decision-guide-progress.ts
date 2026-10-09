export function activeDecisionGuideIndex(progress: number, count: number) {
  return Math.min(count - 1, Math.max(0, Math.floor(progress * count)));
}
