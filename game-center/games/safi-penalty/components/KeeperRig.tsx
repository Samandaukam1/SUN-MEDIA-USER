import { useFocusEffect } from "expo-router";
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, AppState, Easing, Platform, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { safiTheme as t } from "../config";
import type { ChickenMood } from "../presentation";
import { ANGRY_REACTIONS, HAPPY_REACTIONS, IDLE_MICRO, IDLE_TAUNTS, nextIdleDelay, pickBubble, pickFrom, TAUNT_SHARE } from "../reactions";
import {
  ANGRY_TIMELINES,
  BASES,
  HAPPY_TIMELINES,
  IDLE_MICRO_TIMELINES,
  IDLE_TAUNT_TIMELINES,
  JOINTS,
  type BaseName,
  type Face,
  type Joint,
  type Pose,
  type Timeline,
} from "../keeper/timelines";
import {
  armBehind,
  armTrack,
  AXIS_X,
  backSide,
  behind,
  directionScale,
  invert,
  outlineTrack,
  pointShift,
  profileOpacity,
  profileScale,
  profileVisible,
  surfaceTrack,
  YAW_GRID,
  type Ellipsoid,
  type Step,
  type SurfaceTrack,
} from "../keeper/turn3d";

const NATIVE = Platform.OS !== "web";

// Artwork geometry (160 × 180 space): shoulders, arm segments and the goalkeeper glove.
const SHOULDER = { x: 50, y: 97 };
const UA = { w: 13, l: 22 };
const FA = { w: 12, l: 19 };
const GLOVE = { w: 32, l: 40, base: 22 };
const NECK = { x: 80, y: 98 };
const HIP_L = { x: 64, y: 138 };
const HIP_R = { x: 97, y: 138 };
const ANKLE_L = { x: 61, y: 160 };
const ANKLE_R = { x: 100, y: 160 };

// The keeper in 3D: body and head are ellipsoids round the vertical axis (lower cross-sections are narrower), the
// tail and the ribbon of the headband sit behind, the arms stand a little in front. See keeper/turn3d.ts.
const TORSO: Ellipsoid = { cx: 84, cz: 0, a: 42, b: 36 };
const HEAD: Ellipsoid = { cx: 81, cz: 3, a: 28.5, b: 27 };
const TAIL_ROOT = { x: 114, y: 112, z: -20 };
const RIBBON = { x: 81, y: 45, z: HEAD.cz - HEAD.b - 1 };
const ARM_DEPTH = 10;
const R_SHOULDER_X = 160 - SHOULDER.x;

/** Parts drawn in their own small box of the artwork (x, y, w, h), turning about `o`. */
type Box = { x: number; y: number; w: number; h: number; o: [number, number] };
const BOX = {
  tail: { x: 100, y: 60, w: 54, h: 74, o: [TAIL_ROOT.x, TAIL_ROOT.y] },
  collar: { x: 64, y: 104, w: 38, h: 42, o: [83, 120] },
  number: { x: 68, y: 116, w: 28, h: 30, o: [82, 132] },
  shinL: { x: 54, y: 130, w: 16, h: 36, o: [HIP_L.x, HIP_L.y] },
  shinR: { x: 91, y: 130, w: 16, h: 36, o: [HIP_R.x, HIP_R.y] },
  footL: { x: 38, y: 152, w: 36, h: 22, o: [ANKLE_L.x, ANKLE_L.y] },
  footR: { x: 88, y: 152, w: 36, h: 22, o: [ANKLE_R.x, ANKLE_R.y] },
  eyeL: { x: 57, y: 37, w: 24, h: 35, o: [69, 60] },
  eyeR: { x: 82, y: 36, w: 25, h: 35, o: [94, 59] },
  beak: { x: 64, y: 58, w: 38, h: 42, o: [83, 75] },
  sideBeak: { x: 76, y: 58, w: 26, h: 32, o: [83, 74] },
  wattle: { x: 72, y: 82, w: 20, h: 22, o: [81, 90] },
  nape: { x: 66, y: 80, w: 28, h: 18, o: [80, 90] },
  ribbon: { x: 68, y: 38, w: 26, h: 32, o: [RIBBON.x, RIBBON.y] },
} satisfies Record<string, Box>;

/** Every turning curve, sampled once for all keepers. */
const TRACKS = {
  torso: outlineTrack(TORSO),
  collar: surfaceTrack({ ...TORSO, b: 34 }, 0),
  number: surfaceTrack({ ...TORSO, b: 32 }, 180, 0, 180),
  tail: { shift: pointShift(TAIL_ROOT.x - AXIS_X, TAIL_ROOT.z), scale: directionScale(0.75, -0.66), behind: behind(TAIL_ROOT.x - AXIS_X, TAIL_ROOT.z) },
  legL: pointShift(HIP_L.x - AXIS_X, 0),
  legR: pointShift(HIP_R.x - AXIS_X, 0),
  foot: directionScale(1, 0),
  eyeL: surfaceTrack(HEAD, -25),
  eyeR: surfaceTrack(HEAD, 27),
  beak: surfaceTrack({ ...HEAD, b: 25 }, 0, 2),
  wattle: surfaceTrack({ ...HEAD, a: 20, b: 19 }, 0),
  nape: surfaceTrack({ ...HEAD, a: 22, b: 20 }, 180, 0, 180),
  ribbon: { shift: pointShift(RIBBON.x - AXIS_X, RIBBON.z), behind: behind(RIBBON.x - AXIS_X, RIBBON.z) },
  profile: { scale: profileScale(), opacity: profileOpacity(), visible: profileVisible() },
  // The far (right) arm goes behind the body as soon as the turn takes it there; the near one only once its
  // plane has turned past 80°, just before a glove would be seen edge-on.
  armL: { ...armTrack(SHOULDER.x - AXIS_X, ARM_DEPTH), behind: armBehind(80) },
  armR: { ...armTrack(R_SHOULDER_X - AXIS_X, ARM_DEPTH), behind: behind(R_SHOULDER_X - AXIS_X, ARM_DEPTH, 4) },
  glove: backSide(),
};

