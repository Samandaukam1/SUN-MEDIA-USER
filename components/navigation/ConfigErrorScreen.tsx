import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { envError } from '@/lib/env';

/** Shown instead of crashing when the public Supabase configuration is missing from the build. */
export function ConfigErrorScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Icon name="settings" size={28} color={colors.warning} />
      <Text variant="title" align="center">
        Ilova sozlanmagan
      </Text>
      <Text variant="body" tone="secondary" align="center">
        {envError ?? 'Supabase public sozlamalari topilmadi.'}
      </Text>
      <Text variant="caption" tone="tertiary" align="center">
        .env faylida EXPO_PUBLIC_SUPABASE_URL va EXPO_PUBLIC_SUPABASE_ANON_KEY (yoki PUBLISHABLE_KEY) qiymatlarini kiriting va ilovani qayta ishga tushiring.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
});
