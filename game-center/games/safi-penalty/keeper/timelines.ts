/**
 * The SAFI goalkeeper's moves as data: joint poses and keyframed timelines, played by the rig on native-driver
 * values. Angles are degrees (clockwise on screen) in the chicken's 160 × 180 artwork space; an arm hangs down at
 * shoulder 0, points sideways at 90 and straight up at 180 (the right arm is the mirror image of the left).
 * Finger values are curls (0 open … 1 closed fist). `yaw` turns the whole body about its vertical axis
 * (0 facing the player, 90 profile, 180 back) and `headYaw` turns the head alone — both in real 3D: the rig
 * slides each part by its depth, so a turn shows volume instead of a flipping picture.
 */
export const JOINTS = [
  "yaw", "headYaw", "lean", "bodyX", "bodyY", "puff", "headRot", "headX", "headY",
  "lSh", "lEl", "lWr", "lIdx", "lMid", "lRest", "lThumb",
  "rSh", "rEl", "rWr", "rIdx", "rMid", "rRest", "rThumb",
  "legL", "legR", "stomp",
] as const;
export type Joint = (typeof JOINTS)[number];
export type Pose = Record<Joint, number>;

export const FACES = [
  "NEUTRAL", "FOCUSED", "SMUG", "LAUGH", "EYES_CLOSED", "CONFIDENT", "SURPRISED", "ANGRY", "FRUSTRATED",
  "RECOVERING", "YAWN", "WINK",
] as const;
export type Face = (typeof FACES)[number];

const ZERO: Pose = Object.fromEntries(JOINTS.map((j) => [j, 0])) as Pose;
const arms = (l: [number, number, number, number, number, number, number], r = l): Partial<Pose> => ({
  lSh: l[0], lEl: l[1], lWr: l[2], lIdx: l[3], lMid: l[4], lRest: l[5], lThumb: l[6],
  rSh: r[0], rEl: r[1], rWr: r[2], rIdx: r[3], rMid: r[4], rRest: r[5], rThumb: r[6],
});

/** Goalkeeper ready: gloves up at chest height, palms to the player, fingers spread. */
export const READY: Pose = { ...ZERO, ...arms([58, 112, -12, 0.08, 0.08, 0.1, 0.05]) };
/** The caught egg in the left glove at the chest, the right glove covering it. */
export const HOLD: Pose = { ...ZERO, ...arms([22, -138, -8, 0.5, 0.5, 0.55, 0.45], [22, -132, -14, 0.3, 0.3, 0.35, 0.2]) };
/** Full stretch for the dive. */
export const DIVE: Pose = { ...ZERO, ...arms([166, 6, 0, 0, 0, 0, 0]) };
/** Sprawled on the grass after a goal. */
export const FALLEN: Pose = { ...ZERO, ...arms([128, 28, 12, 0.3, 0.3, 0.3, 0.2], [70, 22, 6, 0.3, 0.3, 0.3, 0.2]) };
export const RELAXED: Partial<Pose> = arms([8, 14, 6, 0.25, 0.25, 0.3, 0.1]);
const FISTS = { lIdx: 1, lMid: 1, lRest: 1, lThumb: 0.8, rIdx: 1, rMid: 1, rRest: 1, rThumb: 0.8 };

export type Key = readonly [number, number];
export type Timeline = {
  duration: number;
  tracks: Partial<Record<Joint, Key[]>>;
  faces?: [number, Face][];
};

