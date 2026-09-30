import { useId, useMemo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { sunCoinFaceSvg } from './coinSvg';

/** The still SUN Coin for lists and rows: the same round face as the animated coin, clipped to a circle. */
export function SunCoinIcon({ size = 28 }: { size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const xml = useMemo(() => sunCoinFaceSvg(`coin-${id}`), [id]);
  return (
    <View accessibilityRole="image" accessibilityLabel="SUN Coin" style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}