type Mode = "idle" | "focus" | "dive" | "hold" | "fallen" | "angry";
const MODE_BASE: Record<Mode, BaseName> = { idle: "READY", focus: "READY", dive: "DIVE", hold: "HOLD", fallen: "FALLEN", angry: "READY" };
const MODE_FACE: Record<Mode, Face> = { idle: "NEUTRAL", focus: "FOCUSED", dive: "FOCUSED", hold: "SMUG", fallen: "SURPRISED", angry: "ANGRY" };

export type KeeperRigHandle = {
  /** Living idle: breathing, blinking and, now and then, a micro move or a taunt. */
  idle: () => void;
  /** The player shot: cancel whatever is playing, face the ball, gloves ready. */
  focus: () => void;
  /** Arms stretch for the dive. */
  dive: (direction?: number) => void;
  /** Egg secured: fingers close round it, gloves to the chest. */
  caught: () => void;
  /** Beaten: sprawled on the grass, surprised, then annoyed and looking at the goal. */
  fallen: (goalSide: -1 | 1) => void;
  /** Back on its feet, still angry. */
  standAngry: () => void;
  /** Plays a save / goal reaction; returns the short line to show, if any. */
  happy: (index: number, onDone: () => void) => string | null;
  angry: (index: number, onDone: () => void) => string | null;
  /** Cut a reaction short and settle into the current pose. */
  stop: () => void;
  /** Egg cleanup and a neutral pose before the next shot. */
  reset: () => void;
};

type Props = {
  size: number;
  holding: boolean;
  holdingHand?: "l" | "r";
  goldenEgg?: boolean;
  reduced: boolean;
  /** An idle taunt starts / ends (the keeper stays ready for a shot during it). */
  onTaunt?: (active: boolean, bubble: string | null) => void;
  mood?: ChickenMood;
  paused?: boolean;
  personality?: "CLASSIC" | "SHOWMAN" | "SERIOUS";
  gloveColor?: string;
  outfitColor?: string;
};

/**
 * The SAFI goalkeeper as a rigged mascot: torso, head with a full face system, legs, and two arms with shoulder,
 * elbow and wrist joints ending in big goalkeeper gloves whose thumb and fingers bend. It turns in 3D — round body
 * and head, a face that slides round the head, a beak that shows its side, arms and tail that pass behind the body —
 * instead of flipping a flat picture. Every motion is a native-driver value; face changes are the only re-renders.
 * Poses and timelines live in keeper/timelines.ts, the turning geometry in keeper/turn3d.ts.
 */
