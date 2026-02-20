// ═══════════════════════════════════════════════════════════
// Bloom Growth Stages — your creature evolves as you earn XP
// ═══════════════════════════════════════════════════════════

export const BLOOM_STAGES = [
  { name: "Seedling", minXP: 0, icon: "\uD83C\uDF30" },
  { name: "Sprout", minXP: 50, icon: "\uD83C\uDF31" },
  { name: "Budding", minXP: 150, icon: "\uD83C\uDF3F" },
  { name: "Blooming", minXP: 350, icon: "\uD83C\uDF38" },
  { name: "Radiant", minXP: 700, icon: "\u2728" },
];

export function getBloomStage(xp) {
  for (let i = BLOOM_STAGES.length - 1; i >= 0; i--) {
    if (xp >= BLOOM_STAGES[i].minXP) return { ...BLOOM_STAGES[i], index: i };
  }
  return { ...BLOOM_STAGES[0], index: 0 };
}

export function getNextStage(xp) {
  const cur = getBloomStage(xp);
  return cur.index < BLOOM_STAGES.length - 1
    ? BLOOM_STAGES[cur.index + 1]
    : null;
}
