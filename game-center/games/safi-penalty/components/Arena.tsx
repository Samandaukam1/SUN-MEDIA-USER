import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, View } from "react-native";
import type { GameSession } from "../../../engine/gameSession";
import { feedback, motion } from "../../../engine/animationUtils";
import type { GameFeedback, GameState } from "../../../engine/types";
import { safiTheme as t } from "../config";
import { arenaLayout, eggTrajectory, KEEPER_FEET, keeperBox, keeperDive, ZONES, zonePoint } from "../physics";
import { Chicken, Egg, EggSplat, Field } from "./Artwork";

const NATIVE = Platform.OS !== "web";

export function Arena({
  width,
  state,
  controller,
  reduced,
  audio,
}: {
  width: number;
  state: GameState;
  controller: GameSession;
  reduced: boolean;
  audio?: GameFeedback;
}) {
  const layout = useMemo(() => arenaLayout(width), [width]);
  const values = useRef({
    fly: new Animated.Value(0),
    impact: new Animated.Value(0),
    anticipation: new Animated.Value(0),
    // Keeper: breathing, crouch (anticipation / push-off), leap, landing, getting up, walking back.
    idle: new Animated.Value(0),
    crouch: new Animated.Value(0),
    dive: new Animated.Value(0),
    land: new Animated.Value(0),
    rise: new Animated.Value(0),
    home: new Animated.Value(0),
  }).current;
  const audioRef = useRef(audio);
  audioRef.current = audio;
  const [focusedZone, setFocusedZone] = useState<number | null>(null);
  useEffect(() => {
    if (state.phase !== "READY") setFocusedZone(null);
  }, [state.phase]);
  const shot = state.shot;
  const zone = shot?.selectedZone ?? state.pending?.selectedZone;
  const target = zone ? zonePoint(zone, layout.goal) : layout.shooter;
  const eggSize = width * 0.082;
  const keeperSize = width * 0.255;
  const home = layout.keeperHome;
  const box = keeperBox(home, keeperSize);
  const plan = useMemo(
    () =>
      shot
        ? keeperDive(layout, shot.goalkeeperZone, keeperSize, shot.result, shot.selectedZone)
        : { dir: 0 as const, reach: home, angle: 0, lift: 0, land: home, landAngle: 0 },
    [shot, layout, keeperSize, home],
  );
  const inputs = Array.from({ length: 17 }, (_, i) => i / 16);
  const path = inputs.map((p) =>
    eggTrajectory(layout.shooter, target, p, width * 0.085),
  );
  const direction = plan.dir || (target.x < home.x ? -1 : 1);

  // Idle: slow breathing about the feet — the soles never leave the ground.
  useEffect(() => {
    if (reduced || !["IDLE", "READY"].includes(state.phase)) return;
    const anim = Animated.loop(
      Animated.sequence([
        motion(values.idle, 1, 1100),
        motion(values.idle, 0, 1100),
      ]),
    );
    anim.start();
    return () => {
      anim.stop();
      values.idle.setValue(0);
    };
  }, [state.phase, reduced, values]);
  // While the server answers: the egg winds up, the keeper bounces on its knees, ready.
  useEffect(() => {
    if (state.phase !== "SHOOTING") return;
    feedback("shot", reduced, audioRef.current);
    if (reduced) return;
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          motion(values.anticipation, 1, 180),
          motion(values.anticipation, 0.35, 350),
        ]),
        Animated.sequence([
          motion(values.crouch, 0.45, 230),
          motion(values.crouch, 0.1, 300),
        ]),
      ]),
    );
    anim.start();
    return () => {
      anim.stop();
      values.anticipation.setValue(0);
    };
  }, [state.phase, reduced, values]);
  useEffect(() => {
    if (state.phase !== "RESOLVING" || !shot) return;
    const goal = shot.result === "GOAL";
    // Anticipation → push-off from the ground → dive; the egg flies at the same time.
    const flight = Animated.parallel([
      motion(values.fly, 1, reduced ? 120 : 500),
      Animated.sequence([
        motion(values.crouch, 1, reduced ? 0 : 90),
        Animated.parallel([
          motion(values.crouch, 0, reduced ? 0 : 150),
          Animated.timing(values.dive, {
            toValue: 1,
            duration: reduced ? 120 : 380,
            easing: Easing.out(Easing.quad),
            useNativeDriver: NATIVE,
            isInteraction: false,
          }),
        ]),
      ]),
    ]);
    // Landing: on its feet with the egg, or on its side and sliding after a goal.
    const impact = Animated.sequence([
      Animated.parallel([
        motion(values.impact, 1, reduced ? 0 : 170),
        Animated.timing(values.land, {
          toValue: 1,
          duration: reduced ? 0 : goal ? 360 : 260,
          easing: goal ? Easing.in(Easing.quad) : Easing.out(Easing.quad),
          useNativeDriver: NATIVE,
          isInteraction: false,
        }),
      ]),
      Animated.delay(reduced ? 480 : 560),
    ]);
    let active = true;
    flight.start(({ finished }) => {
      if (!finished || !active) return;
      feedback(goal ? "goal" : "catch", reduced, audioRef.current);
      if (goal) feedback("eggBreak", reduced, audioRef.current);
      impact.start(({ finished: done }) => {
        if (done && active) controller.beginReset();
      });
    });
    return () => {
      active = false;
      flight.stop();
      impact.stop();
    };
  }, [controller, reduced, shot, state.phase, values]);
  // Recovery: get up, walk back to the centre, then the next shot.
  useEffect(() => {
    if (state.phase !== "RESETTING" || state.error) return;
    const anim = Animated.sequence([
      Animated.parallel([
        motion(values.rise, 1, reduced ? 0 : 260),
        motion(values.impact, 0, 180),
      ]),
      motion(values.home, 1, reduced ? 0 : 380),
    ]);
    anim.start(({ finished }) => {
      if (finished) {
        [values.fly, values.dive, values.land, values.rise, values.home, values.crouch].forEach((v) => v.setValue(0));
        void controller.completeReset();
      }
    });
    return () => anim.stop();
  }, [controller, reduced, state.phase, state.error, values]);
  useEffect(() => {
    if (["READY", "IDLE", "STARTING"].includes(state.phase))
      Object.values(values).forEach((v) => v.setValue(0));
  }, [state.phase, values]);

  // Feet offset from home = leap + landing + walk back (each one a 0 → 1 phase).
  const feetX = Animated.add(
    Animated.add(
      values.dive.interpolate({ inputRange: [0, 1], outputRange: [0, plan.reach.x - home.x] }),
      values.land.interpolate({ inputRange: [0, 1], outputRange: [0, plan.land.x - plan.reach.x] }),
    ),
    values.home.interpolate({ inputRange: [0, 1], outputRange: [0, home.x - plan.land.x] }),
  );
  const rise = plan.reach.y - home.y;
  const feetY = Animated.add(
    Animated.add(
      values.dive.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, Math.min(rise * 0.75, 0) - plan.lift, rise] }),
      values.land.interpolate({ inputRange: [0, 1], outputRange: [0, plan.land.y - plan.reach.y] }),
    ),
    values.home.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -width * 0.012, 0, -width * 0.012, 0] }),
  );
  const angle = Animated.add(
    Animated.add(
      values.dive.interpolate({ inputRange: [0, 1], outputRange: [0, plan.angle] }),
      values.land.interpolate({ inputRange: [0, 1], outputRange: [0, plan.landAngle - plan.angle] }),
    ),
    values.rise.interpolate({ inputRange: [0, 1], outputRange: [0, -plan.landAngle] }),
  );
  const airborne = Math.min(0.6, Math.max(0, -rise / (keeperSize * 1.2)) + 0.25);
  const shadowScale = Animated.add(
    values.dive.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 0.55, 1 - airborne] }),
    values.land.interpolate({ inputRange: [0, 1], outputRange: [0, airborne] }),
  );
  const showEgg = state.phase !== "RESETTING" && state.phase !== "FINISHED";
  return (
    <View
      style={{
        width,
        height: layout.height,
        borderRadius: 28,
        overflow: "hidden",
      }}
    >
      <Field width={width} />
      <Image
        source={t.logoDark}
        accessibilityLabel="SAFI"
        resizeMode="contain"
        style={{
          position: "absolute",
          width: width * 0.115,
          height: width * 0.115,
          top: width * 0.026,
          left: width * 0.4425,
        }}
      />
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "box-none" }]}>
        {ZONES.map((z) => (
          <Pressable
            key={z.id}
            accessibilityRole="button"
            accessibilityLabel={`${z.label}, ${z.id}`}
            testID={`safi-zone-${z.id}`}
            accessibilityState={{ disabled: state.phase !== "READY" }}
            disabled={state.phase !== "READY"}
            onPress={() => void controller.submitShot(z.id)}
            onFocus={() => setFocusedZone(z.id)}
            onBlur={() => setFocusedZone(null)}
            style={{
              position: "absolute",
              left: layout.goal.x + (z.column * layout.goal.width) / 5,
              top: layout.goal.y + (z.row * layout.goal.height) / 3,
              width: layout.goal.width / 5,
              height: layout.goal.height / 3,
              borderRadius: 10,
              backgroundColor:
                zone === z.id && ["SHOOTING", "RESOLVING"].includes(state.phase)
                  ? "rgba(112,188,34,0.22)"
                  : "transparent",
              borderColor: t.primary,
              borderWidth:
                focusedZone === z.id && state.phase === "READY" ? 2 : 0,
            }}
          />
        ))}
      </View>
      {/* Ground shadow: stays on the grass, shrinks while the keeper is in the air */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: home.x - keeperSize * 0.3,
          top: home.y - keeperSize * 0.045,
          width: keeperSize * 0.6,
          height: keeperSize * 0.09,
          borderRadius: keeperSize,
          backgroundColor: "rgba(0,0,0,0.3)",
          opacity: shadowScale,
          transform: [{ translateX: feetX }, { scaleX: shadowScale }, { scaleY: shadowScale }],
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          ...box,
          // Every turn and squash happens about the feet, so standing, crouching and breathing stay grounded.
          // Whole pixels: React Native's origin parser reads "92.7%" as "7%" (no decimals), web reads both.
          transformOrigin: `${Math.round(box.width / 2)}px ${Math.round(KEEPER_FEET * box.height)}px`,
          transform: [
            { translateX: feetX },
            { translateY: feetY },
            {
              rotate: angle.interpolate({
                inputRange: [-180, 180],
                outputRange: ["-180deg", "180deg"],
              }),
            },
            {
              scaleX: Animated.add(
                1,
                Animated.add(
                  Animated.multiply(values.crouch, 0.08),
                  Animated.multiply(values.idle, -0.012),
                ),
              ),
            },
            {
              scaleY: Animated.add(
                1,
                Animated.add(
                  Animated.multiply(values.crouch, -0.15),
                  Animated.multiply(values.idle, 0.022),
                ),
              ),
            },
          ],
        }}
      >
        <Chicken caught={shot?.result === "CATCH"} shadow={false} />
      </Animated.View>
      {showEgg ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: layout.shooter.x - eggSize / 2,
            top: layout.shooter.y - eggSize * 0.625,
            width: eggSize,
            height: eggSize * 1.25,
            opacity:
              shot?.result === "GOAL"
                ? values.fly.interpolate({
                    inputRange: [0, 0.94, 1],
                    outputRange: [1, 1, 0],
                  })
                : 1,
            transform: [
              {
                translateX: values.fly.interpolate({
                  inputRange: inputs,
                  outputRange: path.map((p) => p.x - layout.shooter.x),
                }),
              },
              {
                translateY: values.fly.interpolate({
                  inputRange: inputs,
                  outputRange: path.map((p) => p.y - layout.shooter.y),
                }),
              },
              {
                scale: Animated.multiply(
                  values.fly.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.65],
                  }),
                  values.anticipation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.9],
                  }),
                ),
              },
              {
                rotate: values.fly.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["-12deg", `${direction * 28}deg`],
                }),
              },
            ],
          }}
        >
          <Egg />
        </Animated.View>
      ) : null}
      {shot?.result === "GOAL" ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: target.x - width * 0.115,
            top: target.y - width * 0.1,
            width: width * 0.23,
            height: width * 0.2,
            opacity: values.impact,
            transform: [
              {
                scale: values.impact.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
              },
            ],
          }}
        >
          <EggSplat />
        </Animated.View>
      ) : null}
    </View>
  );
}
