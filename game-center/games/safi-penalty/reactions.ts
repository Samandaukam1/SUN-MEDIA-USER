/**
 * SAFI goalkeeper taunts after a save: visual only — they never touch the score, the result, rewards or coins.
 * Playful, never insulting: the chicken shows off so the player wants one more shot.
 */
export const REACTIONS = [
  { id: "eyes-closed", name: "Ko‘z yumib", bubbles: ["Juda oson!"], bubbleChance: 0.3 },
  { id: "one-hand", name: "Bitta qo‘l", bubbles: ["Bitta qo‘lda ham!"], bubbleChance: 0.8 },
  { id: "head-shake", name: "Yo‘q-yo‘q", bubbles: ["Shumi?", "Yana urinib ko‘r 😏"], bubbleChance: 0.6 },
  { id: "fake-yawn", name: "Esnash", bubbles: [], bubbleChance: 0 },
  { id: "look-away", name: "Qaramaslik", bubbles: [], bubbleChance: 0 },
  { id: "chest-puff", name: "Ko‘krak kerish", bubbles: [], bubbleChance: 0 },
  { id: "come-again", name: "Yana ur", bubbles: ["Yana!", "Qani, yana ur!"], bubbleChance: 0.8 },
  { id: "egg-show-off", name: "Tuxumni ko‘rsatish", bubbles: ["Mana, menda!"], bubbleChance: 0.5 },
  { id: "mini-laugh", name: "Kulgi", bubbles: [], bubbleChance: 0 },
  { id: "back-turn", name: "Orqa o‘girish", bubbles: [], bubbleChance: 0 },
] as const;
export type ReactionId = (typeof REACTIONS)[number]["id"];

/** How many of the latest reactions are kept out of the next draw (so none repeats back to back). */
export const REACTION_MEMORY = 2;
export const REACTION_TIMING = { holdMs: 250, minMs: 600, maxMs: 1200, bubbleMs: 1000 } as const;

/** A random reaction index, never one of the last `REACTION_MEMORY` shown. */
export function pickReaction(recent: readonly number[], random: () => number = Math.random): number {
  const blocked = new Set(recent.slice(-REACTION_MEMORY));
  const pool = REACTIONS.map((_, i) => i).filter((i) => !blocked.has(i));
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

/** Sometimes a short line; most saves stay silent. */
export function pickBubble(index: number, random: () => number = Math.random): string | null {
  const r = REACTIONS[index];
  if (!r || r.bubbles.length === 0 || random() >= r.bubbleChance) return null;
  return r.bubbles[Math.min(r.bubbles.length - 1, Math.floor(random() * r.bubbles.length))];
}

/**
 * The keeper's visual stages after a shot. Shots are only possible in IDLE; a save runs CATCH_HOLD → REACTION →
 * RECOVER → RESET, a goal goes straight to RECOVER. A tap may cut a REACTION short (to RECOVER), nothing else.
 */
export type KeeperStage = "IDLE" | "FLIGHT" | "CATCH_HOLD" | "REACTION" | "RECOVER" | "RESET";
export type KeeperEvent = "shot" | "caught" | "scored" | "hold-done" | "reaction-done" | "skip" | "recovered" | "ready";

const NEXT: Record<KeeperStage, Partial<Record<KeeperEvent, KeeperStage>>> = {
  IDLE: { shot: "FLIGHT" },
  FLIGHT: { caught: "CATCH_HOLD", scored: "RECOVER" },
  CATCH_HOLD: { "hold-done": "REACTION" },
  REACTION: { "reaction-done": "RECOVER", skip: "RECOVER" },
  RECOVER: { recovered: "RESET" },
  RESET: { ready: "IDLE" },
};

export function nextStage(stage: KeeperStage, event: KeeperEvent): KeeperStage {
  return NEXT[stage][event] ?? stage;
}

export function canShoot(stage: KeeperStage): boolean {
  return stage === "IDLE";
}
