import { forwardRef, useCallback, useId, useImperativeHandle, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import { safiTheme as t } from "../config";
import { REACTIONS } from "../reactions";

const NATIVE = Platform.OS !== "web";

type Eyes = "open" | "closed" | "squint" | "side";
type Beak = "closed" | "open" | "grin";
type Face = { eyes: Eyes; beak: Beak };
const REST: Face = { eyes: "open", beak: "closed" };

export type KeeperRigHandle = {
  /** Plays reaction `index`; `onDone` fires once when it ends (not when stopped). */
  play: (index: number, onDone: () => void) => void;
  /** Cuts a running reaction short and settles back to the ready pose. */
  stop: () => void;
  /** Back to the neutral pose (between shots). */
  reset: () => void;
};

/**
 * The SAFI goalkeeper as a rig of separately moving parts — body, head (face variants and a back view), two
 * goalkeeper gloves and the caught egg — all in the chicken's own 160 × 180 artwork space. Gloves are always
 * drawn; the egg stays in them while `holding`. Every motion is a native-driver transform.
 */
export const KeeperRig = forwardRef<KeeperRigHandle, { size: number; holding: boolean; reduced: boolean }>(function KeeperRig(
  { size, holding, reduced },
  ref,
) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const s = size / 160;
  const [face, setFace] = useState<Face>(REST);
  const [back, setBack] = useState(false);
  const v = useRef({
    turn: new Animated.Value(1),
    puff: new Animated.Value(0),
    bodyX: new Animated.Value(0),
    headRot: new Animated.Value(0),
    headX: new Animated.Value(0),
    headY: new Animated.Value(0),
    lX: new Animated.Value(0),
    lY: new Animated.Value(0),
    lR: new Animated.Value(0),
    rX: new Animated.Value(0),
    rY: new Animated.Value(0),
    rR: new Animated.Value(0),
    eggX: new Animated.Value(0),
    eggY: new Animated.Value(0),
  }).current;
  const running = useRef<Animated.CompositeAnimation | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  const settle = useCallback(
    (ms: number) =>
      Animated.parallel(
        Object.entries(v).map(([k, val]) =>
          Animated.timing(val, { toValue: k === "turn" ? 1 : 0, duration: ms, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE, isInteraction: false }),
        ),
      ),
    [v],
  );

  useImperativeHandle(ref, () => {
    const to = (val: Animated.Value, toValue: number, duration: number, easing = Easing.inOut(Easing.quad)) =>
      Animated.timing(val, { toValue, duration, easing, useNativeDriver: NATIVE, isInteraction: false });
    const seq = Animated.sequence;
    const par = Animated.parallel;
    const wait = Animated.delay;
    const toOne = (ms: number) => par([to(v.eggX, -25, ms), to(v.eggY, -19, ms)]);
    const toTwo = (ms: number) => par([to(v.eggX, 0, ms), to(v.eggY, 0, ms)]);
    const rightHome = (ms: number) => par([to(v.rX, 0, ms), to(v.rY, 0, ms), to(v.rR, 0, ms)]);

    const timelines: (() => Animated.CompositeAnimation)[] = [
      // 1 · Eyes closed: "too easy", head tipped back, a quiet grin.
      () => {
        setFace({ eyes: "closed", beak: "grin" });
        return seq([to(v.headRot, -8, 250), wait(350), to(v.headRot, 0, 300)]);
      },
      // 2 · One hand: the egg in the left glove, the right one raised and waved.
      () => {
        setFace({ eyes: "squint", beak: "grin" });
        return seq([
          par([toOne(220), to(v.rX, 8, 250), to(v.rY, -42, 250), to(v.rR, -20, 250)]),
          to(v.rR, -4, 120), to(v.rR, -20, 120), to(v.rR, -4, 120),
          wait(150),
          par([toTwo(250), rightHome(250)]),
        ]);
      },
      // 3 · Head shake: "no, no" — then a grin at the player.
      () => {
        at(640, () => setFace({ eyes: "squint", beak: "grin" }));
        return seq([to(v.headRot, -12, 110), to(v.headRot, 12, 160), to(v.headRot, -10, 150), to(v.headRot, 8, 140), to(v.headRot, 0, 120), wait(270)]);
      },
      // 4 · Fake yawn: glove to the beak, eyes heavy, then back to ready.
      () => {
        setFace({ eyes: "squint", beak: "open" });
        at(820, () => setFace(REST));
        return seq([
          par([to(v.rX, -18, 250), to(v.rY, -24, 250), to(v.headRot, -6, 250), to(v.headY, -2, 250)]),
          wait(450),
          par([rightHome(300), to(v.headRot, 0, 300), to(v.headY, 0, 300)]),
        ]);
      },
      // 5 · Look away: "didn't even watch", then a glance back.
      () => {
        setFace({ eyes: "side", beak: "closed" });
        at(780, () => setFace(REST));
        return seq([par([to(v.headRot, 14, 220), to(v.headX, 5, 220)]), wait(550), par([to(v.headRot, 0, 230), to(v.headX, 0, 230)])]);
      },
      // 6 · Chest puff: proud keeper pose with a small grin.
      () => {
        setFace({ eyes: "squint", beak: "grin" });
        return seq([par([to(v.puff, 1, 280, Easing.out(Easing.back(1.6))), to(v.headY, -4, 280)]), wait(400), par([to(v.puff, 0, 270), to(v.headY, 0, 270)])]);
      },
      // 7 · Come again: egg in one glove, the other beckons.
      () => {
        setFace({ eyes: "open", beak: "grin" });
        return seq([
          par([toOne(220), to(v.rX, 10, 220), to(v.rY, -22, 220)]),
          to(v.rR, -35, 130), to(v.rR, 0, 130), to(v.rR, -35, 130), to(v.rR, 0, 130), to(v.rR, -35, 130), to(v.rR, 0, 130),
          par([toTwo(250), rightHome(250)]),
        ]);
      },
      // 8 · Egg show-off: lifted overhead in both gloves, a smug look, back down.
      () => {
        setFace({ eyes: "squint", beak: "grin" });
        return seq([
          par([to(v.eggY, -86, 320, Easing.out(Easing.cubic)), to(v.lX, 17, 320), to(v.lY, -66, 320), to(v.rX, -17, 320), to(v.rY, -66, 320)]),
          par([to(v.eggX, 3, 120), to(v.lX, 20, 120), to(v.rX, -14, 120)]),
          par([to(v.eggX, -3, 120), to(v.lX, 14, 120), to(v.rX, -20, 120)]),
          par([to(v.eggX, 0, 100), to(v.lX, 17, 100), to(v.rX, -17, 100)]),
          wait(150),
          par([toTwo(300), to(v.lX, 0, 300), to(v.lY, 0, 300), rightHome(300)]),
        ]);
      },
      // 9 · Mini laugh: squinting, a small body shake — not a cartoon guffaw.
      () => {
        setFace({ eyes: "squint", beak: "grin" });
        const shake = [2, -2, 2, -2, 1.5, 0].map((x) => to(v.bodyX, x, 70));
        return seq([par([seq(shake), seq([to(v.headY, -1.5, 210), to(v.headY, 0, 210)])]), wait(200)]);
      },
      // 10 · Back turn: turns away for half a second — "that was nothing" — egg still in view at the side.
      () => {
        at(150, () => setBack(true));
        at(920, () => setBack(false));
        return seq([
          par([to(v.eggX, -47, 150), to(v.eggY, 3, 150)]),
          to(v.turn, 0.04, 120, Easing.in(Easing.quad)), to(v.turn, 1, 120, Easing.out(Easing.quad)),
          wait(500),
          to(v.turn, 0.04, 120, Easing.in(Easing.quad)), to(v.turn, 1, 120, Easing.out(Easing.quad)),
          toTwo(150),
        ]);
      },
    ];

    return {
      play(index, onDone) {
        running.current?.stop();
        clearTimers();
        const make = timelines[index] ?? timelines[0];
        // Reduce Motion: the face tells the story, no movement.
        const anim = reduced ? (make(), Animated.delay(500)) : make();
        if (reduced) settle(0).start();
        running.current = anim;
        anim.start(({ finished }) => {
          if (running.current !== anim) return;
          running.current = null;
          clearTimers();
          setFace(REST);
          setBack(false);
          if (finished) onDone();
        });
      },
      stop() {
        const anim = running.current;
        running.current = null;
        anim?.stop();
        clearTimers();
        setFace(REST);
        setBack(false);
        settle(reduced ? 0 : 140).start();
      },
      reset() {
        running.current?.stop();
        running.current = null;
        clearTimers();
        setFace(REST);
        setBack(false);
        Object.entries(v).forEach(([k, val]) => val.setValue(k === "turn" ? 1 : 0));
      },
    };
  }, [v, reduced, settle]);

  const h = size * (180 / 160);
  const px = (x: number, y: number) => `${Math.round(x * s)}px ${Math.round(y * s)}px`;
  const u = (val: Animated.Value) => Animated.multiply(val, s);
  const layer = StyleSheet.absoluteFill;

  return (
    <Animated.View style={{ width: size, height: h, transformOrigin: px(80, 120), transform: [{ scaleX: v.turn }] }}>
      {/* Body: legs, tail, wings, jersey — puffs up about the feet */}
      <Animated.View style={[layer, { transformOrigin: px(81, 167), transform: [{ translateX: u(v.bodyX) }, { scaleX: Animated.add(1, Animated.multiply(v.puff, 0.1)) }, { scaleY: Animated.add(1, Animated.multiply(v.puff, 0.04)) }] }]}>
        <Body id={id} back={back} />
      </Animated.View>
      {/* Head: turns about the neck */}
      <Animated.View
        style={[layer, { transformOrigin: px(80, 98), transform: [{ translateX: Animated.add(u(v.bodyX), u(v.headX)) }, { translateY: u(v.headY) }, { rotate: v.headRot.interpolate({ inputRange: [-90, 90], outputRange: ["-90deg", "90deg"] }) }] }]}
      >
        <Head id={id} back={back} face={face} />
      </Animated.View>
      {/* The caught egg, held by the gloves */}
      {holding ? (
        <Animated.View style={[layer, { transform: [{ translateX: Animated.add(u(v.bodyX), u(v.eggX)) }, { translateY: u(v.eggY) }] }]}>
          <HeldEgg id={id} />
        </Animated.View>
      ) : null}
      {/* Goalkeeper gloves: always on, hidden only while the keeper shows its back */}
      {back ? null : (
        <>
          <Animated.View style={[layer, { transformOrigin: px(57, 95), transform: [{ translateX: Animated.add(u(v.bodyX), u(v.lX)) }, { translateY: u(v.lY) }, { rotate: v.lR.interpolate({ inputRange: [-90, 90], outputRange: ["-90deg", "90deg"] }) }] }]}>
            <Glove side="left" />
          </Animated.View>
          <Animated.View style={[layer, { transformOrigin: px(109, 95), transform: [{ translateX: Animated.add(u(v.bodyX), u(v.rX)) }, { translateY: u(v.rY) }, { rotate: v.rR.interpolate({ inputRange: [-90, 90], outputRange: ["-90deg", "90deg"] }) }] }]}>
            <Glove side="right" />
          </Animated.View>
        </>
      )}
    </Animated.View>
  );
});

