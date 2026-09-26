import { Tabs } from 'expo-router';

import { renderTabBar, tab, useTabScreenOptions } from '@/components/navigation/tabOptions';
import { useInboxBadge } from '@/features/inbox/useInboxBadge';
import { useStrings } from '@/lib/i18n';

export default function ManagementTabs() {
  const s = useStrings();
  const inbox = useInboxBadge();
  return (
    <Tabs screenOptions={useTabScreenOptions()} tabBar={renderTabBar}>
      <Tabs.Screen name="index" options={tab(s.nav.dashboard, 'activity')} />
      <Tabs.Screen name="calendar" options={tab(s.nav.calendar, 'calendar')} />
      <Tabs.Screen name="studio" options={tab(s.nav.studio, 'film')} />
      <Tabs.Screen name="inbox" options={tab(s.nav.inbox, 'inbox', inbox)} />
      <Tabs.Screen name="account" options={tab(s.nav.account, 'user')} />
    </Tabs>
  );
}
