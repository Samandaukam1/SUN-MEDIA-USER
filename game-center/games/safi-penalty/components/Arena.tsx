import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { GameSession } from "../../../engine/gameSession";
import { feedback, motion } from "../../../engine/animationUtils";
import { AnimationQueue } from "../../../engine/animationQueue";
import type { GameFeedback, GameState } from "../../../engine/types";
import { safiTheme as t } from "../config";
import { arenaLayout, eggFlight, goalImpactPoint, KEEPER_FEET, keeperBox, keeperDive, ZONES, zonePoint } from "../physics";
import { ANGRY_REACTIONS, canShoot, canSkip, HAPPY_REACTIONS, nextStage, pickFrom, REACTION_TIMING, type KeeperEvent, type KeeperStage } from "../reactions";
import { Egg, EggSplat, Field } from "./Artwork";
import { KeeperRig, type KeeperRigHandle } from "./KeeperRig";
import { advancePresentation, classifyShotMoment, INITIAL_PRESENTATION } from "../presentation";
import type { SafiLocker } from "../../../safiService";
import { equippedAppearance } from "../../../safiService";

const NATIVE = Platform.OS !== "web";
// Android phones get the lighter presentation: no egg trail, fewer shell pieces, no camera shake.
const LITE = Platform.OS === "android";
const FLIGHT_STEPS = Array.from({ length: 17 }, (_, i) => i / 16);

