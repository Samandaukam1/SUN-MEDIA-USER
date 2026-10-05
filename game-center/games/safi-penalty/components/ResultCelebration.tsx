import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { motion } from "../../../engine/animationUtils";
import { KeeperRig, type KeeperRigHandle } from "./KeeperRig";
import { safiTheme as t } from "../config";

/** Counts whole goals at 90ms intervals; character/particles use native transforms. */
export function ResultCelebration({ score, attempts, reduced, paused }: { score: number; attempts: number; reduced: boolean; paused: boolean }) {
  const [shown, setShown] = useState(reduced ? score : 0);
  const rig = useRef<KeeperRigHandle>(null);
  const burst = useRef(new Animated.Value(0)).current;
  const reacted = useRef(false);
  useEffect(() => {
    if (reduced) { setShown(score); return; }
    if (paused || shown >= score) return;
    const timer = setTimeout(() => setShown((n) => Math.min(score, n + 1)), 90);
    return () => clearTimeout(timer);
  }, [score, shown, reduced, paused]);
  useEffect(() => {
    if (paused || reacted.current) return;
    reacted.current = true;
    if (score >= 5) rig.current?.angry(7, () => rig.current?.idle());
    else rig.current?.happy(2, () => rig.current?.idle());
    if (reduced) return;
    const animation = motion(burst, 1, 850);
    animation.start();
    return () => animation.stop();
  }, [score, reduced, paused, burst]);
  return <View style={s.stage}>
    {!reduced && !paused && score >= 5 ? Array.from({ length: 8 }, (_, i) => <Animated.View key={i} pointerEvents="none" style={{ position: "absolute", top: 38, left: "50%", width: 5, height: 8, borderRadius: 2, backgroundColor: i % 2 ? t.primary : "#E3BA4D", opacity: burst.interpolate({ inputRange: [0,.1,.7,1], outputRange: [0,1,1,0] }), transform: [
      { translateX: burst.interpolate({ inputRange: [0,1], outputRange: [0,Math.cos(i*Math.PI/4)*115] }) },
      { translateY: burst.interpolate({ inputRange: [0,.5,1], outputRange: [0,-45 + Math.sin(i*Math.PI/4)*30,70] }) },
      { rotate: burst.interpolate({ inputRange: [0,1], outputRange: ["0deg",`${i*65}deg`] }) },
    ] }} />) : null}
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><KeeperRig ref={rig} size={98} holding={false} reduced={reduced} paused={paused} mood={score >= 5 ? "FRUSTRATED" : "CONFIDENT"} onTaunt={() => undefined} /></View>
    <Text accessibilityLabel={`${score} / ${attempts} gol`} style={s.score}>{shown}<Text style={s.total}> / {attempts}</Text></Text>
  </View>;
}
const s = StyleSheet.create({
  stage: { alignItems: "center", width: "100%" },
  score: { color: t.foreground, fontSize: 74, fontWeight: "800", letterSpacing: -4, fontVariant: ["tabular-nums"] },
  total: { fontSize: 25, letterSpacing: 0, color: t.muted, fontWeight: "600" },
});
