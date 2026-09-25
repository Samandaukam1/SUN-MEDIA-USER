import Svg, { Defs, G, LinearGradient, Path, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import geometry from './logo-geometry.json';

type Point = number[];

const [VIEW_W, VIEW_H] = geometry.viewBox;
const ASPECT = VIEW_H / VIEW_W;

const ringPath = (ring: Point[]) => `M${ring.map(([x, y]) => `${x} ${y}`).join('L')}Z`;
const MEDIA_PATHS = geometry.media.map((rings) => rings.map(ringPath).join(''));
const SUN_POINTS = geometry.sun.map((line) => line.map(([x, y]) => `${x},${y}`).join(' '));

type Props = {
  /** Rendered width in points; height follows the artwork's aspect ratio. */
  width?: number;
  /** Colour of "MEDIA". Defaults to the theme's text colour so the logo works on light and dark. */
  color?: string;
  /** Force the dark-surface variant (outlined box), e.g. on the splash. */
  onDark?: boolean;
  /** @deprecated kept for existing call sites; converted to an equivalent width. */
  markSize?: number;
  /** Hide the "BAKHADIROVICH" line for very small renders. */
  compact?: boolean;
};

/** Official SUN MEDIA logo, drawn from the traced vector geometry (scripts/brand/generate.py). */
export function Logo({ width, color, onDark, markSize, compact }: Props) {
  const { scheme, colors } = useTheme();
  const dark = onDark ?? scheme === 'dark';
  const w = width ?? (markSize ? markSize * 4.2 : 140);
  const box = geometry.box;
  const bar = geometry.accentBar;
  const c = geometry.colors;

  return (
    <Svg
      width={w}
      height={w * ASPECT}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      accessibilityRole="image"
      accessibilityLabel="SUN MEDIA"
    >
      <Defs>
        <LinearGradient id="sm-silver" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.silverTop} />
          <Stop offset="1" stopColor={c.silverBottom} />
        </LinearGradient>
      </Defs>
      <Rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx={box.r}
        fill={dark ? '#1E1E21' : c.ink}
        stroke={dark ? '#3A3A3E' : 'none'}
        strokeWidth={dark ? 1.5 : 0}
      />
      <G fill="none" stroke="url(#sm-silver)" strokeWidth={geometry.sunStroke} strokeLinejoin="round" strokeLinecap="butt">
        {SUN_POINTS.map((points) => (
          <Polyline key={points} points={points} />
        ))}
      </G>
      {compact ? null : (
        <SvgText
          x={geometry.tagline.x}
          y={geometry.tagline.y}
          fill="#C8C8CC"
          fontSize={geometry.tagline.size}
          fontFamily={fonts.semibold}
          letterSpacing={geometry.tagline.spacing}
          textAnchor="middle"
        >
          {geometry.tagline.text}
        </SvgText>
      )}
      <G fill={color ?? (dark ? '#F4F4F5' : colors.text)} fillRule="evenodd">
        {MEDIA_PATHS.map((d) => (
          <Path key={d} d={d} />
        ))}
      </G>
      <Rect x={bar.x} y={bar.y} width={bar.w} height={bar.h} fill={c.lime} />
    </Svg>
  );
}

/** The "SUN" box alone — for tight spaces such as headers and avatars. */
export function LogoBadge({ size = 28 }: { size?: number }) {
  const box = geometry.box;
  return (
    <Svg width={size * (box.w / box.h)} height={size} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} accessibilityLabel="SUN MEDIA">
      <Defs>
        <LinearGradient id="sm-silver-badge" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={geometry.colors.silverTop} />
          <Stop offset="1" stopColor={geometry.colors.silverBottom} />
        </LinearGradient>
      </Defs>
      <Rect x={box.x} y={box.y} width={box.w} height={box.h} rx={box.r * 3} fill={geometry.colors.ink} />
      <G fill="none" stroke="url(#sm-silver-badge)" strokeWidth={geometry.sunStroke} strokeLinejoin="round">
        {SUN_POINTS.map((points) => (
          <Polyline key={points} points={points} />
        ))}
      </G>
    </Svg>
  );
}
