import { Stack } from 'expo-router';

import { useStackScreenOptions } from '@/components/navigation/stackOptions';

export default function InterfaceStack() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="content/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="content/edit/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="projects/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="projects/edit/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
