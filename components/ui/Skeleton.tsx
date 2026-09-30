import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type DimensionValue } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { USE_NATIVE_DRIVER } from '@/lib/motion';
import { GlassSurface } from './Glass';

export function Skeleton({ width = '100%', height = 16, rounded = radius.sm }: { width?: DimensionValue; height?: number; rounded?: number }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(opacity, { toValue: 0.55, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, borderRadius: rounded, backgroundColor: colors.skeleton, opacity }}
    />
  );
}

/** Card-shaped placeholders for list screens. */
export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list} accessibilityLabel="Yuklanmoqda">
      {Array.from({ length: count }).map((_, i) => (
        <GlassSurface key={i} variant="card" radius={radius.xl} style={styles.card}>
          <Skeleton width="40%" height={12} rounded={6} />
          <Skeleton width="85%" height={20} rounded={8} />
          <Skeleton width="60%" height={12} rounded={6} />
        </GlassSurface>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: { gap: spacing.md, padding: spacing.lg + 2 },
});
