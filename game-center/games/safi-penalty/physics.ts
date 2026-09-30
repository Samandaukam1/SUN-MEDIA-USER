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
  return {
    width,
    height,
    goal,
    shooter: { x: width * 0.5, y: height * 0.86 },
    keeper: zonePoint(8, goal),
  };
}
