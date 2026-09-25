import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/** Native iOS-style headers for detail screens pushed over the tabs. */
export function useStackScreenOptions(): NativeStackNavigationOptions {
  const { colors } = useTheme();
  return {
    headerShown: true,
    headerTitleAlign: 'center',
    headerTintColor: colors.text,
    headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
    headerStyle: { backgroundColor: colors.background },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal',
    contentStyle: { backgroundColor: colors.background },
  };
}