export const KeeperRig = forwardRef<KeeperRigHandle, Props>(function KeeperRig({ size, holding, holdingHand = "l", goldenEgg = false, reduced, onTaunt, mood = "NEUTRAL", paused = false, personality = "CLASSIC", gloveColor = t.primary, outfitColor = t.primary }, ref) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const s = size / 160;
  const [face, setFace] = useState<Face>("NEUTRAL");
  const [blink, setBlink] = useState(false);
  const v = useRef(Object.fromEntries(JOINTS.map((j) => [j, new Animated.Value(BASES.READY[j])])) as Record<Joint, Animated.Value>).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const mode = useRef<Mode>("idle");
  const running = useRef<Animated.CompositeAnimation | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recent = useRef({ micro: [] as number[], taunt: [] as number[] });
  const onTauntRef = useRef(onTaunt);
  onTauntRef.current = onTaunt;
  const [visible, setActive] = useState(true);
  const active = visible && !paused;
  const activeRef = useRef(active);
  activeRef.current = active;
  const moodRef = useRef(mood);
  moodRef.current = mood;
  const handRef = useRef(holdingHand);
  handRef.current = holdingHand;
  const poseFor = useCallback((name: BaseName): Pose => {
    const base = BASES[name];
    if (name !== "HOLD" || handRef.current !== "r") return base;
    return Object.fromEntries(JOINTS.map((j) => [j, base[(j.startsWith("l") && j !== "lean" && j !== "legL" ? `r${j.slice(1)}` : j.startsWith("r") ? `l${j.slice(1)}` : j) as Joint]])) as Pose;
  }, []);
  const restingFace = useCallback((): Face => mode.current !== "idle" ? MODE_FACE[mode.current] : ({ NEUTRAL: "NEUTRAL", CONFIDENT: "CONFIDENT", SMUG: "SMUG", ANGRY: "ANGRY", FRUSTRATED: "FRUSTRATED", NERVOUS: "NERVOUS", DOMINANT: "CONFIDENT" } as const)[moodRef.current], []);
  const job = useRef<{ tl: Timeline; elapsed: number; started: number; done?: () => void } | null>(null);

  // The living idle pauses when the screen loses focus or the app goes to the background.
  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => setActive(false);
    }, []),
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => setActive(st === "active"));
    return () => sub.remove();
  }, []);

  // Chest breathing, always, while visible.
  useEffect(() => {
    if (!active || reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE, isInteraction: false }),
        Animated.timing(breathe, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE, isInteraction: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduced, breathe]);

  // A blink every few seconds while the face is calm.
  useEffect(() => {
    if (!active) return;
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    const next = () => {
      t1 = setTimeout(() => {
        setBlink(true);
        t2 = setTimeout(() => {
          setBlink(false);
          next();
        }, 120);
      }, 2400 + Math.random() * 2600);
    };
    next();
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const stopIdle = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = null;
  };

  const to = useCallback(
    (joint: Joint, value: number, duration: number, easing = Easing.inOut(Easing.quad)) =>
      Animated.timing(v[joint], { toValue: value, duration, easing, useNativeDriver: NATIVE, isInteraction: false }),
    [v],
  );

  /** All joints to a base pose. */
  const settle = useCallback(
    (base: Pose, ms: number, easing = Easing.out(Easing.quad)) => Animated.parallel(JOINTS.map((j) => to(j, base[j], ms, easing))),
    [to],
  );

  /** A keyframed timeline over the current base pose; every joint is back on the base by its end. */
  const build = useCallback(
    (tl: Timeline, base: Pose, offset = 0) => {
      const tracks = (Object.entries(tl.tracks) as [Joint, readonly (readonly [number, number])[]][]).map(([joint, keys]) => {
        const steps: Animated.CompositeAnimation[] = [];
        let time = offset;
        for (const [at, value] of keys.filter(([at]) => at >= offset)) {
          steps.push(to(joint, value, Math.max(0, at - time)));
          time = at;
        }
        const last = keys[keys.length - 1]?.[1];
        if (last !== base[joint]) steps.push(to(joint, base[joint], Math.max(120, tl.duration - time)));
        return Animated.sequence(steps);
      });
      return Animated.parallel([...tracks, Animated.delay(Math.max(0, tl.duration - offset))]);
    },
    [to],
  );

  const play = useCallback(
    (tl: Timeline, onDone?: () => void, elapsed = 0) => {
      const old = running.current; running.current = null; old?.stop();
      clearTimers();
      const base = poseFor(MODE_BASE[mode.current]);
      job.current = { tl, elapsed, started: performance.now(), done: onDone };
      if (!activeRef.current) return;
      for (const [at, f] of tl.faces ?? []) {
        if (at <= elapsed) setFace(f);
        else timers.current.push(setTimeout(() => setFace(f), at - elapsed));
      }
      // Reduce Motion: the faces tell the story, the body barely moves.
      const anim = reduced ? Animated.delay(Math.max(0, Math.min(700, tl.duration) - elapsed)) : build(tl, base, elapsed);
      running.current = anim;
      anim.start(({ finished }) => {
        if (running.current !== anim) return;
        running.current = null;
        job.current = null;
        clearTimers();
        setFace(restingFace());
        if (finished) onDone?.();
      });
    },
    [build, reduced, restingFace, poseFor],
  );

  /** Switch the resting pose (and face) for a phase of the shot. */
  const enter = useCallback(
    (next: Mode, ms: number) => {
      running.current?.stop();
      running.current = null;
      job.current = null;
      clearTimers();
      stopIdle();
      mode.current = next;
      setFace(restingFace());
      const anim = settle(poseFor(MODE_BASE[next]), reduced ? 0 : ms, next === "dive" ? Easing.out(Easing.cubic) : Easing.out(Easing.quad));
      running.current = anim;
      if (activeRef.current) anim.start();
    },
    [settle, reduced, restingFace, poseFor],
  );

  // The idle scheduler: a random pause (2.5–6 s), then a micro move or, sometimes, a taunt — never the last two.
  const scheduleIdle = useCallback(() => {
    stopIdle();
    if (mode.current !== "idle" || !active) return;
    idleTimer.current = setTimeout(() => {
      if (mode.current !== "idle") return;
      if (Math.random() < (reduced ? 0.08 : personality === "SHOWMAN" ? 0.6 : personality === "SERIOUS" ? 0.08 : TAUNT_SHARE)) {
        const i = pickFrom(IDLE_TAUNTS.length, recent.current.taunt);
        recent.current.taunt = [...recent.current.taunt, i].slice(-3);
        onTauntRef.current?.(true, pickBubble(i, Math.random, IDLE_TAUNTS));
        play(IDLE_TAUNT_TIMELINES[IDLE_TAUNTS[i].id], () => {
          onTauntRef.current?.(false, null);
          scheduleIdle();
        });
      } else {
        const pool = reduced ? IDLE_MICRO.filter((m) => m === "wink" || m === "look-at-player" || m === "head-tilt" || m === "double-blink") : IDLE_MICRO;
        const i = pickFrom(pool.length, recent.current.micro);
        recent.current.micro = [...recent.current.micro, i].slice(-3);
        play(IDLE_MICRO_TIMELINES[pool[i]], scheduleIdle);
      }
    }, nextIdleDelay());
  }, [active, play, reduced, personality]);

  useEffect(() => {
    if (!active) {
      if (job.current) job.current.elapsed += performance.now() - job.current.started;
      const old = running.current; running.current = null; old?.stop(); clearTimers();
    } else if (job.current) {
      const { tl, elapsed, done } = job.current; play(tl, done, elapsed);
    } else {
      setFace(restingFace());
      settle(poseFor(MODE_BASE[mode.current]), reduced ? 0 : 180).start();
    }
  }, [active, play, restingFace, settle, reduced, poseFor]);
  useEffect(() => { if (mode.current === "idle" && !job.current) setFace(restingFace()); }, [mood, restingFace]);
  useEffect(() => () => { const old = running.current; running.current = null; old?.stop(); clearTimers(); stopIdle(); }, []);
  useEffect(() => {
    if (active && mode.current === "idle") scheduleIdle();
    else stopIdle();
    return stopIdle;
  }, [active, scheduleIdle]);

  useImperativeHandle(
    ref,
    () => ({
      idle() {
        onTauntRef.current?.(false, null);
        enter("idle", 260);
        scheduleIdle();
      },
      focus() {
        // Even from a turned back: spin round to face the ball at once.
        onTauntRef.current?.(false, null);
        enter("focus", 110);
      },
      dive(direction = 0) {
        enter("dive", 220);
        // Read the target first with the head; the wings extend a beat later.
        play({ duration: 280, tracks: {
          headYaw: [[55, direction * 20], [280, 0]], headRot: [[80, direction * 5], [280, 0]],
          lSh: [[65, BASES.READY.lSh], [230, BASES.DIVE.lSh]],
          rSh: [[90, BASES.READY.rSh], [260, BASES.DIVE.rSh]],
          legL: [[90, -direction * 8], [280, 0]], legR: [[110, -direction * 8], [280, 0]],
        }, faces: [[0, "FOCUSED"]] });
      },
      caught() {
        enter("hold", 180);
      },
      fallen(goalSide) {
        enter("fallen", 200);
        timers.current.push(
          setTimeout(() => {
            setFace("ANGRY");
            // The head turns toward the goal where the egg broke.
            Animated.parallel([to("headYaw", goalSide * 42, 280), to("headRot", goalSide * 8, 280)]).start();
          }, 420),
        );
      },
      standAngry() {
        enter("angry", 280);
      },
      happy(index, onDone) {
        const item = HAPPY_REACTIONS[index] ?? HAPPY_REACTIONS[0];
        const tl = HAPPY_TIMELINES[item.id];
        const mirrored = handRef.current === "r" ? { ...tl, tracks: Object.fromEntries(Object.entries(tl.tracks).map(([j, keys]) => [/^[lr](Sh|El|Wr|Idx|Mid|Rest|Thumb)$/.test(j) ? `${j[0] === "l" ? "r" : "l"}${j.slice(1)}` : j, keys])) } : tl;
        play(mirrored, onDone);
        return pickBubble(index, Math.random, HAPPY_REACTIONS);
      },
      angry(index, onDone) {
        const item = ANGRY_REACTIONS[index] ?? ANGRY_REACTIONS[0];
        play(ANGRY_TIMELINES[item.id], onDone);
        return pickBubble(index, Math.random, ANGRY_REACTIONS);
      },
      stop() {
        const anim = running.current;
        running.current = null;
        job.current = null;
        anim?.stop();
        clearTimers();
        setFace(restingFace());
        settle(poseFor(MODE_BASE[mode.current]), reduced ? 0 : 140).start();
      },
      reset() {
        running.current?.stop();
        running.current = null;
        job.current = null;
        clearTimers();
        stopIdle();
        mode.current = "idle";
        setFace(restingFace());
        JOINTS.forEach((j) => v[j].setValue(BASES.READY[j]));
      },
    }),
    [enter, play, scheduleIdle, settle, to, v, reduced, restingFace, poseFor],
  );

  const h = size * (180 / 160);
  const px = (x: number, y: number) => `${Math.round(x * s)}px ${Math.round(y * s)}px`;
  const u = (val: Animated.Value) => Animated.multiply(val, s);
  const deg = (val: Animated.Value) => val.interpolate({ inputRange: [-360, 360], outputRange: ["-360deg", "360deg"] });
  const calm = face === "NEUTRAL" || face === "FOCUSED" || face === "CONFIDENT";
  const shownFace: Face = blink && calm ? "EYES_CLOSED" : face;

  // The turn, as native-driver interpolations of the body yaw (and body + head yaw for the face).
  const k = useMemo(() => {
    const headYaw = Animated.add(v.yaw, v.headYaw);
    const at = (val: Animated.Value | Animated.AnimatedAddition<number>, out: readonly number[], mul = 1) =>
      val.interpolate({ inputRange: [...YAW_GRID], outputRange: out.map((n) => n * mul), extrapolate: "clamp" });
    const surface = (val: Animated.Value | Animated.AnimatedAddition<number>, tr: SurfaceTrack) => ({
      opacity: at(val, tr.opacity),
      transform: [{ translateX: at(val, tr.shift, s) }, { scaleX: at(val, tr.scale) }],
    });
    const on = (val: Animated.Value | Animated.AnimatedAddition<number>, st: Step) =>
      val.interpolate({ inputRange: st.input, outputRange: st.output, extrapolate: "clamp" });
    const beakShift = at(headYaw, TRACKS.beak.shift, s);
    const armMotion = (tr: { rotate: number[]; shift: number[]; behind: Step }) => ({
      transform: [
        { perspective: size * 4 },
        { translateX: at(v.yaw, tr.shift, s) },
        { rotateY: v.yaw.interpolate({ inputRange: [...YAW_GRID], outputRange: tr.rotate.map((d) => `${d}deg`), extrapolate: "clamp" }) },
      ],
      back: on(v.yaw, tr.behind),
      front: on(v.yaw, invert(tr.behind)),
    });
    return {
      torso: { transform: [{ translateX: at(v.yaw, TRACKS.torso.shift, s) }, { scaleX: at(v.yaw, TRACKS.torso.scale) }] },
      collar: surface(v.yaw, TRACKS.collar),
      number: surface(v.yaw, TRACKS.number),
      tail: { transform: [{ translateX: at(v.yaw, TRACKS.tail.shift, s) }, { scaleX: at(v.yaw, TRACKS.tail.scale) }] },
      tailBehind: on(v.yaw, TRACKS.tail.behind),
      tailFront: on(v.yaw, invert(TRACKS.tail.behind)),
      legL: at(v.yaw, TRACKS.legL, s),
      legR: at(v.yaw, TRACKS.legR, s),
      foot: { transform: [{ scaleX: at(v.yaw, TRACKS.foot) }] },
      eyeL: surface(headYaw, TRACKS.eyeL),
      eyeR: surface(headYaw, TRACKS.eyeR),
      beak: { opacity: at(headYaw, TRACKS.beak.opacity), transform: [{ translateX: beakShift }, { scaleX: at(headYaw, TRACKS.beak.scale) }] },
      sideBeak: { opacity: Animated.multiply(at(headYaw, TRACKS.profile.opacity), on(headYaw, TRACKS.profile.visible)), transform: [{ translateX: beakShift }, { scaleX: at(headYaw, TRACKS.profile.scale) }] },
      wattle: surface(headYaw, TRACKS.wattle),
      nape: surface(headYaw, TRACKS.nape),
      ribbon: { transform: [{ translateX: at(headYaw, TRACKS.ribbon.shift, s) }] },
      ribbonBehind: on(headYaw, TRACKS.ribbon.behind),
      ribbonFront: on(headYaw, invert(TRACKS.ribbon.behind)),
      arm: { l: armMotion(TRACKS.armL), r: armMotion(TRACKS.armR) },
      gloveBack: on(v.yaw, TRACKS.glove),
    };
  }, [v, s, size]);

  const piece = (box: Box, style: object, children: ReactNode, key?: string) => (
    <Piece key={key} box={box} s={s} style={style}>
      {children}
    </Piece>
  );

  // Each arm is drawn twice — behind the body and in front of it — and the turn shows the right one.
  const arm = (side: "l" | "r", layer: "back" | "front") => {
    const j = (name: "Sh" | "El" | "Wr" | "Idx" | "Mid" | "Rest" | "Thumb") => v[`${side}${name}` as Joint];
    return (
      <Animated.View
        key={`${side}${layer}`}
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: k.arm[side][layer], transformOrigin: px(AXIS_X, SHOULDER.y), transform: k.arm[side].transform }]}
      >
        <View style={[StyleSheet.absoluteFill, side === "r" && { transformOrigin: px(80, 90), transform: [{ scaleX: -1 }] }]}>
          <Animated.View
            style={{
              position: "absolute",
              left: (SHOULDER.x - UA.w / 2) * s,
              top: (SHOULDER.y - 4) * s,
              width: UA.w * s,
              height: (UA.l + 8) * s,
              transformOrigin: px(UA.w / 2, 4),
              transform: [{ rotate: deg(j("Sh")) }],
            }}
          >
            <UpperArm w={UA.w} l={UA.l} />
            <Animated.View
              style={{
                position: "absolute",
                left: (UA.w / 2 - FA.w / 2) * s,
                top: (UA.l + 2) * s,
                width: FA.w * s,
                height: (FA.l + 6) * s,
                transformOrigin: px(FA.w / 2, 2),
                transform: [{ rotate: deg(j("El")) }],
              }}
            >
              <Forearm w={FA.w} l={FA.l} />
              <Animated.View
                style={{
                  position: "absolute",
                  left: (FA.w / 2 - GLOVE.w / 2) * s,
                  top: FA.l * s,
                  width: GLOVE.w * s,
                  height: GLOVE.l * s,
                  transformOrigin: px(GLOVE.w / 2, 2),
                  transform: [{ rotate: deg(j("Wr")) }],
                }}
              >
                <GloveHand
                  id={`${id}${side}${layer}`}
                  holding={side === holdingHand && holding}
                  color={gloveColor}
                  golden={goldenEgg}
                  s={s}
                  back={k.gloveBack}
                  idx={j("Idx")}
                  mid={j("Mid")}
                  rest={j("Rest")}
                  thumb={j("Thumb")}
                />
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>
    );
  };

  const tail = (opacity: Animated.AnimatedInterpolation<number>, key: string) => piece(BOX.tail, { opacity, ...k.tail }, <Path d="M109 96Q146 65 139 104Q149 108 122 129Z" fill={t.featherShade} />, key);
  const ribbon = (opacity: Animated.AnimatedInterpolation<number>, key: string) => piece(BOX.ribbon, { opacity, ...k.ribbon }, <Ribbon />, key);

  return (
    <View style={{ width: size, height: h }}>
      {/* Legs: the hips swing round the axis, the toes turn with the body */}
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: px(HIP_L.x, HIP_L.y), transform: [{ translateX: k.legL }, { rotate: deg(v.legL) }] }]}>
        {piece(BOX.shinL, {}, <Path d="M64 136L61 160" stroke={t.yolk} strokeWidth="9" strokeLinecap="round" />)}
        {piece(BOX.footL, k.foot, <Path d="M61 160L43 165M61 160L69 167M61 160L54 168" stroke={t.yolk} strokeWidth="6.5" strokeLinecap="round" />)}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: px(HIP_R.x, HIP_R.y), transform: [{ translateX: k.legR }, { translateY: u(v.stomp) }, { rotate: deg(v.legR) }] }]}>
        {piece(BOX.shinR, {}, <Path d="M97 136L100 160" stroke={t.yolk} strokeWidth="9" strokeLinecap="round" />)}
        {piece(BOX.footR, k.foot, <Path d="M100 160L118 164M100 160L92 168M100 160L107 168" stroke={t.yolk} strokeWidth="6.5" strokeLinecap="round" />)}
      </Animated.View>
      {/* Upper body: sways, bobs and leans as one (the feet stay planted) */}
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: px(80, 166), transform: [{ translateX: u(v.bodyX) }, { translateY: u(v.bodyY) }, { rotate: deg(v.lean) }] }]}>
        {arm("l", "back")}
        {arm("r", "back")}
        {tail(k.tailBehind, "tail-behind")}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transformOrigin: px(84, 140),
              transform: [
                { scaleX: Animated.add(1, Animated.multiply(v.puff, 0.09)) },
                { scaleY: Animated.add(Animated.add(1, Animated.multiply(v.puff, 0.035)), Animated.multiply(breathe, 0.018)) },
              ],
            },
          ]}
        >
          <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: px(TORSO.cx, 110), ...k.torso }]}>
            <TorsoBase id={id} color={outfitColor} />
          </Animated.View>
          {piece(BOX.collar, k.collar, <Collar />)}
          {piece(BOX.number, k.number, <SvgText x="82" y="141" fill={t.white} fontSize="22" fontWeight="700" textAnchor="middle">1</SvgText>)}
        </Animated.View>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transformOrigin: px(NECK.x, NECK.y),
              transform: [{ translateX: u(v.headX) }, { translateY: Animated.add(u(v.headY), Animated.multiply(breathe, -0.8 * s)) }, { rotate: deg(v.headRot) }],
            },
          ]}
        >
          {ribbon(k.ribbonBehind, "ribbon-behind")}
          <HeadBase id={id} />
          {piece(BOX.nape, k.nape, <Path d="M71 89Q75.5 94 80 89Q84.5 94 89 89" stroke={t.featherShade} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />)}
          {ribbon(k.ribbonFront, "ribbon-front")}
          {piece(BOX.wattle, k.wattle, <Path d="M75 85Q80 101 88 85" fill={t.comb} />)}
          {piece(BOX.eyeL, k.eyeL, <EyeArt face={shownFace} side="l" />)}
          {piece(BOX.eyeR, k.eyeR, <EyeArt face={shownFace} side="r" />)}
          {piece(BOX.sideBeak, k.sideBeak, <SideBeak open={face === "LAUGH" || face === "YAWN" || face === "SURPRISED"} />)}
          {piece(BOX.beak, k.beak, <BeakArt face={shownFace} />)}
        </Animated.View>
        {/* The left glove (the one holding the egg) is drawn last, in front */}
        {arm("r", "front")}
        {arm("l", "front")}
        {tail(k.tailFront, "tail-front")}
      </Animated.View>
    </View>
  );
});