function Body({ id, back }: { id: string; back: boolean }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 180">
      <Defs>
        <LinearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor={t.white} />
          <Stop offset="1" stopColor={t.featherShade} />
        </LinearGradient>
        <LinearGradient id={`${id}j`} x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor={t.primary} />
          <Stop offset="1" stopColor={t.arena} />
        </LinearGradient>
      </Defs>
      <Path d="M62 140L58 160M99 139L104 160" stroke={t.yolk} strokeWidth="9" strokeLinecap="round" />
      <Path d="M58 160L40 165M58 160L67 167M104 160L122 164M104 160L96 168" stroke={t.yolk} strokeWidth="7" strokeLinecap="round" />
      <Path d={back ? "M51 96Q14 65 21 104Q11 108 38 129Z" : "M109 96Q146 65 139 104Q149 108 122 129Z"} fill={t.featherShade} />
      <Path d="M48 70Q25 98 43 134Q56 153 85 149Q120 148 126 122Q134 87 104 65Z" fill={`url(#${id}b)`} />
      <Path d="M43 103Q80 118 123 101L122 130Q111 151 82 149Q54 149 42 131Z" fill={`url(#${id}j)`} />
      {back ? (
        <SvgText x="82" y="140" fill={t.white} fontSize="22" fontWeight="700" textAnchor="middle">1</SvgText>
      ) : (
        <>
          <Path d="M70 112L82 124L96 112" fill="none" stroke={t.white} strokeWidth="3" opacity=".9" />
          <Path d="M78 128V140M88 128V140" stroke={t.white} strokeWidth="3" strokeLinecap="round" opacity=".7" />
        </>
      )}
      <Path d="M45 83Q24 81 19 99Q22 117 48 105L61 96" fill={`url(#${id}b)`} />
      <Path d="M115 84Q137 79 142 96Q141 113 113 105L98 96" fill={`url(#${id}b)`} />
    </Svg>
  );
}

