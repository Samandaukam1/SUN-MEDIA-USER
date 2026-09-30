import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { GlassSurface } from './Glass';
import { Text } from './Text';

const NATIVE = Platform.OS !== 'web';

/**
 * A Liquid Glass bottom sheet: the screen stays visible behind a soft blur, the panel slides up on the sheet
 * material. For short decisions (confirmations, choices, a small shop) — long forms keep using Sheet.
 */
export function GlassSheet({ visible, onClose, title, eyebrow, children }: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
    const anim = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 320 : 220,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: NATIVE,
    });
    anim.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => anim.stop();
  }, [visible, progress]);

  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        {Platform.OS === 'android' ? null : <BlurView intensity={scheme === 'dark' ? 30 : 24} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
        <Pressable accessibilityRole="button" accessibilityLabel="Yopish" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.32)' }]} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.dock,
          { maxHeight: height - insets.top - spacing.xl, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height * 0.6, 0] }) }] },
        ]}
      >
        <GlassSurface variant="sheet" radius={30} style={[styles.panel, { paddingBottom: Math.max(insets.bottom - spacing.sm, spacing.lg) }]}>
          <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
          <ScrollView bounces={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {eyebrow ? (
              <Text variant="label" tone="tertiary">
                {eyebrow}
              </Text>
            ) : null}
            {title ? (
              <Text variant="title" accessibilityRole="header">
                {title}
              </Text>
            ) : null}
            {children}
          </ScrollView>
        </GlassSurface>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, bottom: spacing.sm, paddingHorizontal: spacing.sm, alignItems: 'center' },
  panel: { width: '100%', maxWidth: 560, paddingTop: spacing.sm },
  handle: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, marginBottom: spacing.sm },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg },
});