/** Back-and-forth keys: `times` swings between a and b every `step` ms from `start`, ending on `end`. */
function osc(a: number, b: number, start: number, step: number, times: number, end: number): Key[] {
  const keys: Key[] = [];
  for (let i = 0; i < times; i++) keys.push([start + step * (2 * i + 1), a], [start + step * (2 * i + 2), b]);
  keys.push([start + step * (2 * times + 1), end]);
  return keys;
}
/** Hold a set of joints at a pose from `from` to `to`, arriving over `ease` ms and returning to `base` after. */
function pose(target: Partial<Pose>, base: Partial<Pose>, from: number, to: number, ease = 180): Partial<Record<Joint, Key[]>> {
  const t: Partial<Record<Joint, Key[]>> = {};
  for (const [j, v] of Object.entries(target) as [Joint, number][]) {
    t[j] = [[from + ease, v], [to, v], [to + ease, base[j] ?? 0]];
  }
  return t;
}
/** A real turn to show the back: 0° → 180° about the vertical axis, hold, and all the way round again. */
function turnAround(start: number, holdMs: number, turnMs = 420): Key[] {
  return [[start + turnMs, 180], [start + turnMs + holdMs, 180], [start + 2 * turnMs + holdMs, 0]];
}

// ——— Idle micro moves (from READY, back to READY) ———
export const IDLE_MICRO_TIMELINES: Record<string, Timeline> = {
  "weight-shift": { duration: 1100, tracks: { bodyX: [[380, 2.5], [650, 2.5], [1050, 0]], lean: [[380, 2], [650, 2], [1050, 0]], yaw: [[380, 14], [650, 14], [1050, 0]] } },
  "foot-shuffle": { duration: 900, tracks: { legL: [[150, -9], [300, 0]], legR: [[500, 9], [650, 0]], bodyY: [[150, 1], [300, 0], [500, 1], [650, 0]], yaw: [[150, -10], [300, 0], [500, 10], [650, 0]] } },
  "glove-clap": {
    duration: 900,
    tracks: { ...pose(arms([28, -128, -6, 0.1, 0.1, 0.1, 0.05]), READY, 0, 520, 160), lSh: [[160, 28], [260, 36], [360, 28], [520, 28], [700, READY.lSh]], rSh: [[160, 28], [260, 36], [360, 28], [520, 28], [700, READY.rSh]] },
    faces: [[0, "SMUG"], [800, "NEUTRAL"]],
  },
  "shoulder-roll": { duration: 900, tracks: { lSh: [[300, READY.lSh + 10], [700, READY.lSh]], rSh: [[380, READY.rSh + 10], [780, READY.rSh]], bodyY: [[300, -1.2], [700, 0]], yaw: [[300, -8], [540, 8], [820, 0]] } },
  "head-tilt": { duration: 900, tracks: { headRot: [[300, 9], [600, 9], [880, 0]] } },
  wink: { duration: 500, tracks: { headRot: [[150, -4], [450, 0]] }, faces: [[0, "WINK"], [420, "NEUTRAL"]] },
  "look-at-player": { duration: 1000, tracks: { headY: [[250, 1.2], [900, 0]], headYaw: [[200, -12], [450, 0]] }, faces: [[0, "FOCUSED"], [900, "NEUTRAL"]] },
  "look-away-back": { duration: 1150, tracks: { headYaw: [[300, 48], [750, 48], [1050, 0]], headRot: [[300, 4], [750, 4], [1050, 0]] } },
  "small-laugh": { duration: 800, tracks: { bodyY: osc(-1.5, 0, 0, 90, 3, 0), headRot: [[200, -6], [650, 0]] }, faces: [[0, "LAUGH"], [700, "NEUTRAL"]] },
  "glove-check": {
    duration: 1200,
    tracks: { rSh: [[260, 80], [900, 80], [1150, READY.rSh]], rEl: [[260, 128], [900, 128], [1150, READY.rEl]], rWr: [[260, 25], [900, 25], [1150, READY.rWr]], rIdx: osc(0.7, 0, 300, 120, 2, READY.rIdx), rMid: osc(0.7, 0, 330, 120, 2, READY.rMid), headRot: [[260, -8], [900, -8], [1150, 0]], headYaw: [[260, 28], [900, 28], [1150, 0]] },
    faces: [[0, "FOCUSED"], [1100, "NEUTRAL"]],
  },
  "finger-stretch": {
    duration: 900,
    tracks: Object.fromEntries((["lIdx", "lMid", "lRest", "rIdx", "rMid", "rRest"] as Joint[]).map((j) => [j, osc(0.9, 0, 0, 140, 2, READY[j])])),
  },
};

