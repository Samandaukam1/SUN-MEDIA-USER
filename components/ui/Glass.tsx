import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { elevation, radius as radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/**
 * SUN MEDIA Liquid Glass. One material, four uses:
 *  - card:   static material (fill + top sheen + light edge + soft shadow) — no live blur, so long lists stay 60 fps;
 *  - chrome: floating navigation — live blur where the platform does it well (iOS, web), material elsewhere;
 *  - sheet:  modal surfaces — live blur, denser fill;
 *  - hero:   the one ink headline block per screen, with a faint glass sheen.
 */
export type GlassVariant = 'card' | 'chrome' | 'sheet' | 'hero';

// Android's blur is experimental and costly; the static material looks the same at rest.
const LIVE_BLUR = Platform.OS === 'ios' || Platform.OS === 'web';

type Props = {
  variant?: GlassVariant;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Slightly lifted look while pressed / active (brighter sheen). */
  lifted?: boolean;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
};

export function GlassSurface({ variant = 'card', radius = radii.xl, style, children, lifted = false, pointerEvents }: Props) {
  const { colors, scheme } = useTheme();
  const flat = StyleSheet.flatten(style) ?? {};
  // A caller's own colours (e.g. a brand-coloured game card) replace the material instead of fighting it.
  const fill = flat.backgroundColor ?? (variant === 'hero' ? colors.hero : variant === 'card' ? colors.glass : colors.glassStrong);
  const border = flat.borderColor ?? (variant === 'hero' ? 'rgba(255,255,255,0.06)' : colors.glassBorder);
  const live = LIVE_BLUR && (variant === 'chrome' || variant === 'sheet');
  const sheen = variant === 'hero' ? 'rgba(255,255,255,0.06)' : colors.glassSheen;
  const { backgroundColor: _bg, borderColor: _bc, ...rest } = flat;
  void _bg;
  void _bc;

  return (
    <View pointerEvents={pointerEvents} style={[elevation(scheme, variant === 'chrome' || variant === 'sheet' ? 2 : 1), { borderRadius: radius }, rest]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: radius }]}>
        {live ? <BlurView intensity={scheme === 'dark' ? 45 : 60} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
        <LinearGradient colors={[lifted ? colors.glassEdge : sheen, clear(lifted ? colors.glassEdge : sheen)]} start={{ x: 0.2, y: 0 }} end={{ x: 0.5, y: variant === 'hero' ? 0.5 : 0.8 }} style={StyleSheet.absoluteFill} />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: border,
              borderTopColor: flat.borderColor ? border : variant === 'hero' ? 'rgba(255,255,255,0.12)' : colors.glassEdge,
            },
          ]}
        />
      </View>
      {children}
    </View>
  );
}

/**
 * The quiet light behind every screen: two soft glows on the background colour, so glass has something to
 * refract. Static SVG (no blur, no animation).
 */
export function AppBackdrop() {
  const { colors } = useTheme();
  const a = splitAlpha(colors.backdropGlow);
  const b = splitAlpha(colors.backdropGlow2);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="bd-a" cx="85%" cy="4%" r="60%">
            <Stop offset="0" stopColor={a.color} stopOpacity={a.opacity} />
            <Stop offset="1" stopColor={a.color} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="bd-b" cx="0%" cy="60%" r="70%">
            <Stop offset="0" stopColor={b.color} stopOpacity={b.opacity} />
            <Stop offset="1" stopColor={b.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bd-a)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bd-b)" />
      </Svg>
    </View>
  );
}

/**
 * The same colour at zero alpha. Native gradients interpolate in plain RGB, so fading to 'transparent' (black at
 * zero alpha) would pass through grey — a muddy band on light glass.
 */
function clear(color: string): string {
  const { color: rgb } = splitAlpha(color);
  return rgb.startsWith('rgb(') ? rgb.replace('rgb(', 'rgba(').replace(')', ',0)') : 'rgba(255,255,255,0)';
}

/** SVG gradient stops on iOS ignore the alpha inside an rgba() colour, so it travels as stopOpacity instead. */
function splitAlpha(color: string): { color: string; opacity: number } {
  const m = color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  return m ? { color: `rgb(${m[1]},${m[2]},${m[3]})`, opacity: Number(m[4]) } : { color, opacity: 1 };
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
