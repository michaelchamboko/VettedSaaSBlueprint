import { createHash } from "node:crypto";

export const presentationAxes = [
  "hero",
  "typography",
  "section_order",
  "section_variants",
  "cta",
  "motion",
  "mobile",
] as const;

export type PresentationAxis = typeof presentationAxes[number];

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function presentationFingerprint(recipe: Record<PresentationAxis, unknown>): string {
  return sha256(Object.fromEntries(presentationAxes.map((axis) => [axis, recipe[axis]])));
}

export function differingPresentationAxes(
  left: Record<PresentationAxis, unknown>,
  right: Record<PresentationAxis, unknown>,
): PresentationAxis[] {
  return presentationAxes.filter((axis) => canonicalJson(left[axis]) !== canonicalJson(right[axis]));
}
