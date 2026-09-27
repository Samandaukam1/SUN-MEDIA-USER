import { Stack } from 'expo-router';

import { modalOptions } from '@/components/navigation/modalOptions';
import { useStackScreenOptions } from '@/components/navigation/stackOptions';

export default function InterfaceStack() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="content/new" options={modalOptions} />
      <Stack.Screen name="content/edit/[id]" options={modalOptions} />
      <Stack.Screen name="content/submit/[id]" options={modalOptions} />
      <Stack.Screen name="projects/new" options={modalOptions} />
      <Stack.Screen name="shooting/new" options={modalOptions} />
      <Stack.Screen name="task/new" options={modalOptions} />
      <Stack.Screen name="task/edit/[id]" options={modalOptions} />
      <Stack.Screen name="shooting/edit/[id]" options={modalOptions} />
      <Stack.Screen name="projects/edit/[id]" options={modalOptions} />
    </Stack>
  );
}