/** A part of the artwork drawn in its own small box (artwork coordinates), turning about the box's `o` point. */
function Piece({ box, s, style, children }: { box: Box; s: number; style: object; children: ReactNode }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: box.x * s,
          top: box.y * s,
          width: box.w * s,
          height: box.h * s,
          transformOrigin: `${Math.round((box.o[0] - box.x) * s)}px ${Math.round((box.o[1] - box.y) * s)}px`,
        },
        style,
      ]}
    >
      <Svg width="100%" height="100%" viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}>
        {children}
      </Svg>
    </Animated.View>
  );
}

/** The body: white feathers and the goalkeeper jersey wrapped round it (the same from every side). */
function TorsoBase({ id, color }: { id: string; color: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 180">
      <Defs>
        <LinearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor={t.white} />
          <Stop offset="1" stopColor={t.featherShade} />
        </LinearGradient>
        <LinearGradient id={`${id}j`} x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor={color} />
          <Stop offset="1" stopColor={t.arena} />
        </LinearGradient>
      </Defs>
      <Path d="M48 70Q25 98 43 134Q56 153 85 149Q120 148 126 122Q134 87 104 65Z" fill={`url(#${id}b)`} />
      <Path d="M43 100Q80 115 123 98L122 130Q111 151 82 149Q54 149 42 131Z" fill={`url(#${id}j)`} />
    </Svg>
  );
}

