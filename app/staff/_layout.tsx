import { Tabs } from 'expo-router';

import { tabIcon, useTabScreenOptions } from '@/components/navigation/tabOptions';

export default function EmployeeTabs() {
  return (
    <Tabs screenOptions={useTabScreenOptions()}>
      <Tabs.Screen name="index" options={{ title: 'Bosh sahifa', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