export function Arena({
  width,
  state,
  controller,
  reduced,
  audio,
  paused = false,
  locker,
}: {
  width: number;
  state: GameState;
  controller: GameSession;
  reduced: boolean;
  audio?: GameFeedback;
  paused?: boolean;
  locker?: SafiLocker;
}) {
  const layout = useMemo(() => arenaLayout(width), [width]);
  const values = useRef({
    fly: new Animated.Value(0),
    impact: new Animated.Value(0),
    burst: new Animated.Value(0),
    anticipation: new Animated.Value(0),
    // Keeper travel: crouch / push-off, leap, ground contact, slide, getting up, walking back.
    crouch: new Animated.Value(0),
    dive: new Animated.Value(0),
    land: new Animated.Value(0),
    slide: new Animated.Value(0),
    rise: new Animated.Value(0),
    home: new Animated.Value(0),
    camera: new Animated.Value(1),
    cameraX: new Animated.Value(0),
  }).current;
  const audioRef = useRef(audio);
  audioRef.current = audio;
  const [focusedZone, setFocusedZone] = useState<number | null>(null);
  // Keeper animation state (visual); the engine phase still decides when a shot is accepted.
  const [stage, setStage] = useState<KeeperStage>("IDLE");
  const go = (event: KeeperEvent) => setStage((s) => nextStage(s, event));
  const [held, setHeld] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [presentation, setPresentation] = useState(INITIAL_PRESENTATION);
  const presentationRef = useRef(INITIAL_PRESENTATION);
  const [bossIntro, setBossIntro] = useState(false);
  const [momentLabel, setMomentLabel] = useState<string | null>(null);
  const lastPresented = useRef<string | null>(null);
  const bubbleOpacity = useRef(new Animated.Value(0)).current;
  const rig = useRef<KeeperRigHandle>(null);
  const recent = useRef({ happy: [] as number[], angry: [] as number[] });
  const queue = useRef(new AnimationQueue()).current;
  useEffect(() => { queue.pause(paused); }, [paused, queue]);
  useEffect(() => () => { queue.stop(); bubbleOpacity.stopAnimation(); Object.values(values).forEach((v) => v.stopAnimation()); }, [queue, values, bubbleOpacity]);
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
        : { dir: 0 as const, hand: "l" as const, reach: home, angle: 0, lift: 0, land: home, landAngle: 0, slide: 0 },
    [shot, layout, keeperSize, home],
  );
  const inputs = FLIGHT_STEPS;
  const goal = shot?.result === "GOAL";
  const impactTarget = goal ? goalImpactPoint(target, layout.goal) : target;
  const path = useMemo(() => inputs.map((p) => eggFlight(layout.shooter, target, layout.goal, p, width * .085, goal)), [inputs, layout, target.x, target.y, width, goal]); // eslint-disable-line react-hooks/exhaustive-deps
  const direction = plan.dir || (target.x < home.x ? -1 : 1);
  const fallDir = Math.sign(plan.landAngle) || 1;
  const slideAngle = shot?.result === "GOAL" ? -fallDir * 5 : 0;
  const specialMoment = shot ? classifyShotMoment(shot, width) : null;
  const arena = state.session?.presentation?.boss ? state.session.presentation.arena : equippedAppearance(locker, "arena")?.arena ?? state.session?.presentation?.arena ?? "classic";
  const lucky = shot?.visualEvent === "LUCKY_EGG";
  const trailColor = lucky ? "#F8CD58" : equippedAppearance(locker, "trail")?.color ?? "#F7F5EF";
  useEffect(() => {
    presentationRef.current = INITIAL_PRESENTATION;
    setPresentation(INITIAL_PRESENTATION);
    lastPresented.current = null;
    if (!state.session?.presentation?.boss) return;
    setBossIntro(true);
    feedback("bossEntrance", true, audioRef.current);
    const timer = setTimeout(() => setBossIntro(false), 1500);
    return () => clearTimeout(timer);
  }, [state.session?.sessionId, state.session?.presentation?.boss]);

  useEffect(() => {
    if (state.phase !== "RESOLVING" || !shot || lastPresented.current === shot.attemptId) return;
    lastPresented.current = shot.attemptId;
    const next = advancePresentation(presentationRef.current, shot);
    presentationRef.current = next;
    setPresentation(next);
    if (shot.result === "GOAL" && next.combo >= 2)
      feedback(next.combo >= 3 ? "hotStreak" : "combo", reduced, audioRef.current);
    if (lucky) feedback("luckyEgg", reduced, audioRef.current);
    const special = classifyShotMoment(shot, width);
    if (special) {
      setMomentLabel(special === "NEAR_MISS" ? "NEAR MISS" : "CRITICAL SAVE");
      feedback(special === "NEAR_MISS" ? "nearMiss" : "criticalSave", reduced, audioRef.current);
    } else setMomentLabel(null);
  }, [shot, state.phase, width, reduced, lucky]);

  useEffect(() => {
    if (paused) return;
    if (reduced) {
      values.camera.setValue(1);
      values.cameraX.setValue(0);
      return;
    }
    const phase = state.phase;
    if (phase === "SHOOTING") {
      motion(values.camera, 1.015, 250).start();
    } else if (phase === "RESOLVING") {
      const impact = shot?.result === "GOAL" ? 1.035 : 1.023;
      Animated.sequence([motion(values.camera, impact, 160), motion(values.camera, 1.015, 340)]).start();
      if (!LITE && (specialMoment || shot?.result === "GOAL")) {
        Animated.sequence([motion(values.cameraX, 2, 65), motion(values.cameraX, -2, 70), motion(values.cameraX, 0, 70)]).start();
      }
    } else if (phase === "RESETTING" || phase === "READY" || phase === "FINISHED") {
      motion(values.camera, 1, 280).start();
      motion(values.cameraX, 0, 120).start();
    }
    return () => { values.camera.stopAnimation(); values.cameraX.stopAnimation(); };
  }, [state.phase, shot, specialMoment, reduced, values, paused]);

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
    if (on) { showBubble(line, 1200); feedback("taunt", reduced, audioRef.current); }
  };

  // A shot: whatever the keeper was doing stops; it faces the ball and bounces on its knees while the server answers.
  useEffect(() => {
    if (state.phase !== "SHOOTING" || paused) return;
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
  }, [state.phase, reduced, values, paused]);

  useEffect(() => {
    if (state.phase !== "RESOLVING" || !shot) return;
    const goal = shot.result === "GOAL";
    go("focused");
    rig.current?.dive(plan.dir);
    const timed = (v: Animated.Value, ms: number, easing: (x: number) => number) =>
      Animated.timing(v, { toValue: 1, duration: reduced ? Math.min(ms, 120) : ms, easing, useNativeDriver: NATIVE, isInteraction: false });
    // Anticipation → push-off from the ground → dive; the egg flies at the same time.
    const flight = Animated.parallel([
      motion(values.fly, 1, reduced ? 120 : specialMoment ? 650 : 500),
      Animated.sequence([
        motion(values.crouch, 1, reduced ? 0 : 90),
        Animated.parallel([motion(values.crouch, 0, reduced ? 0 : 150), timed(values.dive, 380, Easing.out(Easing.quad))]),
      ]),
    ]);
    let active = true;
    const run = (anim: Animated.CompositeAnimation, next: () => void) => {
      queue.run(() => anim, () => { if (active) next(); });
    };
    run(flight, () => {
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
          Animated.parallel([motion(values.impact, 1, reduced ? 0 : 170), motion(values.burst, 1, reduced ? 0 : 480), timed(values.land, 300, Easing.in(Easing.quad))]),
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
      queue.stop();
    };
  }, [controller, reduced, shot, state.phase, values, specialMoment, plan.dir, queue]);

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
    queue.run(() => anim, () => {
        [values.fly, values.impact, values.burst, values.anticipation, values.crouch, values.dive, values.land, values.slide, values.rise, values.home].forEach((v) => v.setValue(0));
        setHeld(false);
        setBubble(null);
        rig.current?.reset();
        setStage((s) => nextStage(nextStage(s, "recovered"), "ready"));
        void controller.completeReset();
    });
    return () => queue.stop();
  }, [controller, reduced, state.phase, state.error, values, queue]);

  useEffect(() => {
    if (["READY", "IDLE", "STARTING"].includes(state.phase)) {
      [values.fly, values.impact, values.burst, values.anticipation, values.crouch, values.dive, values.land, values.slide, values.rise, values.home].forEach((v) => v.setValue(0));
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
  const shootable = !paused && !state.paused && state.phase === "READY" && canShoot(stage);
  const talking = stage === "HAPPY_REACTION" || stage === "ANGRY_REACTION" || stage === "IDLE_TAUNT";
  const speakerX = stage === "IDLE_TAUNT" ? home.x : plan.land.x + plan.slide;
  return (
    <Animated.View
      style={{
        width,
        height: layout.height,
        borderRadius: 28,
        overflow: "hidden",
        transform: [{ translateX: values.cameraX }, { scale: values.camera }],
      }}
    >
      <Field width={width} arena={arena} />
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
              backgroundColor: "transparent",
              borderColor: t.primary,
              borderWidth:
                focusedZone === z.id && state.phase === "READY" ? 2 : 0,
            }}
          />
        ))}
      </View>
      {zone && ["SHOOTING","RESOLVING"].includes(state.phase) ? <Animated.View pointerEvents="none" style={{ position: "absolute", left: target.x-width*.028, top: target.y-width*.028, width: width*.056, height: width*.056, borderRadius: width, borderWidth: 2, borderColor: t.primary, backgroundColor: "rgba(112,188,34,.12)", opacity: values.fly.interpolate({ inputRange: [0,.6,1], outputRange: [1,.5,0] }) }} /> : null}
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
        <KeeperRig ref={rig} size={keeperSize} holding={held} goldenEgg={lucky} holdingHand={plan.hand} reduced={reduced} paused={paused} mood={presentation.mood} personality={state.session?.presentation?.personality} gloveColor={state.session?.presentation?.boss ? "#F8CD58" : equippedAppearance(locker, "gloves")?.color} outfitColor={equippedAppearance(locker, "outfit")?.color ?? (state.session?.presentation?.personality === "SERIOUS" ? "#39433D" : state.session?.presentation?.personality === "SHOWMAN" ? "#16877A" : undefined)} onTaunt={onTaunt} />
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
                    outputRange: [1, goal ? .54 : .65],
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
          <Egg golden={lucky} />
        </Animated.View>
      ) : null}
      {!reduced && !LITE && showEgg && state.phase === "RESOLVING" ? [1].map((n) => {
        const trail = inputs.map((p) => eggFlight(layout.shooter, target, layout.goal, Math.max(0,p-n*.035), width*.085, goal));
        return <Animated.View key={`trail${n}`} pointerEvents="none" style={{ position: "absolute", width: eggSize * .36, height: eggSize * .36, borderRadius: eggSize, backgroundColor: trailColor, left: layout.shooter.x - eggSize*.18, top: layout.shooter.y - eggSize*.18,
          opacity: values.fly.interpolate({ inputRange: [0,.1,.8,1], outputRange: [0,.2/n,.2/n,0] }), transform: [
            { translateX: values.fly.interpolate({ inputRange: inputs, outputRange: trail.map((p) => p.x-layout.shooter.x) }) },
            { translateY: values.fly.interpolate({ inputRange: inputs, outputRange: trail.map((p) => p.y-layout.shooter.y) }) },
          ] }} />;
      }) : null}
      {shot?.result === "GOAL" && !reduced ? Array.from({ length: LITE ? 4 : 8 }, (_, i) => <Animated.View key={`shell${i}`} pointerEvents="none" style={{
        position: "absolute", left: impactTarget.x, top: impactTarget.y, width: width*.012, height: width*.019, borderRadius: 2,
        backgroundColor: i % 3 ? "#FFF9ED" : equippedAppearance(locker,"goal_effect")?.color ?? "#F2C554",
        opacity: values.burst.interpolate({ inputRange: [0,.02,.65,1], outputRange: [0,1,1,0] }),
        transform: [ { translateX: values.burst.interpolate({ inputRange: [0,1], outputRange: [0,Math.cos(i*(LITE ? Math.PI/2 : Math.PI/4))*width*.10] }) },
          { translateY: values.burst.interpolate({ inputRange: [0,.5,1], outputRange: [0,Math.sin(i*(LITE ? Math.PI/2 : Math.PI/4))*width*.05,width*.10] }) },
          { rotate: values.burst.interpolate({ inputRange: [0,1], outputRange: ["0deg",`${i%2?1:-1}60deg`] }) } ],
      }} />) : null}
      {bossIntro ? <View pointerEvents="none" style={styles.presentation}><Text style={styles.presentationText}>SUPER CHICKEN</Text><Text style={styles.momentText}>{state.session?.presentation?.eventTitle ?? "SAFI SPECIAL"}</Text></View> : null}
      {lucky && state.phase === "RESOLVING" ? <View pointerEvents="none" style={[styles.mood, { bottom: 36 }]}><Text style={[styles.moodText, { color: "#F8CD58" }]}>LUCKY EGG</Text></View> : null}
      {shot?.result === "GOAL" ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: impactTarget.x - width * 0.115,
            top: impactTarget.y - width * 0.1,
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
              borderWidth: 1,
              borderColor: t.line,
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
      {state.phase === "RESOLVING" && (presentation.combo >= 2 || momentLabel) ? (
        <View pointerEvents="none" style={styles.presentation}>
          {presentation.combo >= 2 && shot?.result === "GOAL" ? (
            <Text style={styles.presentationText}>
              {presentation.combo >= 3 ? "HOT STREAK" : `COMBO ×${presentation.combo}`}
            </Text>
          ) : null}
          {momentLabel ? <Text style={styles.momentText}>{momentLabel}</Text> : null}
        </View>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  presentation: { position: "absolute", top: 22, alignSelf: "center", alignItems: "center", gap: 4, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, backgroundColor: "rgba(20,30,20,.78)" },
  presentationText: { color: t.primary, fontWeight: "900", fontSize: 20, letterSpacing: 1.2 },
  momentText: { color: t.white, fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  mood: { position: "absolute", bottom: 12, alignSelf: "center", paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, backgroundColor: "rgba(20,30,20,.48)" },
  moodText: { color: t.white, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
});
