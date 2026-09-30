import { Image } from 'expo-image';
import { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors as palette } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// Official SUN MEDIA artwork: the original grey logo for light mode, its graphite variant for dark mode.
const SUNMEDIA_LIGHT = require('@/assets/brand/sunmedia-home-light.jpg');
const SUNMEDIA_DARK = require('@/assets/brand/sunmedia-home-dark.png');

const NEON = palette.dark.brand; // SUN MEDIA lime
const SAMPLES = 72;
const LOOP_MS = 5600;
// The neon head and its fading trail (offsets along the outline, opacity).
const TRAIL: [number, number][] = [
  [0, 1],
  [0.02, 0.62],
  [0.04, 0.36],
  [0.06, 0.16],
];

type Point = { x: number; y: number };

/** Points evenly spaced along a rounded square (clockwise from the top centre), by arc length. */
function outline(side: number, radius: number, offset: number): (u: number) => Point {
  const straight = side - 2 * radius;
  const arc = (Math.PI * radius) / 2;
  const segs: { len: number; at: (d: number) => Point }[] = [
    { len: straight / 2, at: (d) => ({ x: side / 2 + d, y: 0 }) },
    { len: arc, at: (d) => { const a = -Math.PI / 2 + d / radius; return { x: side - radius + radius * Math.cos(a), y: radius + radius * Math.sin(a) }; } },
    { len: straight, at: (d) => ({ x: side, y: radius + d }) },
    { len: arc, at: (d) => { const a = d / radius; return { x: side - radius + radius * Math.cos(a), y: side - radius + radius * Math.sin(a) }; } },
    { len: straight, at: (d) => ({ x: side - radius - d, y: side }) },
    { len: arc, at: (d) => { const a = Math.PI / 2 + d / radius; return { x: radius + radius * Math.cos(a), y: side - radius + radius * Math.sin(a) }; } },
    { len: straight, at: (d) => ({ x: 0, y: side - radius - d }) },
    { len: arc, at: (d) => { const a = Math.PI + d / radius; return { x: radius + radius * Math.cos(a), y: radius + radius * Math.sin(a) }; } },
    { len: straight / 2, at: (d) => ({ x: radius + d, y: 0 }) },
  ];
  const total = segs.reduce((s, x) => s + x.len, 0);
  return (u: number) => {
    let d = (((u % 1) + 1) % 1) * total;
    for (const seg of segs) {
      if (d <= seg.len) {
        const p = seg.at(d);
        return { x: p.x + offset, y: p.y + offset };
      }
      d -= seg.len;
    }
    return { x: side / 2 + offset, y: offset };
  };
}

/** Front (top) bright, back (bottom) dimmed as if the neon passes behind the logo. */
function depth(yNorm: number): number {
  if (yNorm <= 0.35) return 1;
  if (yNorm >= 0.7) return 0.18;
  return 1 - ((yNorm - 0.35) / 0.35) * 0.82;
}

/**
 * The centre Home button: the workspace's logo with a neon highlight orbiting along the logo's own outline.
 * One looping native-driver animation (transforms + opacity only); paused in background and for Reduce Motion.
 */