function Head({ id, back, face }: { id: string; back: boolean; face: Face }) {
  const eyeRy = face.eyes === "squint" ? 2.4 : 6;
  const shift = face.eyes === "side" ? 4 : 0;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 180">
      <Defs>
        <LinearGradient id={`${id}h`} x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor={t.white} />
          <Stop offset="1" stopColor={t.featherShade} />
        </LinearGradient>
      </Defs>
      <Path d="M59 40Q48 22 62 20Q62 5 74 13Q83 -1 92 13Q112 11 103 36" fill={t.comb} />
      <Path d="M56 42Q77 23 99 40Q114 53 109 77Q109 95 88 102Q58 99 52 78Q46 59 56 42Z" fill={`url(#${id}h)`} />
      {back ? (
        <>
          <Path d="M54 46Q80 38 106 46" stroke={t.primary} strokeWidth="7" strokeLinecap="round" fill="none" />
          <Path d="M72 86Q80 92 88 86" stroke={t.featherShade} strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <Path d="M65 44L100 45" stroke={t.primary} strokeWidth="7" strokeLinecap="round" />
          {face.eyes === "closed" ? (
            <>
              <Path d="M64 63Q69 57 74 63" stroke={t.foreground} strokeWidth="2.6" strokeLinecap="round" fill="none" />
              <Path d="M89 62Q94 56 99 62" stroke={t.foreground} strokeWidth="2.6" strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              <Ellipse cx={69 + shift} cy="61" rx="5" ry={eyeRy} fill={t.foreground} />
              <Ellipse cx={94 + shift} cy="60" rx="5" ry={eyeRy} fill={t.foreground} />
              {face.eyes === "squint" ? null : (
                <>
                  <Circle cx={70 + shift} cy="59" r="1.5" fill={t.white} />
                  <Circle cx={95 + shift} cy="58" r="1.5" fill={t.white} />
                </>
              )}
            </>
          )}
          <Path d="M75 84Q80 101 88 84" fill={t.comb} />
          {face.beak === "open" ? (
            <>
              <Ellipse cx="83" cy="80" rx="8" ry="7" fill="#5A1E1A" />
              <Path d="M70 73L82 62L97 73Z" fill={t.yolk} />
              <Path d="M73 80L83 92L94 80Z" fill={t.yolk} />
            </>
          ) : face.beak === "grin" ? (
            <>
              <Path d="M70 74L82 66L97 74L83 84Z" fill={t.yolk} />
              <Path d="M72 76Q83 84 95 76" stroke={t.foreground} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".6" />
            </>
          ) : (
            <>
              <Path d="M70 74L82 66L97 74L83 86Z" fill={t.yolk} />
              <Path d="M71 74L95 74" stroke={t.foreground} strokeWidth="1.5" opacity=".45" />
            </>
          )}
        </>
      )}
    </Svg>
  );
}

