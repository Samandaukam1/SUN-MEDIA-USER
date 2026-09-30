export const GOAL_ASPECT_RATIO = 1.85;
export type Point = { x: number; y: number };
export type Bounds = Point & { width: number; height: number };
const rows = ["Yuqori", "O‘rta", "Pastki"];
const columns = ["chap chekka", "chap", "markaz", "o‘ng", "o‘ng chekka"];
export const ZONES = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  row: Math.floor(i / 5),
  column: i % 5,
  x: ((i % 5) + 0.5) / 5,
  y: (Math.floor(i / 5) + 0.5) / 3,
  label: `${rows[Math.floor(i / 5)]} ${columns[i % 5]} zona`,
}));
export function zonePoint(zone: number, bounds: Bounds): Point {
  const target = ZONES[zone - 1];
  if (!Number.isInteger(zone) || !target)
    throw new RangeError("Zone must be 1–15");
  return {
    x: bounds.x + target.x * bounds.width,
    y: bounds.y + target.y * bounds.height,
  };
}
export function eggTrajectory(
  start: Point,
  end: Point,
  progress: number,
  arc: number,
): Point {
  const t = Math.max(0, Math.min(1, progress));
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t - Math.sin(Math.PI * t) * arc,
  };
}
export function arenaLayout(width: number) {
  const height = width * 1.12;
  const goal = {
    x: width * 0.07,
    y: width * 0.19,
    width: width * 0.86,
    height: (width * 0.86) / GOAL_ASPECT_RATIO,
  };
  const ground = goal.y + goal.height;
  return {
    width,
    height,
    goal,
    /** The goal line: the keeper stands on it. */
    ground,
    shooter: { x: width * 0.5, y: height * 0.86 },
    keeper: zonePoint(8, goal),
    /** Where the keeper's feet rest: goal centre, just in front of the line. */
    keeperHome: { x: width * 0.5, y: ground + width * 0.014 },
  };
}

/** The chicken artwork (160 × 180): soles at y ≈ 167, body centre at y ≈ 100. */
export const KEEPER_ASPECT = 180 / 160;
export const KEEPER_FEET = 167 / 180;
export const KEEPER_BODY = 100 / 180;

/** The keeper's box for a feet point: the soles sit exactly on that point. */
export function keeperBox(feet: Point, size: number) {
  const height = size * KEEPER_ASPECT;
  return { left: feet.x - size / 2, top: feet.y - KEEPER_FEET * height, width: size, height };
}

export type KeeperDive = {
  dir: -1 | 0 | 1;
  /** Feet position and body angle (degrees, clockwise) when the body reaches the dive zone. */
  reach: Point;
  angle: number;
  /** Extra height at the top of the leap. */
  lift: number;
  /** Feet position and angle after landing: upright after a save, on its side after a goal. */
  land: Point;
  landAngle: number;
};

const REACH_ANGLE = [72, 40, 0, 40, 72];

/**
 * The dive, from the ground: the keeper pushes off at home, rotates about its feet so its body centre meets the
 * zone it chose, then lands — on its feet with the egg (CATCH) or on its side, sliding (GOAL). Feet never go
 * below the ground.
 */
export function keeperDive(
  layout: ReturnType<typeof arenaLayout>,
  keeperZone: number,
  size: number,
  result: "GOAL" | "CATCH",
  shotZone: number,
): KeeperDive {
  const home = layout.keeperHome;
  const target = zonePoint(keeperZone, layout.goal);
  const col = (keeperZone - 1) % 5;
  const row = Math.floor((keeperZone - 1) / 5);
  const dir = (col < 2 ? -1 : col > 2 ? 1 : 0) as -1 | 0 | 1;
  const angle = dir * REACH_ANGLE[col];
  const rad = (angle * Math.PI) / 180;
  const reachLen = size * KEEPER_ASPECT * (KEEPER_FEET - KEEPER_BODY);
  const reach = { x: target.x - reachLen * Math.sin(rad), y: Math.min(home.y, target.y + reachLen * Math.cos(rad)) };
  const minX = layout.goal.x + size * 0.3;
  const maxX = layout.goal.x + layout.goal.width - size * 0.3;
  const clampX = (x: number) => Math.min(maxX, Math.max(minX, x));
  const shotCol = (shotZone - 1) % 5;
  const fallDir = dir !== 0 ? dir : shotCol < 2 ? -1 : 1;
  const lift = size * (row === 2 ? 0.05 : 0.12);
  if (result === "CATCH") {
    return { dir, reach, angle, lift, land: { x: clampX(reach.x), y: home.y }, landAngle: dir * 10 };
  }
  return { dir, reach, angle, lift, land: { x: clampX(reach.x + fallDir * size * 0.18), y: home.y }, landAngle: fallDir * 92 };
}
