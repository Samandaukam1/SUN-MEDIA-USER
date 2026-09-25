import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { USE_NATIVE_DRIVER } from '@/lib/motion';
import { Logo } from './Logo';

export const SPLASH_BACKGROUND = '#0A0A0B';
// Same width as the native splash image (app.config.ts → expo-splash-screen imageWidth) for a seamless hand-off.
export const SPLASH_LOGO_WIDTH = 220;

type Props = {
  /** Auth/session state is resolved and the first screen can be revealed. */
  ready: boolean;
  onFinish: () => void;
};

export function AnimatedSplash({ ready, onFinish }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const [introDone, setIntroDone] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (cancelled) return;
        setReduceMotion(enabled);
        if (enabled) {
          setIntroDone(true);
          return;
        }
        Animated.sequence([
          Animated.delay(250),
          Animated.timing(scale, { toValue: 0.94, duration: 480, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: USE_NATIVE_DRIVER }),
        ]).start(() => setIntroDone(true));
      })
      .catch(() => setIntroDone(true));
    return () => {
      cancelled = true;
    };
  }, [scale]);

  useEffect(() => {
    if (!introDone || !ready) return;
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: reduceMotion ? 120 : 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(({ finished }) => finished && onFinish());
  }, [introDone, ready, reduceMotion, overlayOpacity, onFinish]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]}>
      <View style={styles.center}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Logo width={SPLASH_LOGO_WIDTH} onDark />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: SPLASH_BACKGROUND, zIndex: 100, pointerEvents: 'none' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
