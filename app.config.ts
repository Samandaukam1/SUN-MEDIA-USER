import type { ConfigContext, ExpoConfig } from 'expo/config';

const BACKGROUND = '#0B0D12';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'SUN MEDIA',
  slug: 'sunmedia-user',
  owner: process.env.EXPO_OWNER || undefined,
  scheme: 'sunmedia',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  backgroundColor: BACKGROUND,
  ios: {
    bundleIdentifier: 'com.sunmedia.user',
    supportsTablet: true,
    usesAppleSignIn: true,
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: 'com.sunmedia.user',
    edgeToEdgeEnabled: true,
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: BACKGROUND },
  },
  web: { bundler: 'metro', output: 'single', favicon: './assets/favicon.png' },
  plugins: [
    'expo-router',
    'expo-dev-client',
    'expo-font',
    'expo-web-browser',
    'expo-apple-authentication',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 140, backgroundColor: BACKGROUND }],
    ['expo-notifications', { color: '#F5A524' }],
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
});
