import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop, SvgXml } from 'react-native-svg';

import { Text } from '@/components/ui';
import { colors as palette } from '@/constants/theme';
import { sunCoinFaceSvg } from './coinSvg';
import { COIN_ORBIT_MS, COIN_SAMPLES, COIN_SPIN_MS, COIN_THICKNESS, coinLayers, coinTable, RIM_SAMPLES, rimDepth, rimGeometry } from './coinMotion';
import { formatSunCoin } from './types';

const NEON = palette.dark.brand;
const NATIVE = Platform.OS !== 'web';

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => mounted && setReduced(v)).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/** Runs only while the screen is focused and the app is in the foreground. */
function useActive(enabled: boolean) {
  const [focused, setFocused] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setForeground(s === 'active'));
    return () => sub.remove();
  }, []);
  return enabled && focused && foreground;
}

function loop(value: Animated.Value, duration: number) {
  value.setValue(0);
  return Animated.loop(Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: NATIVE, isInteraction: false }));
}

/** A point on a circle, clockwise from the top. */
function at(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}
function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const a = at(cx, cy, r, from);
  const b = at(cx, cy, r, to);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
}

/**
 * The SUN Coin, in 3D: a round disc with thickness — SUN MEDIA's mark on both faces, a metal rim and a neon light
 * running along that rim — turning about its vertical axis with real perspective (circle → ellipse → the metal
 * edge → reverse → circle). Rim and neon ride on the faces, so they turn with the coin; the neon also runs round
 * the rim on its own clock. Nothing rectangular is drawn: every visible layer is a circle. Transforms and opacity
 * only, on the native driver; paused when unfocused or in the background; Reduce Motion shows a still coin.
 */
