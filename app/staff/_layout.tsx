import { Stack } from 'expo-router';

import { useStackScreenOptions } from '@/components/navigation/stackOptions';

export default function InterfaceStack() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