// ——— Pre-shot taunts (interrupted at once by a shot) ———
export const IDLE_TAUNT_TIMELINES: Record<string, Timeline> = {
  "back-turn": { duration: 2700, tracks: { yaw: turnAround(0, 1700), ...pose(RELAXED, READY, 0, 2450, 240) }, faces: [[0, "SMUG"], [2550, "NEUTRAL"]] },
  "come-come": {
    duration: 2000,
    tracks: {
      rSh: [[220, 62], [1750, 62], [1950, READY.rSh]], rEl: [[220, 104], [1750, 104], [1950, READY.rEl]], rWr: [[220, -18], [1750, -18], [1950, READY.rWr]],
      rIdx: osc(1, 0.05, 250, 130, 5, READY.rIdx), rMid: osc(1, 0.05, 270, 130, 5, READY.rMid), rRest: [[220, 0.9], [1750, 0.9], [1950, READY.rRest]], rThumb: [[220, 0.6], [1750, 0.6], [1950, READY.rThumb]],
      headRot: [[250, -5], [1750, -5], [1950, 0]],
    },
    faces: [[0, "SMUG"], [1900, "NEUTRAL"]],
  },
  "one-hand": {
    duration: 2100,
    tracks: { ...pose({ rSh: 6, rEl: 10, rWr: 4, rIdx: 0.3, rMid: 0.3, rRest: 0.35, rThumb: 0.2 }, READY, 0, 1850, 220), lSh: [[220, 40], [1850, 40], [2050, READY.lSh]], puff: [[260, 0.35], [1850, 0.35], [2050, 0]] },
    faces: [[0, "CONFIDENT"], [1950, "NEUTRAL"]],
  },
  "eyes-closed": { duration: 2100, tracks: { ...pose(RELAXED, READY, 0, 1850, 240), headRot: [[300, -7], [1850, -7], [2050, 0]] }, faces: [[0, "EYES_CLOSED"], [1950, "NEUTRAL"]] },
};

