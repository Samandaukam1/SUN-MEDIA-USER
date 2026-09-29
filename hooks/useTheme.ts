import { useColorScheme } from 'react-native';

import { colors, type ColorScheme, type ThemeColors } from '@/constants/theme';
import { useThemePreference } from '@/lib/themePreference';

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const preference = useThemePreference();
  const scheme: ColorScheme = preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;
  return { scheme, colors: colors[scheme] };
}
