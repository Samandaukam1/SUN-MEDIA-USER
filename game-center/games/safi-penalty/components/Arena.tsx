import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, View } from "react-native";
import type { GameSession } from "../../../engine/gameSession";
import { feedback, motion } from "../../../engine/animationUtils";
import type { GameFeedback, GameState } from "../../../engine/types";
import { safiTheme as t } from "../config";
import { arenaLayout, eggTrajectory, ZONES, zonePoint } from "../physics";
import { Chicken, Egg, EggSplat, Field } from "./Artwork";

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
    dive: new Animated.Value(0),
    impact: new Animated.Value(0),
    fall: new Animated.Value(0),
    idle: new Animated.Value(0),
    anticipation: new Animated.Value(0),
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
  const keeperTarget = shot
    ? zonePoint(shot.goalkeeperZone, layout.goal)
    : layout.keeper;
  const eggSize = width * 0.082;
  const keeperSize = width * 0.255;
  const inputs = Array.from({ length: 17 }, (_, i) => i / 16);
  const path = inputs.map((p) =>
    eggTrajectory(layout.shooter, target, p, width * 0.085),
  );
  const direction = keeperTarget.x < layout.keeper.x ? -1 : 1;

  useEffect(() => {
    if (reduced || !["IDLE", "READY"].includes(state.phase)) return;
    const anim = Animated.loop(
      Animated.sequence([
        motion(values.idle, 1, 1050),
        motion(values.idle, 0, 1050),
      ]),
    );
    anim.start();
    return () => {
      anim.stop();
      values.idle.setValue(0);
    };
  }, [state.phase, reduced, values]);
  useEffect(() => {
    if (state.phase !== "SHOOTING") return;
    feedback("shot", reduced, audioRef.current);
    if (reduced) return;
    const anim = Animated.loop(
      Animated.sequence([
        motion(values.anticipation, 1, 180),
        motion(values.anticipation, 0.35, 350),
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
    const flight = Animated.parallel([
      motion(values.fly, 1, reduced ? 120 : 480),
      motion(values.dive, 1, reduced ? 120 : 430),
    ]);
    const impact = Animated.sequence([
      Animated.parallel([
        motion(values.impact, 1, reduced ? 0 : 170),
        motion(
          values.fall,
          shot.result === "GOAL" ? 1 : 0.12,
          reduced ? 0 : 320,
        ),
      ]),
      Animated.delay(reduced ? 550 : 620),
    ]);
    let active = true;
    flight.start(({ finished }) => {
      if (!finished || !active) return;
      feedback(
        shot.result === "GOAL" ? "goal" : "catch",
        reduced,
        audioRef.current,
      );
      if (shot.result === "GOAL")
        feedback("eggBreak", reduced, audioRef.current);
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
  useEffect(() => {
    if (state.phase !== "RESETTING" || state.error) return;
    const anim = Animated.parallel([
      motion(values.dive, 0, reduced ? 0 : 320),
      motion(values.fall, 0, reduced ? 0 : 300),
      motion(values.impact, 0, 180),
    ]);
    anim.start(({ finished }) => {
      if (finished) {
        values.fly.setValue(0);
        void controller.completeReset();
      }
    });
    return () => anim.stop();
  }, [controller, reduced, state.phase, state.error, values]);
  useEffect(() => {
    if (["READY", "IDLE", "STARTING"].includes(state.phase))
      Object.values(values).forEach((v) => v.setValue(0));
  }, [state.phase, values]);
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
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: layout.keeper.x - keeperSize / 2,
          top: layout.keeper.y - keeperSize * 0.57,
          width: keeperSize,
          height: keeperSize * 1.125,
          transform: [
            {
              translateX: values.dive.interpolate({
                inputRange: [0, 1],
                outputRange: [0, keeperTarget.x - layout.keeper.x],
              }),
            },
            {
              translateY: Animated.add(
                values.dive.interpolate({
                  inputRange: [0, 0.6, 1],
                  outputRange: [
                    0,
                    (keeperTarget.y - layout.keeper.y) * 0.7 - width * 0.03,
                    keeperTarget.y - layout.keeper.y,
                  ],
                }),
                Animated.add(
                  values.fall.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      0,
                      Math.max(
                        0,
                        layout.goal.y +
                          layout.goal.height -
                          keeperTarget.y -
                          keeperSize * 0.28,
                      ),
                    ],
                  }),
                  values.idle.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -2],
                  }),
                ),
              ),
            },
            {
              rotate: Animated.add(
                values.dive.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    0,
                    keeperTarget.x === layout.keeper.x ? 0 : direction * 32,
                  ],
                }),
                values.fall.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, direction * 48],
                }),
              ).interpolate({
                inputRange: [-180, 180],
                outputRange: ["-180deg", "180deg"],
              }),
            },
          ],
        }}
      >
        <Chicken caught={shot?.result === "CATCH"} />
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
