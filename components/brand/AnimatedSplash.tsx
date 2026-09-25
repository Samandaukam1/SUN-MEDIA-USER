import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { USE_NATIVE_DRIVER } from '@/lib/motion';
import { LogoMark, Wordmark } from './Logo';

const BACKGROUND = '#0B0D12';
// Same visual size as the native splash image (140pt wide with 18% padding) for a seamless hand-off.
const MARK_SIZE = 90;

type Props = {
  /** Auth/session state is resolved and the first screen can be revealed. */
  ready: boolean;
  onFinish: () => void;
};

export function AnimatedSplash({ ready, onFinish }: Props) {
  const markScale = useRef(new Animated.Value(1)).current;
  const markShift = useRef(new Animated.Value(0)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordShift = useRef(new Animated.Value(10)).current;
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
          wordOpacity.setValue(1);
          wordShift.setValue(0);
          markShift.setValue(-18);
          setIntroDone(true);
          return;
        }
        const ease = Easing.bezier(0.22, 1, 0.36, 1);
        Animated.sequence([
          Animated.parallel([
            Animated.timing(markScale, { toValue: 0.86, duration: 520, easing: ease, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(markShift, { toValue: -18, duration: 520, easing: ease, useNativeDriver: USE_NATIVE_DRIVER }),
          ]),
          Animated.parallel([
            Animated.timing(wordOpacity, { toValue: 1, duration: 420, easing: ease, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(wordShift, { toValue: 0, duration: 420, easing: ease, useNativeDriver: USE_NATIVE_DRIVER }),
          ]),
          Animated.delay(380),
        ]).start(() => setIntroDone(true));
      })
      .catch(() => setIntroDone(true));
    return () => {
      cancelled = true;
    };
  }, [markScale, markShift, wordOpacity, wordShift]);

  useEffect(() => {
    if (!introDone || !ready) return;
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: reduceMotion ? 120 : 320,
      easing: Easing.out(Easing.quad),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(({ finished }) => finished && onFinish());
  }, [introDone, ready, reduceMotion, overlayOpacity, onFinish]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]}>
      <View style={styles.center}>
        <Animated.View style={{ transform: [{ translateY: markShift }, { scale: markScale }] }}>
          <LogoMark size={MARK_SIZE} />
        </Animated.View>
      </View>
      <Animated.View style={[styles.wordWrap, { opacity: wordOpacity, transform: [{ translateY: wordShift }] }]}>
        <Wordmark color="#F3F4F6" size={20} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: BACKGROUND, zIndex: 100, pointerEvents: 'none' },
  // The mark stays exactly where the native splash drew it; the wordmark is laid out independently below.
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wordWrap: { position: 'absolute', left: 0, right: 0, top: '50%', marginTop: MARK_SIZE / 2 + 6, alignItems: 'center' },
});
