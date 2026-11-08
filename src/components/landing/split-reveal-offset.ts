// Bounds horizontal split-reveal travel to the space actually available
// beside the element, so entrance motion cannot push content off-screen
// on narrow viewports. Keeps the full requested travel on roomy layouts.
export function boundedSplitRevealOffset(
  availableGutter: number,
  requestedOffset = 36,
  edgePadding = 4,
): number {
  if (!Number.isFinite(availableGutter)) return 0;
  const safeGutter = Math.max(0, availableGutter);
  return Math.min(requestedOffset, Math.max(0, safeGutter - edgePadding));
}
