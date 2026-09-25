import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';

import { fonts } from '@/constants/theme';
import { Text } from '@/components/ui/Text';

export const BRAND_SUN = '#F5A524';

// Horizon cuts across the lower half of the sun, matching assets/icon.png.
const STRIPES: Array<[number, number]> = [
  [56, 4.5],
  [69, 4],
  [80.5, 3.4],
  [90.3, 2.9],
];

/** Placeholder SUN MEDIA mark until the official logo files are supplied. */
export function LogoMark({ size = 48, color = BRAND_SUN }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityRole="image" accessibilityLabel="SUN MEDIA">
      <Defs>
        <Mask id="sunmedia-horizon" x="0" y="0" width="100" height="100">
          <Rect x="0" y="0" width="100" height="100" fill="white" />
          {STRIPES.map(([y, h]) => (
            <Rect key={y} x="0" y={y} width="100" height={h} fill="black" />
          ))}
        </Mask>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill={color} mask="url(#sunmedia-horizon)" />
    </Svg>
  );
}

export function Wordmark({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Text style={[styles.wordmark, { color, fontSize: size, letterSpacing: size * 0.32 }]} accessibilityRole="header">
      SUN MEDIA
    </Text>
  );
}

export function Logo({ color, markSize = 40 }: { color: string; markSize?: number }) {
  return (
    <View style={styles.row}>
      <LogoMark size={markSize} />
      <Wordmark color={color} size={markSize * 0.42} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wordmark: { fontFamily: fonts.bold },
});