function Collar() {
  return (
    <>
      <Path d="M70 110L82 122L96 110" fill="none" stroke={t.white} strokeWidth="3" opacity=".9" />
      <Path d="M78 127V140M88 127V140" stroke={t.white} strokeWidth="3" strokeLinecap="round" opacity=".7" />
    </>
  );
}

/** Comb, round head and the headband that wraps all the way round. */
function HeadBase({ id }: { id: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 180" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={`${id}h`} x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor={t.white} />
          <Stop offset="1" stopColor={t.featherShade} />
        </LinearGradient>
      </Defs>
      <Path d="M59 40Q48 22 62 20Q62 5 74 13Q83 -1 92 13Q112 11 103 36" fill={t.comb} />
      <Path d="M56 42Q77 23 99 40Q114 53 109 77Q109 95 88 102Q58 99 52 78Q46 59 56 42Z" fill={`url(#${id}h)`} />
      <Path d="M55.5 45.5Q80 40 104.5 45.5" stroke={t.primary} strokeWidth="7" fill="none" />
    </Svg>
  );
}

/** The headband's knot and ribbons, at the back of the head. */
function Ribbon() {
  return (
    <>
      <Path d="M80 46Q75 56 70 65L75 67Q79 57 82 47Z" fill={t.primary} />
      <Path d="M82 46Q87 56 91 66L86 67Q83 57 80 47Z" fill={t.arena} opacity=".9" />
      <Circle cx="81" cy="45" r="3.6" fill={t.primary} />
    </>
  );
}

