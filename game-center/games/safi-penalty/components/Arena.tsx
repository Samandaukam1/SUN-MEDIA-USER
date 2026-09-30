import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { GameSession } from "../../../engine/gameSession";
import { feedback, motion } from "../../../engine/animationUtils";
import type { GameFeedback, GameState } from "../../../engine/types";
import { safiTheme as t } from "../config";
import { arenaLayout, eggTrajectory, KEEPER_FEET, keeperBox, keeperDive, ZONES, zonePoint } from "../physics";
import { ANGRY_REACTIONS, canShoot, canSkip, HAPPY_REACTIONS, nextStage, pickFrom, REACTION_TIMING, type KeeperEvent, type KeeperStage } from "../reactions";
import { Egg, EggSplat, Field } from "./Artwork";
import { KeeperRig, type KeeperRigHandle } from "./KeeperRig";

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
    // Keeper travel: crouch / push-off, leap, ground contact, slide, getting up, walking back.
    crouch: new Animated.Value(0),
    dive: new Animated.Value(0),
    land: new Animated.Value(0),
    slide: new Animated.Value(0),
    rise: new Animated.Value(0),
    home: new Animated.Value(0),
  }).current;
  const audioRef = useRef(audio);
  audioRef.current = audio;
  const [focusedZone, setFocusedZone] = useState<number | null>(null);
  // Keeper animation state (visual); the engine phase still decides when a shot is accepted.
  const [stage, setStage] = useState<KeeperStage>("IDLE");
  const go = (event: KeeperEvent) => setStage((s) => nextStage(s, event));
  const [held, setHeld] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const bubbleOpacity = useRef(new Animated.Value(0)).current;
  const rig = useRef<KeeperRigHandle>(null);
  const recent = useRef({ happy: [] as number[], angry: [] as number[] });
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
        ? // A save ends on the ball; a goal dives where the server sent the keeper.
          keeperDive(layout, shot.result === "CATCH" ? shot.selectedZone : shot.goalkeeperZone, keeperSize, shot.result, shot.selectedZone)
        : { dir: 0 as const, reach: home, angle: 0, lift: 0, land: home, landAngle: 0, slide: 0 },
    [shot, layout, keeperSize, home],
  );
  const inputs = Array.from({ length: 17 }, (_, i) => i / 16);
  const path = inputs.map((p) =>
    eggTrajectory(layout.shooter, target, p, width * 0.085),
  );
  const direction = plan.dir || (target.x < home.x ? -1 : 1);
  const fallDir = Math.sign(plan.landAngle) || 1;
  const slideAngle = shot?.result === "GOAL" ? -fallDir * 5 : 0;

  const showBubble = (line: string | null, ms: number = REACTION_TIMING.bubbleMs) => {
    setBubble(line);
    if (!line) return;
    bubbleOpacity.setValue(0);
    Animated.sequence([motion(bubbleOpacity, 1, 140), Animated.delay(Math.max(0, ms - 280)), motion(bubbleOpacity, 0, 140)]).start();
  };
  // Values the running shot needs without restarting its effect on every render.
  const live = useRef({ showBubble, goalSide: 1 as -1 | 1 });
  live.current = { showBubble, goalSide: (Math.sign(target.x - (plan.land.x + plan.slide)) || 1) as -1 | 1 };
  // Idle taunts come from the rig; the keeper stays ready for a shot during them.
  const onTaunt = (on: boolean, line: string | null) => {
    go(on ? "taunt" : "taunt-done");
    if (on) showBubble(line, 1200);
  };

  // A shot: whatever the keeper was doing stops; it faces the ball and bounces on its knees while the server answers.
  useEffect(() => {
    if (state.phase !== "SHOOTING") return;
    go("shot");
    setBubble(null);
    rig.current?.focus();
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
    go("focused");
    rig.current?.dive();
    const timed = (v: Animated.Value, ms: number, easing: (x: number) => number) =>
      Animated.timing(v, { toValue: 1, duration: reduced ? Math.min(ms, 120) : ms, easing, useNativeDriver: NATIVE, isInteraction: false });
    // Anticipation → push-off from the ground → dive; the egg flies at the same time.
    const flight = Animated.parallel([
      motion(values.fly, 1, reduced ? 120 : 500),
      Animated.sequence([
        motion(values.crouch, 1, reduced ? 0 : 90),
        Animated.parallel([motion(values.crouch, 0, reduced ? 0 : 150), timed(values.dive, 380, Easing.out(Easing.quad))]),
      ]),
    ]);
    let active = true;
    const running: Animated.CompositeAnimation[] = [flight];
    const run = (anim: Animated.CompositeAnimation, next: () => void) => {
      running.push(anim);
      anim.start(({ finished }) => finished && active && next());
    };
    flight.start(({ finished }) => {
      if (!finished || !active) return;
      feedback(goal ? "goal" : "catch", reduced, audioRef.current);
      if (!goal) {
        // CATCH → the egg is in the glove, fingers close → a short hold → a happy reaction.
        setHeld(true);
        rig.current?.caught();
        go("caught");
        run(Animated.parallel([motion(values.impact, 1, reduced ? 0 : 170), timed(values.land, 260, Easing.out(Easing.quad))]), () => {
          go("secured");
          run(Animated.delay(REACTION_TIMING.holdMs), () => {
            go("hold-done");
            const i = pickFrom(HAPPY_REACTIONS.length, recent.current.happy);
            recent.current.happy = [...recent.current.happy, i].slice(-4);
            live.current.showBubble(
              rig.current?.happy(i, () => {
                if (!active) return;
                go("reaction-done");
                controller.beginReset();
              }) ?? null,
            );
          });
        });
        return;
      }
      // GOAL → the egg breaks in the net; the keeper hits the ground, slides, looks at the goal, gets up angry.
      feedback("eggBreak", reduced, audioRef.current);
      go("scored");
      rig.current?.fallen(live.current.goalSide);
      run(
        Animated.sequence([
          Animated.parallel([motion(values.impact, 1, reduced ? 0 : 170), timed(values.land, 300, Easing.in(Easing.quad))]),
          reduced ? Animated.delay(0) : timed(values.slide, 380, Easing.out(Easing.cubic)),
        ]),
        () => {
          go("fell");
          run(Animated.delay(reduced ? 250 : 420), () => {
            rig.current?.standAngry();
            run(timed(values.rise, 340, Easing.out(Easing.back(1.4))), () => {
              go("hold-done");
              const i = pickFrom(ANGRY_REACTIONS.length, recent.current.angry);
              recent.current.angry = [...recent.current.angry, i].slice(-4);
              live.current.showBubble(
                rig.current?.angry(i, () => {
                  if (!active) return;
                  go("reaction-done");
                  controller.beginReset();
                }) ?? null,
              );
            });
          });
        },
      );
    });
    return () => {
      active = false;
      running.forEach((a) => a.stop());
    };
  }, [controller, reduced, shot, state.phase, values]);

  // Tap during a reaction: skip it — only then, never while a shot could collide.
  const skip = () => {
    if (!canSkip(stage) || state.phase !== "RESOLVING") return;
    rig.current?.stop();
    bubbleOpacity.setValue(0);
    setBubble(null);
    go("skip");
    controller.beginReset();
  };

  // Recovery: (get up,) walk back to the centre; then egg cleanup and back to the living idle.
  useEffect(() => {
    if (state.phase !== "RESETTING" || state.error) return;
    const anim = Animated.sequence([
      Animated.parallel([motion(values.rise, 1, reduced ? 0 : 260), motion(values.impact, 0, 180)]),
      motion(values.home, 1, reduced ? 0 : 420),
    ]);
    anim.start(({ finished }) => {
      if (finished) {
        Object.values(values).forEach((v) => v.setValue(0));
        setHeld(false);
        setBubble(null);
        rig.current?.reset();
        setStage((s) => nextStage(nextStage(s, "recovered"), "ready"));
        void controller.completeReset();
      }
    });
    return () => anim.stop();
  }, [controller, reduced, state.phase, state.error, values]);

  useEffect(() => {
    if (["READY", "IDLE", "STARTING"].includes(state.phase)) {
      Object.values(values).forEach((v) => v.setValue(0));
      setHeld(false);
      setStage("IDLE");
      rig.current?.idle();
    }
  }, [state.phase, values]);

  // Feet offset from home = leap + ground contact + slide + walk back (each one a 0 → 1 phase).
  const feetX = Animated.add(
    Animated.add(
      Animated.add(
        values.dive.interpolate({ inputRange: [0, 1], outputRange: [0, plan.reach.x - home.x] }),
        values.land.interpolate({ inputRange: [0, 1], outputRange: [0, plan.land.x - plan.reach.x] }),
      ),
      values.slide.interpolate({ inputRange: [0, 1], outputRange: [0, plan.slide] }),
    ),
    values.home.interpolate({ inputRange: [0, 1], outputRange: [0, home.x - plan.land.x - plan.slide] }),
  );
  const rise = plan.reach.y - home.y;
  const feetY = Animated.add(
    Animated.add(
      values.dive.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, Math.min(rise * 0.75, 0) - plan.lift, rise] }),
      values.land.interpolate({ inputRange: [0, 1], outputRange: [0, plan.land.y - plan.reach.y] }),
    ),
    Animated.add(
      // A small bounce as the body meets the grass, then it settles.
      values.slide.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, -width * 0.01, 0] }),
      values.home.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -width * 0.012, 0, -width * 0.012, 0] }),
    ),
  );
  const angle = Animated.add(
    Animated.add(
      values.dive.interpolate({ inputRange: [0, 1], outputRange: [0, plan.angle] }),
      values.land.interpolate({ inputRange: [0, 1], outputRange: [0, plan.landAngle - plan.angle] }),
    ),
    Animated.add(
      values.slide.interpolate({ inputRange: [0, 1], outputRange: [0, slideAngle] }),
      values.rise.interpolate({ inputRange: [0, 1], outputRange: [0, -plan.landAngle - slideAngle] }),
    ),
  );
  const airborne = Math.min(0.6, Math.max(0, -rise / (keeperSize * 1.2)) + 0.25);
  const shadowScale = Animated.add(
    values.dive.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 0.55, 1 - airborne] }),
    values.land.interpolate({ inputRange: [0, 1], outputRange: [0, airborne] }),
  );
  const showEgg = state.phase !== "RESETTING" && state.phase !== "FINISHED" && !held;
  const shootable = state.phase === "READY" && canShoot(stage);
  const talking = stage === "HAPPY_REACTION" || stage === "ANGRY_REACTION" || stage === "IDLE_TAUNT";
  const speakerX = stage === "IDLE_TAUNT" ? home.x : plan.land.x + plan.slide;
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
            accessibilityState={{ disabled: !shootable }}
            disabled={!shootable}
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
            // Crouch / push-off squash about the feet (breathing lives in the rig).
            { scaleX: Animated.add(1, Animated.multiply(values.crouch, 0.08)) },
            { scaleY: Animated.add(1, Animated.multiply(values.crouch, -0.15)) },
          ],
        }}
      >
        <KeeperRig ref={rig} size={keeperSize} holding={held} reduced={reduced} onTaunt={onTaunt} />
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
      {/* A short line from the keeper, beside its head, never past the arena edge */}
      {bubble && talking ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: home.y - keeperSize * 1.12 - 10,
              maxWidth: width * 0.46,
              backgroundColor: t.white,
              borderRadius: 14,
              paddingHorizontal: 11,
              paddingVertical: 6,
              opacity: bubbleOpacity,
              shadowColor: "#000",
              shadowOpacity: 0.18,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            },
            speakerX < width * 0.55
              ? { left: speakerX + keeperSize * 0.18 }
              : { right: width - (speakerX - keeperSize * 0.18) },
          ]}
        >
          <Text numberOfLines={1} style={{ color: t.foreground, fontSize: 13, fontWeight: "700" }}>
            {bubble}
          </Text>
        </Animated.View>
      ) : null}
      {/* Tap to skip a taunt; the zones stay closed until the keeper is ready again */}
      {canSkip(stage) ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Keyingi zarbaga o‘tish"
          onPress={skip}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
}