// ——— After a save (from HOLD, back to HOLD; the egg stays in the left glove) ———
export const HAPPY_TIMELINES: Record<string, Timeline> = {
  "laugh-with-egg": {
    duration: 1100,
    tracks: { headRot: [[160, -12], [300, -8], [440, -12], [580, -8], [720, -11], [1000, 0]], bodyY: osc(-2, 0, 0, 110, 4, 0), puff: [[200, 0.45], [420, 0.15], [640, 0.4], [1000, 0]], ...pose({ rSh: 40, rEl: -118, rWr: -20, rIdx: 0, rMid: 1, rRest: 1, rThumb: 0.8 }, HOLD, 150, 850, 160) },
    faces: [[0, "LAUGH"], [1000, "SMUG"]],
  },
  "one-hand-hold": {
    duration: 1150,
    tracks: { ...pose({ rSh: 96, rEl: 58, rWr: -8, rIdx: 0, rMid: 1, rRest: 1, rThumb: 1 }, HOLD, 0, 900, 220), rWr: [[220, -8], [360, 8], [500, -8], [640, 8], [780, -8], [900, -8], [1120, HOLD.rWr]], lSh: [[220, 34], [900, 34], [1120, HOLD.lSh]] },
    faces: [[0, "SMUG"]],
  },
  "eyes-closed": { duration: 950, tracks: { headRot: [[260, -9], [650, -9], [920, 0]], puff: [[260, 0.3], [650, 0.3], [920, 0]] }, faces: [[0, "EYES_CLOSED"], [880, "SMUG"]] },
  "come-come": {
    duration: 1150,
    tracks: { rSh: [[200, 62], [950, 62], [1130, HOLD.rSh]], rEl: [[200, 104], [950, 104], [1130, HOLD.rEl]], rWr: [[200, -18], [950, -18], [1130, HOLD.rWr]], rIdx: osc(1, 0.05, 220, 110, 3, HOLD.rIdx), rMid: osc(1, 0.05, 240, 110, 3, HOLD.rMid), rRest: [[200, 0.9], [950, 0.9], [1130, HOLD.rRest]] },
    faces: [[0, "SMUG"]],
  },
  "show-egg": {
    duration: 1150,
    tracks: { ...pose({ lSh: 150, lEl: 22, lWr: 0 }, HOLD, 0, 850, 260), ...pose({ rSh: 118, rEl: 26, rWr: 0, rIdx: 0, rMid: 1, rRest: 1, rThumb: 1 }, HOLD, 60, 850, 260), headRot: [[300, -8], [850, -8], [1110, 0]] },
    faces: [[0, "SMUG"], [600, "CONFIDENT"]],
  },
  "head-shake-no": {
    duration: 1000,
    tracks: { headYaw: [[110, -30], [270, 30], [420, -26], [560, 18], [680, 0]], headRot: [[110, -4], [270, 4], [420, -3], [560, 2], [680, 0]], ...pose({ rSh: 64, rEl: 108, rIdx: 0, rMid: 1, rRest: 1, rThumb: 1 }, HOLD, 0, 760, 180), rWr: [[180, 0], [300, -18], [420, 16], [540, -16], [660, 0], [940, HOLD.rWr]] },
    faces: [[0, "SMUG"]],
  },
  "chest-puff": { duration: 1000, tracks: { yaw: [[280, 18], [700, 18], [960, 0]], puff: [[280, 1.1], [360, 1], [700, 1], [960, 0]], headY: [[280, -4], [700, -4], [960, 0]], lean: [[280, -3], [700, -3], [960, 0]], rSh: [[280, 34], [700, 34], [960, HOLD.rSh]] }, faces: [[0, "CONFIDENT"]] },
  // The egg stays in view: the left glove holds it out to the side while the keeper turns away.
  "turn-back": { duration: 1350, tracks: { yaw: turnAround(0, 400, 380), ...pose({ lSh: 70, lEl: -20, lWr: 0 }, HOLD, 0, 1100, 220) }, faces: [[0, "SMUG"]] },
  "fake-yawn": {
    duration: 1200,
    tracks: { ...pose({ rSh: 42, rEl: -150, rWr: 24, rIdx: 0.2, rMid: 0.2, rRest: 0.2, rThumb: 0 }, HOLD, 0, 800, 240), headRot: [[250, -9], [800, -9], [1080, 0]], headY: [[250, -2], [800, -2], [1080, 0]] },
    faces: [[0, "YAWN"], [880, "SMUG"]],
  },
  "tiny-victory": {
    duration: 950,
    tracks: { bodyY: [[160, 2], [300, -6], [440, 0], [520, 1], [600, 0]], ...pose({ rSh: 152, rEl: 34, rWr: 0, rIdx: 1, rMid: 1, rRest: 1, rThumb: 0.8 }, HOLD, 0, 700, 200) },
    faces: [[0, "LAUGH"], [800, "CONFIDENT"]],
  },
  "glove-clap": {
    duration: 950,
    tracks: { rSh: [[150, 30], [260, 18], [380, 30], [500, 18], [620, 30], [900, HOLD.rSh]], rEl: [[150, -110], [260, -134], [380, -110], [500, -134], [620, -110], [900, HOLD.rEl]] },
    faces: [[0, "SMUG"]],
  },
  "look-at-egg": {
    duration: 1150,
    tracks: { headRot: [[250, 12], [550, 12], [800, 0]], headYaw: [[250, -30], [550, -30], [800, 0]], headY: [[250, 2.5], [550, 2.5], [800, 0]], bodyY: [[850, -1], [950, 0]] },
    faces: [[0, "NEUTRAL"], [620, "SMUG"]],
  },
};

