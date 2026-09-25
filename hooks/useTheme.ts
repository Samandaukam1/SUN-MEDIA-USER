import { useColorScheme } from 'react-native';

import { colors, type ColorScheme, type ThemeColors } from '@/constants/theme';

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const scheme: ColorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  return { scheme, colors: colors[scheme] };
}
