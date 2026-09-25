import type { TextStyle, ViewStyle } from 'react-native';

export type ColorScheme = 'light' | 'dark';

/** SUN MEDIA identity: ink black, brushed silver and a single lime accent (the "I" in MEDIA). */
export const brand = {
  ink: '#0B0B0C',
  lime: '#D4FC18',
  silver: '#D4D4D8',
} as const;

export const colors = {
  dark: {
    background: '#09090B',
    surface: '#141416',
    surfaceRaised: '#1C1C1F',
    surfaceSunken: '#0F0F11',
    border: '#26262A',
    borderStrong: '#36363C',
    text: '#F4F4F5',
    textSecondary: '#A1A1AA',
    textTertiary: '#71717A',
    // Interactive colour (buttons, links, active tab)
    accent: brand.lime,
    accentText: brand.ink,
    accentSoft: 'rgba(212,252,24,0.13)',
    accentOnSoft: brand.lime,
    // Lime used only as a highlight (indicators, today markers, progress)
    brand: brand.lime,
    onBrand: brand.ink,
    hero: '#161618',
    heroBorder: '#2A2A2E',
    heroText: '#FAFAFA',
    heroTextSecondary: '#A1A1AA',
    success: '#4ADE80',
    successSoft: 'rgba(74,222,128,0.13)',
    warning: '#FBBF24',
    warningSoft: 'rgba(251,191,36,0.13)',
    danger: '#F87171',
    dangerSoft: 'rgba(248,113,113,0.13)',
    info: '#60A5FA',
    infoSoft: 'rgba(96,165,250,0.13)',
    violet: '#A78BFA',
    violetSoft: 'rgba(167,139,250,0.13)',
    skeleton: '#1E1E21',
    overlay: 'rgba(0,0,0,0.62)',
    tabBar: '#111113',
    shadow: '#000000',
  },
  light: {
    background: '#F4F4F5',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceSunken: '#EDEDEF',
    border: '#E4E4E7',
    borderStrong: '#D4D4D8',
    text: brand.ink,
    textSecondary: '#52525B',
    textTertiary: '#8B8B93',
    accent: brand.ink,
    accentText: '#FFFFFF',
    accentSoft: 'rgba(212,252,24,0.36)',
    accentOnSoft: '#2F3A00',
    brand: brand.lime,
    onBrand: brand.ink,
    hero: brand.ink,
    heroBorder: brand.ink,
    heroText: '#FAFAFA',
    heroTextSecondary: '#A1A1AA',
    success: '#15803D',
    successSoft: 'rgba(21,128,61,0.1)',
    warning: '#B45309',
    warningSoft: 'rgba(180,83,9,0.1)',
    danger: '#DC2626',
    dangerSoft: 'rgba(220,38,38,0.08)',
    info: '#2563EB',
    infoSoft: 'rgba(37,99,235,0.08)',
    violet: '#7C3AED',
    violetSoft: 'rgba(124,58,237,0.08)',
    skeleton: '#E7E7EA',
    overlay: 'rgba(9,9,11,0.45)',
    tabBar: '#FFFFFF',
    shadow: '#18181B',
  },
} as const;

export type ThemeColors = { [K in keyof typeof colors.dark]: string };

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 } as const;
export const radius = { xs: 6, sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.8 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  subheading: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  captionMedium: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
  label: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.9, textTransform: 'uppercase' },
  metric: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  metricSmall: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  hero: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 44, letterSpacing: -1.4, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export const motion = {
  fast: 160,
  base: 240,
  slow: 420,
} as const;

/** Restrained elevation: a soft lift in light mode, borders only in dark mode. */
export function elevation(scheme: ColorScheme, level: 1 | 2 = 1): ViewStyle {
  if (scheme === 'dark') return {};
  return level === 1
    ? { shadowColor: colors.light.shadow, shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1 }
    : { shadowColor: colors.light.shadow, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 };
}
