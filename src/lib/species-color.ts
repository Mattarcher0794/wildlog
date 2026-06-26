// Deterministic colour per animal group / species, used for blob avatars and
// Species Detail hero gradients. Keeps the hand-painted palette cohesive while
// giving each creature its own tint.

import type { AnimalGroup } from "@/lib/identify.functions";

const GROUP_COLORS: Record<AnimalGroup, [string, string]> = {
  Mammal: ["#E0A878", "#9A5E38"],
  Bird: ["#8FB6DE", "#3F608C"],
  Reptile: ["#9BC07E", "#4F6E38"],
  Amphibian: ["#83C3A0", "#3C6E54"],
  Fish: ["#82C2CE", "#3B7E8C"],
  Insect: ["#E0BB66", "#8C6A2A"],
  Arachnid: ["#B79A72", "#6C5740"],
  Mollusk: ["#CFA6C0", "#7C5A70"],
  Crustacean: ["#E0978A", "#8C463A"],
  Other: ["#A99CB2", "#5C5165"],
};

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

function normalizeGroup(group: string | null | undefined): AnimalGroup {
  if (group && group in GROUP_COLORS) return group as AnimalGroup;
  return "Other";
}

/** A radial gradient string colour-matched to the creature. */
export function speciesGradient(
  group: string | null | undefined,
  name = "",
): string {
  const [light, dark] = GROUP_COLORS[normalizeGroup(group)];
  // Nudge the highlight origin per-name so two birds don't look identical.
  const h = hash(name || "x");
  const x = 30 + (h % 24);
  const y = 28 + ((h >> 3) % 20);
  return `radial-gradient(ellipse at ${x}% ${y}%, ${light}, ${dark})`;
}

/** A solid representative colour (for borders/accents). */
export function speciesColor(group: string | null | undefined): string {
  return GROUP_COLORS[normalizeGroup(group)][1];
}
