import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { typography, type ThemeColors, type TypographyVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'violet'
  | 'inverse'
  | 'hero'
  | 'heroSecondary'
  | 'brand';

const toneToColor: Record<TextTone, keyof ThemeColors> = {
  primary: 'text',
  secondary: 'textSecondary',
  tertiary: 'textTertiary',
  accent: 'accent',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  violet: 'violet',
  inverse: 'accentText',
  hero: 'heroText',
  heroSecondary: 'heroTextSecondary',
  brand: 'brand',
};

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
  align?: 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', tone = 'primary', align, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      {...rest}
      style={[typography[variant], { color: colors[toneToColor[tone]] }, align ? { textAlign: align } : null, style]}
    />
  );
}
