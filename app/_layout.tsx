import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplash } from '@/components/brand/AnimatedSplash';
import { OfflineBanner, ToastProvider } from '@/components/ui';
import { ConfigErrorScreen } from '@/components/navigation/ConfigErrorScreen';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { RealtimeSync } from '@/features/auth/RealtimeSync';
import { UploadWatcher } from '@/features/files/UploadWatcher';
import { useTheme } from '@/hooks/useTheme';
import { env } from '@/lib/env';
import { queryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // The animated splash takes over from the native one with an identical first frame.
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      {env ? (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <RootNavigator />
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      ) : (
        <ConfigErrorScreen />
      )}
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { status, appInterface } = useAuth();
  const { colors, scheme } = useTheme();
  const [splashVisible, setSplashVisible] = useState(true);
  const hideSplash = useCallback(() => setSplashVisible(false), []);
  const ready = status === 'ready';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={splashVisible || scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={status === 'signed_out'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'pending' || status === 'disabled' || status === 'error'}>
          <Stack.Screen name="pending" />
        </Stack.Protected>
        <Stack.Protected guard={ready && appInterface === 'client'}>
          <Stack.Screen name="client" />
        </Stack.Protected>
        <Stack.Protected guard={ready && appInterface === 'employee'}>
          <Stack.Screen name="staff" />
        </Stack.Protected>
        <Stack.Protected guard={ready && appInterface === 'management'}>
          <Stack.Screen name="manage" />
        </Stack.Protected>
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="auth/callback" />
      </Stack>
      <RealtimeSync />
      <UploadWatcher />
      <OfflineBanner />
      {splashVisible ? <AnimatedSplash ready={status !== 'loading'} onFinish={hideSplash} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
