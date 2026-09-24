import 'dotenv/config';
export default {
  expo: {
    name: 'SUN MEDIA', slug: 'sunmedia-user', scheme: 'sunmedia', version: '1.0.0', orientation: 'portrait', userInterfaceStyle: 'automatic',
    ios: { bundleIdentifier: 'com.sunmedia.user', supportsTablet: true }, android: { package: 'com.sunmedia.user' },
    web: { bundler: 'metro', output: 'single' },
    plugins: ['expo-router', 'expo-dev-client'], experiments: { typedRoutes: true },
    extra: { supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL, supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY }
  }
};
