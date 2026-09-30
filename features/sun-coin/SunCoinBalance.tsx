import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { SunCoinIcon } from './SunCoinIcon';
import { formatSunCoin } from './types';

/** Shared display for navigation, wallets and result cards. Undefined is never presented as a zero balance. */
export function SunCoinBalance({ balance, loading = false, size = 26 }: { balance?: number; loading?: boolean; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityLabel={loading ? 'SUN Coin yuklanmoqda' : balance === undefined ? 'SUN Coin balansi noma’lum' : `${formatSunCoin(balance)} SUN Coin`}>
      <SunCoinIcon size={size} />
      {loading ? <ActivityIndicator size="small" color={colors.textSecondary} /> : (
        <Text variant="subheading" style={styles.amount}>{balance === undefined ? '— SC' : formatSunCoin(balance)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  amount: { fontVariant: ['tabular-nums'] },
});