export function CenterLogo({ size = 54, focused, lightUrl, darkUrl }: { size?: number; focused: boolean; lightUrl?: string | null; darkUrl?: string | null }) {
  const { scheme } = useTheme();
  // Theme-aware artwork: light / dark asset of the workspace (falling back to each other), else SUN MEDIA's.
  const lightSource = lightUrl ? { uri: lightUrl } : darkUrl ? { uri: darkUrl } : SUNMEDIA_LIGHT;
  const darkSource = darkUrl ? { uri: darkUrl } : lightUrl ? { uri: lightUrl } : SUNMEDIA_DARK;
  const themeFade = useRef(new Animated.Value(scheme === 'dark' ? 1 : 0)).current;
  useEffect(() => {
    // Both images stay mounted, so switching theme is a crossfade — never a blank frame.
    Animated.timing(themeFade, { toValue: scheme === 'dark' ? 1 : 0, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [scheme, themeFade]);
  const progress = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(focused ? 1.07 : 1)).current;
  const intensity = useRef(new Animated.Value(focused ? 1 : 0.72)).current;
  const pad = 14;
  const ring = size + 8; // the stroke sits just outside the tile
  const box = ring + pad * 2;
  const glow = 22;

  const heads = useMemo(() => {
    const at = outline(ring, ring * 0.3, pad);
    const input = Array.from({ length: SAMPLES + 1 }, (_, i) => i / SAMPLES);
    return TRAIL.map(([lag, strength]) => {
      const pts = input.map((u) => at(u - lag));
      return {
        strength,
        x: progress.interpolate({ inputRange: input, outputRange: pts.map((p) => p.x - glow / 2) }),
        y: progress.interpolate({ inputRange: input, outputRange: pts.map((p) => p.y - glow / 2) }),
        opacity: progress.interpolate({ inputRange: input, outputRange: pts.map((p) => strength * depth((p.y - pad) / ring)) }),
      };
    });
  }, [progress, ring, pad]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: focused ? 1.07 : 1, useNativeDriver: Platform.OS !== 'web', friction: 7 }),
      Animated.timing(intensity, { toValue: focused ? 1 : 0.72, duration: 260, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [focused, scale, intensity]);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let reduce = false;
    const run = () => {
      if (reduce || loop) return;
      progress.setValue(0);
      loop = Animated.loop(Animated.timing(progress, { toValue: 1, duration: LOOP_MS, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }));
      loop.start();
    };
    const stop = () => {
      loop?.stop();
      loop = null;
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => {
        reduce = r;
        if (r) progress.setValue(0.02);
        else run();
      })
      .catch(run);
    const sub = AppState.addEventListener('change', (s) => (s === 'active' ? run() : stop()));
    return () => {
      sub.remove();
      stop();
    };
  }, [progress]);

  const r = ring * 0.3;
  return (
    <Animated.View style={[{ width: box, height: box }, { transform: [{ scale }] }]} pointerEvents="none">
      {/* The logo-shaped stroke: a quiet neon line with a soft outer glow */}
      <Svg width={box} height={box} style={StyleSheet.absoluteFill}>
        <Rect x={pad} y={pad} width={ring} height={ring} rx={r} stroke={NEON} strokeOpacity={focused ? 0.12 : 0.07} strokeWidth={6} fill="none" />
        <Rect x={pad} y={pad} width={ring} height={ring} rx={r} stroke={NEON} strokeOpacity={focused ? 0.5 : 0.3} strokeWidth={1.4} fill="none" />
      </Svg>
      {/* Back half of the orbit (dim) is drawn under the tile… */}
      {heads.map((h, i) => (
        <Animated.View key={`b${i}`} style={[styles.head, { width: glow, height: glow, opacity: Animated.multiply(h.opacity, intensity), transform: [{ translateX: h.x }, { translateY: h.y }] }]}>
          <Glow size={glow} />
        </Animated.View>
      ))}
      <View
        style={[
          styles.tile,
          {
            left: pad + 4,
            top: pad + 4,
            width: size,
            height: size,
            borderRadius: size * 0.28,
            backgroundColor: scheme === 'dark' ? '#0B0B0C' : '#E6E6E8',
            borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
          },
        ]}
      >
        <Image source={lightSource} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} accessibilityIgnoresInvertColors />
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: themeFade }]}>
          <Image source={darkSource} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} accessibilityIgnoresInvertColors />
        </Animated.View>
        {/* Glass: a soft top highlight over the artwork, like light on a polished tile */}
        <View pointerEvents="none" style={[styles.sheen, { borderRadius: size * 0.28 }]} />
      </View>
      {/* …and the bright core rides on top, so the front of the orbit passes over the logo's edge */}
      <Animated.View
        style={[
          styles.head,
          {
            width: glow,
            height: glow,
            opacity: Animated.multiply(heads[0].opacity, intensity),
            transform: [{ translateX: heads[0].x }, { translateY: heads[0].y }],
          },
        ]}
      >
        <Core size={glow} />
      </Animated.View>
    </Animated.View>
  );
}

function Glow({ size }: { size: number }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="neon-glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={NEON} stopOpacity={0.95} />
          <Stop offset="0.45" stopColor={NEON} stopOpacity={0.35} />
          <Stop offset="1" stopColor={NEON} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#neon-glow)" />
    </Svg>
  );
}

function Core({ size }: { size: number }) {
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={2.6} fill="#F7FFD1" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  head: { position: 'absolute', left: 0, top: 0 },
  tile: { position: 'absolute', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  sheen: { ...StyleSheet.absoluteFillObject, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.04)' },
});