function Glove({ side }: { side: "left" | "right" }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 180">
      {side === "left" ? (
        <>
          <Path d="M49 88Q56 79 64 86L70 99Q65 111 54 105L45 100Z" fill={t.primary} stroke={t.arena} strokeWidth="2" />
          <Path d="M54 88L60 100" stroke={t.white} strokeWidth="2" opacity=".8" />
        </>
      ) : (
        <>
          <Path d="M103 85Q112 80 119 89L122 100L109 107Q100 108 96 99Z" fill={t.primary} stroke={t.arena} strokeWidth="2" />
          <Path d="M111 88L107 100" stroke={t.white} strokeWidth="2" opacity=".8" />
        </>
      )}
    </Svg>
  );
}

function HeldEgg({ id }: { id: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 180">
      <Defs>
        <LinearGradient id={`${id}e`} x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#EDE3CF" />
        </LinearGradient>
      </Defs>
      <Path d="M83 85C89 85 93 93 93 99C93 105 89 109 83 109C77 109 73 105 73 99C73 93 77 85 83 85Z" fill={`url(#${id}e)`} stroke="#D9CDB4" strokeWidth="1" />
      <Ellipse cx="79.5" cy="92" rx="2" ry="3.2" fill="#FFFFFF" opacity=".9" />
    </Svg>
  );
}

/** Number of reactions the rig can play (kept in step with the catalogue). */
export const RIG_REACTIONS = REACTIONS.length;
