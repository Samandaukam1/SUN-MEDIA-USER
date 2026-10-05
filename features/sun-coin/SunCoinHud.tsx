import { Pressable, StyleSheet } from 'react-native';

import { GlassSurface, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { SunCoin } from './SunCoin';
import { formatSunCoin } from './types';

/** Game HUD corner: the turning SUN Coin and the balance on a glass capsule. Tapping opens the coin sheet. */
export function SunCoinHud({ balance, onPress, animated = true }: { balance: number | undefined; onPress?: () => void; animated?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={balance == null ? 'SUN Coin balansi yuklanmoqda' : `SUN Coin balansi ${formatSunCoin(balance)}. SUN Coin olish`}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <GlassSurface variant="chrome" radius={999} style={styles.capsule}>
        <SunCoin size={26} animated={animated} />
        <Text variant="subheading" style={[styles.amount, { color: colors.text }]}>
          {balance == null ? '— SC' : formatSunCoin(balance)}
        </Text>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  capsule: { flexDirection: 'row', alignItems: 'center', paddingLeft: 9, paddingRight: 14, height: 44, gap: 8 },
  amount: { fontVariant: ['tabular-nums'] },
});
