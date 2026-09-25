import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: inset }} />;
}
