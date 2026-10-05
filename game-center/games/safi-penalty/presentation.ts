import type { Shot } from "../../engine/types";
import { arenaLayout, keeperDive, zonePoint } from "./physics.ts";

export type ChickenMood = "NEUTRAL" | "CONFIDENT" | "SMUG" | "ANGRY" | "FRUSTRATED" | "NERVOUS" | "DOMINANT";
export type MatchPresentation = {
  combo: number;
  consecutiveSaves: number;
  mood: ChickenMood;
};
export const INITIAL_PRESENTATION: MatchPresentation = {
  combo: 0,
  consecutiveSaves: 0,
  mood: "NEUTRAL",
};

/** Only a validated server shot may advance presentation state. */
export function advancePresentation(previous: MatchPresentation, shot: Shot): MatchPresentation {
  const combo = shot.result === "GOAL" ? previous.combo + 1 : 0;
  const consecutiveSaves = shot.result === "CATCH" ? previous.consecutiveSaves + 1 : 0;
  const mood: ChickenMood = consecutiveSaves >= 4
    ? "DOMINANT"
    : consecutiveSaves >= 3
      ? "SMUG"
      : consecutiveSaves >= 2
        ? "CONFIDENT"
      : combo >= 3
        ? "FRUSTRATED"
        : combo >= 2
          ? "NERVOUS"
          : shot.attempt >= 8 && shot.score >= 6 ? "NERVOUS" : shot.result === "GOAL" && shot.attempt >= 5 ? "ANGRY" : "NEUTRAL";
  return { combo, consecutiveSaves, mood };
}

/** Presentation classification uses the actual 3×5 target and glove travel in the rendered arena. */
export function classifyShotMoment(shot: Shot, width: number): "NEAR_MISS" | "CRITICAL_SAVE" | null {
  const layout = arenaLayout(width);
  const size = width * 0.255;
  const ball = zonePoint(shot.selectedZone, layout.goal);
  const glove = zonePoint(shot.goalkeeperZone, layout.goal);
  const gap = Math.hypot(ball.x - glove.x, ball.y - glove.y);
  const cell = layout.goal.width / 5;
  if (shot.result === "GOAL" && gap >= cell * 0.75 && gap <= cell * 1.5) return "NEAR_MISS";
  if (shot.result === "CATCH") {
    const dive = keeperDive(layout, shot.goalkeeperZone, size, shot.result, shot.selectedZone);
    const travel = Math.hypot(dive.reach.x - layout.keeperHome.x, dive.reach.y - layout.keeperHome.y);
    // A long, late dive to an outside or high corner makes a legitimate last-moment save.
    if (travel >= layout.goal.width * 0.31) return "CRITICAL_SAVE";
  }
  return null;
}
