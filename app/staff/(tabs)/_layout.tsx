import { Tabs } from 'expo-router';

import { renderTabBar, tab, useTabScreenOptions } from '@/components/navigation/tabOptions';
import { useStrings } from '@/lib/i18n';

export default function EmployeeTabs() {
  const s = useStrings();
  return (
    <Tabs screenOptions={useTabScreenOptions()} tabBar={renderTabBar}>
      <Tabs.Screen name="index" options={tab(s.nav.home, 'home')} />
      <Tabs.Screen name="account" options={tab(s.nav.account, 'user')} />
    </Tabs>
  );
}
