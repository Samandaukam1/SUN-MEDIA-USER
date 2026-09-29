import type { ConfigContext, ExpoConfig } from 'expo/config';

// Launch surfaces use the brand's ink; the in-app splash (components/brand/AnimatedSplash.tsx) matches it.
const BACKGROUND = '#0A0A0B';
const ICON_BACKGROUND = '#EDEDEF';
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID || '6baa435f-7ed7-424d-901b-4e30467d55cc';

// Config is evaluated once before EAS fetches remote env; require all values in the build hook.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { validatePreviewEnvironment } = require('./scripts/check-preview-env.cjs') as { validatePreviewEnvironment: () => void };

export default ({ config }: ConfigContext): ExpoConfig => {
  const preview = process.env.APP_VARIANT === 'preview';
  if (preview) validatePreviewEnvironment();
  return {
    ...config,
    name: preview ? 'SUN MEDIA Preview' : 'SUN MEDIA',
    slug: 'sunmedia-user',
    owner: process.env.EXPO_OWNER || 'anisjonitp',
    scheme: 'sunmedia',
    version: '1.0.0',
    // Native changes produce a new runtime; compatible JS updates stay on the preview channel.
    ...(preview ? { runtimeVersion: { policy: 'fingerprint' as const }, updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` } } : { updates: { enabled: false } }),
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/icon.png',
    backgroundColor: BACKGROUND,
    ios: {
      bundleIdentifier: 'com.sunmedia.user',
      supportsTablet: true,
      usesAppleSignIn: true,
      config: { usesNonExemptEncryption: false },
      // App-level privacy manifest; Expo modules ship their own for the APIs they use.
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [{ NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] }],
      },
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
    // Static web preview hosted under a sub-path (GitHub Pages): EXPO_WEB_BASE_URL=/SUN-MEDIA-USER.
    experiments: { typedRoutes: true, ...(process.env.EXPO_WEB_BASE_URL ? { baseUrl: process.env.EXPO_WEB_BASE_URL } : {}) },
    extra: {
      eas: { projectId: EAS_PROJECT_ID },
    },
  };
};