const BROWS: Record<Face, [string, string, number]> = {
  NEUTRAL: ["M63 52Q69 50 75 52", "M88 51Q94 49 100 51", 2.2],
  FOCUSED: ["M63 50L75 53", "M88 53L100 50", 2.6],
  SMUG: ["M63 49Q69 44 75 49", "M88 52L100 51", 2.6],
  LAUGH: ["M63 50Q69 45 75 50", "M88 49Q94 44 100 49", 2.4],
  EYES_CLOSED: ["M63 52Q69 50 75 52", "M88 51Q94 49 100 51", 2.2],
  CONFIDENT: ["M63 52L75 51", "M88 51L100 52", 2.6],
  SURPRISED: ["M63 47Q69 41 75 47", "M88 46Q94 40 100 46", 2.4],
  ANGRY: ["M62 48L76 55", "M87 55L101 48", 3.4],
  FRUSTRATED: ["M62 54L76 48", "M87 48L101 54", 3],
  RECOVERING: ["M63 52L75 52", "M88 52L100 52", 2.2],
  YAWN: ["M63 50Q69 47 75 50", "M88 49Q94 46 100 49", 2.2],
  WINK: ["M63 51Q69 48 75 51", "M88 49Q94 45 100 49", 2.4],
  NERVOUS: ["M63 48Q69 43 75 50", "M88 50Q94 43 100 48", 2.4],
};

