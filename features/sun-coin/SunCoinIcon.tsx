import { useId, useMemo } from 'react';
import { SvgXml } from 'react-native-svg';

import { sunCoinSvg } from './coinSvg';

export function SunCoinIcon({ size = 28 }: { size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const xml = useMemo(() => sunCoinSvg(`coin-${id}`), [id]);
  return <SvgXml xml={xml} width={size} height={size} accessibilityRole="image" accessibilityLabel="SUN Coin" />;
}
