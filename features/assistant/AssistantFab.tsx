import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssistantSheet } from './AssistantSheet';

const ROBOT = require('@/assets/assistant/robot-face.png');

/** The floating Sunny robot (bottom-left, above the tab bar): tap to chat. */
export function AssistantFab() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  return (
    <>
      <Animated.View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 92, transform: [{ translateY }] }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Sunny — AI yordamchi" onPress={() => setOpen(true)} hitSlop={6} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.92 : 1 }] })}>
          <Image source={ROBOT} style={styles.robot} contentFit="contain" />
        </Pressable>
      </Animated.View>
      <AssistantSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 10 },
  robot: { width: 68, height: 68 },
});
