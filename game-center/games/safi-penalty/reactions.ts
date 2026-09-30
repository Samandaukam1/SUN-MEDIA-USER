/**
 * The SAFI goalkeeper's personality: what it does while waiting, after a save and after a goal. Visual only —
 * nothing here can change a result, the score, the level, rewards or coins; the server decides CATCH / GOAL and
 * the keeper acts it out.
 */

/** Small living moves while the player aims (never a frozen pose). */
export const IDLE_MICRO = [
  "weight-shift", "foot-shuffle", "glove-clap", "shoulder-roll", "head-tilt", "wink",
  "look-at-player", "look-away-back", "small-laugh", "glove-check", "finger-stretch",
] as const;

/** Longer pre-shot taunts; any shot interrupts them at once. */
export const IDLE_TAUNTS = [
  { id: "back-turn", bubbles: [], bubbleChance: 0 },
  { id: "come-come", bubbles: ["Qani, ur!", "Kel, kel!"], bubbleChance: 0.5 },
  { id: "one-hand", bubbles: ["Bitta qo‘lda!"], bubbleChance: 0.5 },
  { id: "eyes-closed", bubbles: [], bubbleChance: 0 },
] as const;

/** After a save: confident and funny, the egg always in the glove. */
export const HAPPY_REACTIONS = [
  { id: "laugh-with-egg", bubbles: [], bubbleChance: 0 },
  { id: "one-hand-hold", bubbles: ["Bitta qo‘lda ham!"], bubbleChance: 0.7 },
  { id: "eyes-closed", bubbles: ["Juda oson!"], bubbleChance: 0.3 },
  { id: "come-come", bubbles: ["Qani, yana ur!", "Yana!"], bubbleChance: 0.7 },
  { id: "show-egg", bubbles: ["Mana, menda!"], bubbleChance: 0.5 },
  { id: "head-shake-no", bubbles: ["Shumi?", "Yana urinib ko‘r 😏"], bubbleChance: 0.5 },
  { id: "chest-puff", bubbles: [], bubbleChance: 0 },
  { id: "turn-back", bubbles: [], bubbleChance: 0 },
  { id: "fake-yawn", bubbles: [], bubbleChance: 0 },
  { id: "tiny-victory", bubbles: [], bubbleChance: 0 },
  { id: "glove-clap", bubbles: [], bubbleChance: 0 },
  { id: "look-at-egg", bubbles: [], bubbleChance: 0 },
] as const;

/** After a goal: the chicken is honestly annoyed — never insulting the player. */
export const ANGRY_REACTIONS = [
  { id: "ground-punch", bubbles: [], bubbleChance: 0 },
  { id: "angry-head-shake", bubbles: [], bubbleChance: 0 },
  { id: "two-hands-up", bubbles: ["Nima bo‘ldi?!"], bubbleChance: 0.5 },
  { id: "broken-egg-look", bubbles: [], bubbleChance: 0 },
  { id: "angry-look", bubbles: [], bubbleChance: 0 },
  { id: "quick-stomp", bubbles: [], bubbleChance: 0 },
  { id: "turn-away", bubbles: [], bubbleChance: 0 },
  { id: "hands-on-hips", bubbles: [], bubbleChance: 0 },
  { id: "deep-breath", bubbles: [], bubbleChance: 0 },
  { id: "rage-shake", bubbles: ["Hmm!"], bubbleChance: 0.3 },
] as const;

/** Kept for the catalogue test and older callers: the save reactions. */
export const REACTIONS = HAPPY_REACTIONS;

/** The last `REACTION_MEMORY` picks of a pool are left out of the next draw — no back-to-back repeats. */
export const REACTION_MEMORY = 2;
export const REACTION_TIMING = { holdMs: 250, minMs: 600, maxMs: 1400, bubbleMs: 1000 } as const;
/** A random pause before the next idle move or taunt. */
export const IDLE_DELAY = { minMs: 2500, maxMs: 6000 } as const;
/** Share of idle beats that become a taunt rather than a micro move. */
export const TAUNT_SHARE = 0.3;

export function pickFrom(count: number, recent: readonly number[], random: () => number = Math.random): number {
  const blocked = new Set(recent.slice(-REACTION_MEMORY));
  const pool = Array.from({ length: count }, (_, i) => i).filter((i) => !blocked.has(i));
  const choices = pool.length ? pool : Array.from({ length: count }, (_, i) => i);
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

/** A random save reaction, never one of the last two. */
export function pickReaction(recent: readonly number[], random: () => number = Math.random): number {
  return pickFrom(HAPPY_REACTIONS.length, recent, random);
}

type WithBubbles = { bubbles: readonly string[]; bubbleChance: number };
/** Sometimes a short line; most moments stay silent. */
export function pickBubble(index: number, random: () => number = Math.random, pool: readonly WithBubbles[] = HAPPY_REACTIONS): string | null {
  const r = pool[index];
  if (!r || r.bubbles.length === 0 || random() >= r.bubbleChance) return null;
  return r.bubbles[Math.min(r.bubbles.length - 1, Math.floor(random() * r.bubbles.length))];
}

export function nextIdleDelay(random: () => number = Math.random): number {
  return Math.round(IDLE_DELAY.minMs + random() * (IDLE_DELAY.maxMs - IDLE_DELAY.minMs));
}

/**
 * Keeper animation states. Shots are accepted while the keeper idles or taunts (the taunt is cut at once);
 * a save runs CATCH → CATCH_HOLD → HAPPY_REACTION, a goal MISS → FALL → ANGRY_REACTION; both then RECOVER →
 * RESET → IDLE. No state overlaps another.
 */
export type KeeperStage =
  | "IDLE" | "IDLE_TAUNT" | "READY" | "FOCUS" | "DIVE" | "CATCH" | "CATCH_HOLD" | "HAPPY_REACTION"
  | "MISS" | "FALL" | "ANGRY_REACTION" | "RECOVER" | "RESET";
export type KeeperEvent =
  | "taunt" | "taunt-done" | "shot" | "focused" | "caught" | "scored" | "secured" | "hold-done"
  | "fell" | "reaction-done" | "skip" | "recovered" | "ready";

const NEXT: Record<KeeperStage, Partial<Record<KeeperEvent, KeeperStage>>> = {
  IDLE: { taunt: "IDLE_TAUNT", shot: "FOCUS" },
  IDLE_TAUNT: { "taunt-done": "IDLE", shot: "FOCUS" },
  READY: { shot: "FOCUS" },
  FOCUS: { focused: "DIVE" },
  DIVE: { caught: "CATCH", scored: "MISS" },
  CATCH: { secured: "CATCH_HOLD" },
  CATCH_HOLD: { "hold-done": "HAPPY_REACTION" },
  HAPPY_REACTION: { "reaction-done": "RECOVER", skip: "RECOVER" },
  MISS: { fell: "FALL" },
  FALL: { "hold-done": "ANGRY_REACTION" },
  ANGRY_REACTION: { "reaction-done": "RECOVER", skip: "RECOVER" },
  RECOVER: { recovered: "RESET" },
  RESET: { ready: "IDLE" },
};

export function nextStage(stage: KeeperStage, event: KeeperEvent): KeeperStage {
  return NEXT[stage][event] ?? stage;
}

export function canShoot(stage: KeeperStage): boolean {
  return stage === "IDLE" || stage === "IDLE_TAUNT" || stage === "READY";
}

export function canSkip(stage: KeeperStage): boolean {
  return stage === "HAPPY_REACTION" || stage === "ANGRY_REACTION";
}
