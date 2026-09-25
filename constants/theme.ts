import type { TextStyle } from 'react-native';

export type ColorScheme = 'light' | 'dark';

const palette = {
  sun: '#F5A524',
  sunDeep: '#D98A0B',
  ink: '#0B0D12',
};

export const colors = {
  dark: {
    background: palette.ink,
    surface: '#12151C',
    surfaceRaised: '#181C25',
    surfaceSunken: '#0E1016',
    border: '#232835',
    borderStrong: '#303646',
    text: '#F3F4F6',
    textSecondary: '#A3A9B6',
    textTertiary: '#6B7280',
    accent: palette.sun,
    accentText: palette.ink,
    accentSoft: 'rgba(245,165,36,0.14)',
    success: '#34D399',
    successSoft: 'rgba(52,211,153,0.14)',
    warning: '#FBBF24',
    warningSoft: 'rgba(251,191,36,0.14)',
    danger: '#F87171',
    dangerSoft: 'rgba(248,113,113,0.14)',
    info: '#60A5FA',
    infoSoft: 'rgba(96,165,250,0.14)',
    violet: '#A78BFA',
    violetSoft: 'rgba(167,139,250,0.14)',
    skeleton: '#1C212B',
    overlay: 'rgba(0,0,0,0.6)',
  },
  light: {
    background: '#F6F6F4',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceSunken: '#EFEFEC',
    border: '#E6E6E1',
    borderStrong: '#D4D4CE',
    text: palette.ink,
    textSecondary: '#555B66',
    textTertiary: '#8A909B',
    accent: palette.sunDeep,
    accentText: '#FFFFFF',
    accentSoft: 'rgba(217,138,11,0.12)',
    success: '#059669',
    successSoft: 'rgba(5,150,105,0.1)',
    warning: '#B45309',
    warningSoft: 'rgba(180,83,9,0.1)',
    danger: '#DC2626',
    dangerSoft: 'rgba(220,38,38,0.08)',
    info: '#2563EB',
    infoSoft: 'rgba(37,99,235,0.08)',
    violet: '#7C3AED',
    violetSoft: 'rgba(124,58,237,0.08)',
    skeleton: '#E9E9E5',
    overlay: 'rgba(11,13,18,0.45)',
  },
} as const;

export type ThemeColors = { [K in keyof typeof colors.dark]: string };

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  title: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  captionMedium: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
  metric: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export const motion = {
  fast: 160,
  base: 240,
  slow: 420,
} as const;