/** One eye with its brow, for every face (each eye turns round the head on its own). */
function EyeArt({ face, side }: { face: Face; side: "l" | "r" }) {
  const left = side === "l";
  const cx = left ? 69 : 94;
  const cy = left ? 61 : 60;
  const [browL, browR, browW] = BROWS[face];
  const arc = (y: number, up: boolean) => (
    <Path d={up ? `M${cx - 5} ${y + 2}Q${cx} ${y - 5} ${cx + 5} ${y + 2}` : `M${cx - 5} ${y - 1}Q${cx} ${y + 4} ${cx + 5} ${y - 1}`} stroke={t.foreground} strokeWidth="2.6" strokeLinecap="round" fill="none" />
  );
  const eye = (y: number, ry: number, rx = 5, shine = true) => (
    <>
      <Ellipse cx={cx} cy={y} rx={rx} ry={ry} fill={t.foreground} />
      {shine ? <Circle cx={cx + 1.2} cy={y - Math.min(2, ry / 2)} r="1.5" fill={t.white} /> : null}
    </>
  );
  const shape = (() => {
    switch (face) {
      case "LAUGH":
        return arc(cy, true);
      case "EYES_CLOSED":
        return arc(cy - 1, false);
      case "WINK":
        return left ? arc(cy, true) : eye(cy, 6);
      case "SMUG":
      case "YAWN":
        return eye(cy + 1, 2.6, 5, false);
      case "FOCUSED":
      case "CONFIDENT":
        return eye(cy, 4.6);
      case "SURPRISED":
        return eye(cy - 1, 7.6, 6);
      case "NERVOUS":
        return <>{eye(cy, 5.8, 3.5)}<Path d={`M${cx + 7} 49Q${cx + 11} 55 ${cx + 7} 56Q${cx + 3} 55 ${cx + 7} 49`} fill="#8AD5E8" /></>;
      case "ANGRY":
        return (
          <>
            {eye(cy + 1, 4.2)}
            {/* A heavy lid pulled down toward the beak */}
            <Path d={left ? "M62 55L76 60L76 56L62 52Z" : "M87 60L101 55L101 52L87 56Z"} fill={t.white} />
          </>
        );
      case "FRUSTRATED":
        return eye(cy + 1, 3.6);
      default:
        return eye(cy, 6);
    }
  })();
  return (
    <>
      {shape}
      <Path d={left ? browL : browR} stroke={t.foreground} strokeWidth={browW} strokeLinecap="round" fill="none" />
    </>
  );
}

/** The beak as seen from the front, for every face. */
function BeakArt({ face }: { face: Face }) {
  switch (face) {
    case "LAUGH":
      return (
        <>
          <Path d="M72 76Q83 98 95 76Z" fill="#5A1E1A" />
          <Ellipse cx="83" cy="88" rx="5" ry="3" fill="#E0605A" />
          <Path d="M69 74L82 63L98 74Z" fill={t.yolk} />
          <Path d="M73 82L83 95L94 82Z" fill={t.yolk} opacity=".95" />
        </>
      );
    case "YAWN":
      return (
        <>
          <Ellipse cx="83" cy="81" rx="8" ry="8" fill="#5A1E1A" />
          <Path d="M70 73L82 61L97 73Z" fill={t.yolk} />
          <Path d="M73 82L83 95L94 82Z" fill={t.yolk} />
        </>
      );
    case "SURPRISED":
      return (
        <>
          <Path d="M71 74L82 65L96 74Z" fill={t.yolk} />
          <Ellipse cx="83" cy="80" rx="4.5" ry="5" fill="#5A1E1A" />
          <Path d="M75 83L83 90L91 83Z" fill={t.yolk} />
        </>
      );
    case "ANGRY":
    case "FRUSTRATED":
      return (
        <>
          <Path d="M70 75L82 67L97 75L83 84Z" fill={t.yolk} />
          <Path d="M72 78L77 76L81 79L85 76L89 79L94 77" stroke={t.foreground} strokeWidth="1.6" strokeLinejoin="round" fill="none" opacity=".7" />
        </>
      );
    case "SMUG":
    case "CONFIDENT":
    case "EYES_CLOSED":
    case "WINK":
      return (
        <>
          <Path d="M70 74L82 66L97 74L83 84Z" fill={t.yolk} />
          <Path d="M72 76Q84 85 96 75" stroke={t.foreground} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".6" />
        </>
      );
    default:
      return (
        <>
          <Path d="M70 74L82 66L97 74L83 86Z" fill={t.yolk} />
          <Path d="M71 74L95 74" stroke={t.foreground} strokeWidth="1.5" opacity=".45" />
        </>
      );
  }
}

/** The beak's side, pointing out of the head as it turns into profile (it grows with the turn). */
function SideBeak({ open }: { open: boolean }) {
  return open ? (
    <>
      <Path d="M77 63L100 69L83 73L77 73Z" fill={t.yolk} />
      <Path d="M77 73L97 73L83 82L77 82Z" fill="#5A1E1A" />
      <Path d="M77 80L95 84L83 87L77 86Z" fill="#E3A52A" />
    </>
  ) : (
    <>
      <Path d="M77 65L100 73L84 77L77 77Z" fill={t.yolk} />
      <Path d="M77 77L96 76L84 82L77 82Z" fill="#E3A52A" />
      <Circle cx="86" cy="70" r="1.1" fill={t.foreground} opacity=".45" />
    </>
  );
}

function UpperArm({ w, l }: { w: number; l: number }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${l + 8}`}>
      <Rect x={0.8} y={3} width={w - 1.6} height={l + 4} rx={w / 2 - 0.8} fill={t.primary} stroke={t.arena} strokeWidth={1.1} />
      <Path d={`M${w / 2 + 2} 6V${l + 2}`} stroke={t.white} strokeWidth={1.6} strokeLinecap="round" opacity={0.85} />
      {/* A white feather tuft at the shoulder keeps it a chicken */}
      <Circle cx={w / 2} cy={5.5} r={w / 2 + 0.4} fill={t.white} />
      <Path d={`M${w / 2 - 4} 7Q${w / 2} 11 ${w / 2 + 4} 7`} stroke={t.featherShade} strokeWidth={1.2} fill="none" />
    </Svg>
  );
}

function Forearm({ w, l }: { w: number; l: number }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${l + 6}`}>
      <Rect x={0.8} y={0.5} width={w - 1.6} height={l + 4} rx={w / 2 - 0.8} fill={t.primary} stroke={t.arena} strokeWidth={1.1} />
      <Rect x={0.8} y={l - 3} width={w - 1.6} height={4} fill={t.white} opacity={0.95} />
    </Svg>
  );
}

