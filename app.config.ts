import type { ConfigContext, ExpoConfig } from 'expo/config';

// Launch surfaces use the brand's ink; the in-app splash (components/brand/AnimatedSplash.tsx) matches it.
const BACKGROUND = '#0A0A0B';
const ICON_BACKGROUND = '#EDEDEF';

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
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: ICON_BACKGROUND },
  },
  web: { bundler: 'metro', output: 'single', favicon: './assets/favicon.png' },
  plugins: [
    'expo-router',
    'expo-dev-client',
    'expo-font',
    'expo-web-browser',
    'expo-apple-authentication',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 220, backgroundColor: BACKGROUND }],
    ['expo-notifications', { color: '#0B0B0C' }],
    'expo-video',
    [
      'expo-image-picker',
      {
        photosPermission: 'SUN MEDIA kontent, fayl va chat uchun galereyadan rasm va video tanlashga ruxsat so‘raydi.',
        cameraPermission: 'SUN MEDIA syomka materiallari va profil rasmi uchun kameradan foydalanishga ruxsat so‘raydi.',
        microphonePermission: 'SUN MEDIA kamerada video yozishda ovoz yozish uchun mikrofonga ruxsat so‘raydi.',
      },
    ],
    'expo-document-picker',
    './plugins/withQuotedBundleScript',
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
});