// ——— After a goal (standing, from READY; the egg broke in the net) ———
export const ANGRY_TIMELINES: Record<string, Timeline> = {
  "ground-punch": {
    duration: 1200,
    tracks: { bodyY: [[250, 3], [420, 7], [520, 5], [900, 5], [1150, 0]], lean: [[250, 6], [900, 6], [1150, 0]], rSh: [[240, 150], [400, 18], [900, 18], [1150, READY.rSh]], rEl: [[240, 20], [400, 0], [900, 0], [1150, READY.rEl]], ...Object.fromEntries((["rIdx", "rMid", "rRest", "rThumb"] as Joint[]).map((j) => [j, [[200, 1], [900, 1], [1150, READY[j]]]])) },
    faces: [[0, "ANGRY"]],
  },
  "angry-head-shake": { duration: 950, tracks: { headYaw: [[90, -34], [210, 34], [330, -30], [450, 26], [570, -16], [700, 0]], headRot: [[90, -5], [210, 5], [330, -4], [450, 4], [570, -2], [700, 0]], ...pose(FISTS, READY, 0, 700, 150) }, faces: [[0, "ANGRY"]] },
  "two-hands-up": {
    duration: 1250,
    tracks: { ...pose(arms([148, 34, 0, 0, 0, 0, 0]), READY, 0, 950, 250), bodyY: [[250, -2], [950, -2], [1200, 0]], headRot: [[250, 6], [600, -6], [950, 0]] },
    faces: [[0, "FRUSTRATED"]],
  },
  "broken-egg-look": { duration: 1250, tracks: { headYaw: [[300, -60], [800, -60], [1150, 0]], headRot: [[300, -8], [800, -8], [1150, 0]], lean: [[300, -3], [800, -3], [1150, 0]] }, faces: [[0, "FRUSTRATED"], [850, "ANGRY"]] },
  "angry-look": { duration: 1000, tracks: { lean: [[220, 7], [760, 7], [980, 0]], headY: [[220, 2.5], [760, 2.5], [980, 0]], ...pose(FISTS, READY, 0, 760, 180) }, faces: [[0, "ANGRY"]] },
  "quick-stomp": {
    duration: 1050,
    tracks: { stomp: [[140, -9], [220, 0], [400, -8], [480, 0]], bodyY: [[220, 2], [300, 0], [480, 2], [560, 0]], ...pose(FISTS, READY, 0, 800, 150) },
    faces: [[0, "ANGRY"]],
  },
  "turn-away": { duration: 1400, tracks: { yaw: turnAround(0, 450, 400), ...pose(RELAXED, READY, 0, 1150, 220), headY: [[400, 2], [850, 2], [1250, 0]] }, faces: [[0, "FRUSTRATED"]] },
  "hands-on-hips": {
    duration: 1200,
    tracks: { ...pose(arms([46, -104, -38, 0.85, 0.85, 0.9, 0.7]), READY, 0, 950, 230), headRot: [[250, 5], [950, 5], [1180, 0]] },
    faces: [[0, "ANGRY"]],
  },
  "deep-breath": {
    duration: 1300,
    tracks: { puff: [[500, 0.9], [650, 0.9], [1150, 0]], headY: [[500, -3], [650, -3], [1150, 1], [1280, 0]], lSh: [[500, READY.lSh + 10], [1150, READY.lSh]], rSh: [[500, READY.rSh + 10], [1150, READY.rSh]] },
    faces: [[0, "FRUSTRATED"], [850, "RECOVERING"]],
  },
  "rage-shake": { duration: 950, tracks: { bodyX: osc(2.2, -2.2, 0, 60, 5, 0), headRot: osc(5, -5, 0, 90, 3, 0), ...pose(FISTS, READY, 0, 800, 120) }, faces: [[0, "ANGRY"]] },
};

export const BASES = { READY, HOLD, DIVE, FALLEN } as const;
export type BaseName = keyof typeof BASES;