/** Fingers of the glove, each bending about its base (curl 0 open … 1 closed). */
const FINGERS = [
  { key: "idx", x: 5, w: 6.2, l: 16 },
  { key: "mid", x: 11.8, w: 6.4, l: 17.5 },
  { key: "rest", x: 18.8, w: 8.6, l: 14.5 },
] as const;

function GloveHand({
  id,
  color,
  holding,
  golden,
  s,
  back,
  idx,
  mid,
  rest,
  thumb,
}: {
  id: string;
  color: string;
  holding: boolean;
  golden: boolean;
  s: number;
  /** 1 while the glove shows its back (the keeper has turned away). */
  back: Animated.AnimatedInterpolation<number>;
  idx: Animated.Value;
  mid: Animated.Value;
  rest: Animated.Value;
  thumb: Animated.Value;
}) {
  const curls = { idx, mid, rest };
  const px = (x: number, y: number) => `${Math.round(x * s)}px ${Math.round(y * s)}px`;
  return (
    <>
      <Svg width="100%" height="100%" viewBox={`0 0 ${GLOVE.w} ${GLOVE.l}`} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}p`} x1="0" y1="0" x2="0" y2="1">
            <Stop stopColor={color} stopOpacity={0.72} />
            <Stop offset="1" stopColor={color} />
          </LinearGradient>
        </Defs>
        {/* Wrist strap */}
        <Rect x={5} y={0} width={22} height={10} rx={3} fill={t.arenaDeep} />
        <Rect x={5} y={3.5} width={22} height={3} fill={color} />
        {/* Palm: latex grip framed in white */}
        <Path d="M3.5 9Q16 6.5 28.5 9L29.5 25Q16 28.5 2.5 25Z" fill={t.white} stroke={t.arenaDeep} strokeWidth={1.3} />
        <Path d="M6.5 11.5Q16 9.5 25.5 11.5L26.3 23Q16 25.6 5.7 23Z" fill={`url(#${id}p)`} />
        <Path d="M8 17Q16 15 24 17" stroke={t.white} strokeWidth={1} opacity={0.6} fill="none" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: back }]}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${GLOVE.w} ${GLOVE.l}`}>
          {/* The back of the hand: dark backhand with the club stripe */}
          <Path d="M3.5 9Q16 6.5 28.5 9L29.5 25Q16 28.5 2.5 25Z" fill={t.arena} stroke={t.arenaDeep} strokeWidth={1.3} />
          <Path d="M7 15Q16 12 25 15" stroke={t.primary} strokeWidth={3} fill="none" />
          <Path d="M9 21Q16 19.5 23 21" stroke={t.white} strokeWidth={1.2} opacity={0.7} fill="none" />
        </Svg>
      </Animated.View>
      {holding ? (
        <Svg width="100%" height="100%" viewBox={`0 0 ${GLOVE.w} ${GLOVE.l}`} style={StyleSheet.absoluteFill}>
          <Path d="M16 13C21 13 24 19.5 24 24.5C24 29.5 20.5 32.5 16 32.5C11.5 32.5 8 29.5 8 24.5C8 19.5 11 13 16 13Z" fill={golden ? "#F8CD58" : "#FFFDF7"} stroke={golden ? "#B5861C" : "#D9CDB4"} strokeWidth={0.9} />
          <Ellipse cx="13" cy="18.5" rx="1.6" ry="2.6" fill="#FFFFFF" />
        </Svg>
      ) : null}
      {FINGERS.map((f) => (
        <Animated.View
          key={f.key}
          style={{
            position: "absolute",
            left: f.x * s,
            top: GLOVE.base * s,
            width: f.w * s,
            height: f.l * s,
            transformOrigin: px(f.w / 2, 1),
            transform: [
              { rotate: curls[f.key].interpolate({ inputRange: [0, 1], outputRange: ["0deg", "16deg"] }) },
              { scaleY: curls[f.key].interpolate({ inputRange: [0, 1], outputRange: [1, 0.42] }) },
            ],
          }}
        >
          <Svg width="100%" height="100%" viewBox={`0 0 ${f.w} ${f.l}`}>
            <Rect x={0.5} y={0} width={f.w - 1} height={f.l - 0.5} rx={(f.w - 1) / 2} fill={t.white} stroke={t.arenaDeep} strokeWidth={1.2} />
            <Rect x={f.w / 2 - 1.2} y={2} width={2.4} height={f.l - 6} rx={1.2} fill={color} />
            {f.key === "rest" ? <Path d={`M${f.w / 2} 3V${f.l - 2}`} stroke={t.arenaDeep} strokeWidth={0.9} /> : null}
          </Svg>
        </Animated.View>
      ))}
      <Animated.View
        style={{
          position: "absolute",
          left: 25 * s,
          top: 10 * s,
          width: 7.5 * s,
          height: 15 * s,
          transformOrigin: px(2, 2),
          transform: [{ rotate: thumb.interpolate({ inputRange: [0, 1], outputRange: ["-28deg", "34deg"] }) }],
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 7.5 15">
          <Rect x={0.5} y={0.5} width={6.5} height={14} rx={3.2} fill={t.white} stroke={t.arenaDeep} strokeWidth={1.2} />
          <Rect x={2.6} y={3} width={2.2} height={8} rx={1.1} fill={t.primary} />
        </Svg>
      </Animated.View>
    </>
  );
}