export function SunCoin({ size = 32, animated = true, amount, style }: { size?: number; animated?: boolean; amount?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const active = useActive(animated);
  const moving = active && !reduced;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const face = useMemo(() => sunCoinFaceSvg(`c${uid}`), [uid]);
  const spin = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!moving) {
      spin.setValue(0.035); // a still coin, turned just enough to show it is a coin
      orbit.setValue(0); // light resting at the top of the rim
      return;
    }
    const a = loop(spin, COIN_SPIN_MS);
    const b = loop(orbit, COIN_ORBIT_MS);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [moving, spin, orbit]);

  useEffect(() => {
    if (!(active && reduced)) return;
    const s = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
        Animated.timing(shimmer, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
      ]),
    );
    s.start();
    return () => s.stop();
  }, [active, reduced, shimmer]);

  const r = size / 2;
  const thickness = size * COIN_THICKNESS;
  const perspective = size * 4.5;
  const { width: rimWidth, radius: rimR, bloom } = rimGeometry(size); // the rim sits on the coin's own edge
  const pad = bloom; // room for the neon halo, so no SVG viewport edge can cut it
  const canvas = size + pad * 2;
  const c = canvas / 2;
  const layers = useMemo(() => coinLayers(size), [size]);

  const motion3d = useMemo(() => {
    const { input, pick } = coinTable(COIN_SAMPLES);
    const f = (k: Parameters<typeof pick>[0]) => spin.interpolate({ inputRange: input, outputRange: pick(k) });
    const depth = f('depth');
    // Every layer: perspective → sideways shift by its depth → the same rotation about the vertical axis.
    const layer = (z: number, back = false) => [
      { perspective },
      { translateX: Animated.multiply(depth, z) },
      { rotateY: spin.interpolate({ inputRange: [0, 1], outputRange: back ? ['180deg', '540deg'] : ['0deg', '360deg'] }) },
    ];
    return { layer, frontOpacity: f('frontOpacity'), backOpacity: f('backOpacity'), shade: f('shade'), sheen: f('sheen') };
  }, [spin, perspective]);

  const neon = useMemo(() => {
    const input = Array.from({ length: RIM_SAMPLES + 1 }, (_, i) => i / RIM_SAMPLES);
    return {
      rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
      opacity: orbit.interpolate({ inputRange: input, outputRange: input.map(rimDepth) }),
    };
  }, [orbit]);

  const head = at(c, c, rimR, 0);
  const round = { position: 'absolute' as const, left: 0, top: 0, width: size, height: size, borderRadius: r, overflow: 'hidden' as const };

  /** One face of the coin: disc with the mark, turning shade, light sweep, metal rim and the neon on it. */
  const coinFace = (back: boolean) => (
    <>
      <View style={round}>
        <SvgXml xml={face} width={size} height={size} />
        {back ? <View style={[StyleSheet.absoluteFill, styles.backShade]} /> : null}
        <Animated.View style={[StyleSheet.absoluteFill, styles.turnShade, { opacity: motion3d.shade }]} />
        {back ? null : (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: moving ? motion3d.sheen : shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.2] }) }]}>
            <LinearGradient colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']} start={{ x: 0.1, y: 0 }} end={{ x: 0.7, y: 0.75 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        )}
      </View>
      <Svg width={canvas} height={canvas} style={[styles.canvas, { left: -pad, top: -pad }]}>
        <Circle cx={c} cy={c} r={rimR} stroke="#2A2D2F" strokeWidth={rimWidth} fill="none" />
        <Circle cx={c} cy={c} r={rimR} stroke="#C9CDC2" strokeOpacity={0.55} strokeWidth={rimWidth * 0.45} fill="none" />
      </Svg>
      <Animated.View style={[styles.canvas, { left: -pad, top: -pad, width: canvas, height: canvas, opacity: reduced ? 0.7 : neon.opacity, transform: [{ rotate: neon.rotate }] }]}>
        <Svg width={canvas} height={canvas}>
          <Defs>
            <RadialGradient id={`g${uid}${back ? 'b' : 'f'}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={NEON} stopOpacity={0.9} />
              <Stop offset="0.5" stopColor={NEON} stopOpacity={0.25} />
              <Stop offset="1" stopColor={NEON} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Path d={arc(c, c, rimR, -70, -42)} stroke={NEON} strokeOpacity={0.22} strokeWidth={rimWidth * 0.8} strokeLinecap="round" fill="none" />
          <Path d={arc(c, c, rimR, -42, -18)} stroke={NEON} strokeOpacity={0.55} strokeWidth={rimWidth * 0.9} strokeLinecap="round" fill="none" />
          <Path d={arc(c, c, rimR, -18, 0)} stroke={NEON} strokeOpacity={0.95} strokeWidth={rimWidth} strokeLinecap="round" fill="none" />
          <Circle cx={head.x} cy={head.y} r={bloom} fill={`url(#g${uid}${back ? 'b' : 'f'})`} />
          <Circle cx={head.x} cy={head.y} r={rimWidth * 0.45} fill="#F7FFD1" />
        </Svg>
      </Animated.View>
    </>
  );

  const coin = (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      {/* The thickness: round metal discs between the two faces */}
      {layers.map((z) => (
        <Animated.View key={z} style={[round, { transform: motion3d.layer(z) }]}>
          <LinearGradient colors={['#55595E', '#E4E7DC', '#8A8F95', '#D2D6C8', '#4E5257']} locations={[0, 0.3, 0.5, 0.72, 1]} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ))}
      {/* Front face at +T/2 */}
      <Animated.View style={{ position: 'absolute', width: size, height: size, opacity: motion3d.frontOpacity, transform: motion3d.layer(thickness / 2) }}>{coinFace(false)}</Animated.View>
      {/* Reverse at −T/2: drawn last, shown only while it faces the viewer, turned so it never reads mirrored */}
      <Animated.View style={{ position: 'absolute', width: size, height: size, opacity: motion3d.backOpacity, transform: motion3d.layer(-thickness / 2, true) }}>{coinFace(true)}</Animated.View>
    </View>
  );

  if (amount == null) return <View style={style}>{coin}</View>;
  return (
    <View style={[styles.row, style]} accessible accessibilityLabel={`${formatSunCoin(amount)} SUN Coin`}>
      {coin}
      <Text variant="subheading" style={styles.amount}>
        {formatSunCoin(amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { position: 'absolute' },
  backShade: { backgroundColor: 'rgba(0,0,0,0.22)' },
  turnShade: { backgroundColor: '#000' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  amount: { fontVariant: ['tabular-nums'] },
});
