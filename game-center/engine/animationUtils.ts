import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import type { GameFeedback, SoundEvent } from "./types";
export function useReduceMotion() {
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (mounted) setReduce(v);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}
export function motion(
  value: Animated.Value,
  toValue: number,
  duration: number,
) {
  return Animated.timing(value, {
    toValue,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: Platform.OS !== "web",
    isInteraction: false,
  });
}
export function feedback(
  event: SoundEvent,
  reduced: boolean,
  options?: GameFeedback,
) {
  if (options?.soundEnabled) {
    try {
      options.onSound?.(event);
    } catch {
      /* Optional audio never interrupts play. */
    }
  }
  if (reduced || options?.hapticsEnabled === false || Platform.OS === "web" || !["shot", "catch", "criticalSave", "goal", "reward", "achievement"].includes(event)) return;
  const effect =
    event === "shot"
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : event === "catch"
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  effect.catch(() => undefined);
}
