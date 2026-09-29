import { Tabs } from 'expo-router';

import { renderTabBar, tab, useTabScreenOptions } from '@/components/navigation/tabOptions';
import { useInboxBadge } from '@/features/inbox/useInboxBadge';
import { useStrings } from '@/lib/i18n';

export default function ManagementTabs() {
  const s = useStrings();
  const inbox = useInboxBadge();
  return (
    <Tabs screenOptions={useTabScreenOptions()} tabBar={renderTabBar}>
      <Tabs.Screen name="index" options={tab(s.nav.home, 'home')} />
      <Tabs.Screen name="calendar" options={tab(s.nav.calendar, 'calendar')} />
      {/* Admin / Rahbar: tasks, content and shootings together ("Ishlar"). */}
      <Tabs.Screen name="studio" options={tab(s.nav.work, 'briefcase')} />
      <Tabs.Screen name="inbox" options={tab(s.nav.inbox, 'inbox', inbox)} />
      <Tabs.Screen name="account" options={tab(s.nav.account, 'user')} />
    </Tabs>
  );
}
