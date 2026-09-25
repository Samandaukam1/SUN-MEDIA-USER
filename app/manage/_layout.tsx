import { Tabs } from 'expo-router';

import { tabIcon, useTabScreenOptions } from '@/components/navigation/tabOptions';

export default function ManagementTabs() {
  return (
    <Tabs screenOptions={useTabScreenOptions()}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: tabIcon('activity') }} />
      <Tabs.Screen name="more" options={{ title: 'Yana', tabBarIcon: tabIcon('menu') }} />
    </Tabs>
  );
}
