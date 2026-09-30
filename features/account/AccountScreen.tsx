import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { type ComponentType } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, Icon, ListGroup, ListRow, Screen, ScreenHeader, Section, SegmentedControl, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { unregisterDevice } from '@/features/notifications/push';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { fetchAnnouncements } from '@/features/workspace/api';
import { useTheme } from '@/hooks/useTheme';
import { useStrings } from '@/lib/i18n';
import { useNav } from '@/lib/routes';
import { setThemePreference, useThemePreference, type ThemePreference } from '@/lib/themePreference';
import { ProStatusCard } from '@/features/pro/ProStatusCard';
import { ResultsDoors } from '@/features/results/components/ResultsCards';
import { TemporaryPasswordNotice } from './TemporaryPasswordNotice';

// DEV ONLY: required behind __DEV__, so production bundles contain neither the switch nor the test accounts.
const DevRoleSwitch: ComponentType | null = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/features/auth/dev/DevRoleSwitch').DevRoleSwitch
  : null;

function confirmSignOut(onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm('Hisobdan chiqasizmi?')) onConfirm();
    return;
  }
  Alert.alert('Hisobdan chiqish', 'Hisobdan chiqasizmi?', [
    { text: 'Bekor qilish', style: 'cancel' },
    { text: 'Chiqish', style: 'destructive', onPress: onConfirm },
  ]);
}

/**
 * AKKAUNT tab: who I am, my own things, and settings. Staff also get the shared team area and — only with the
 * matching permission — the management screens. Nothing is shown that the person cannot open.
 */
export function AccountScreen() {
  const me = useMe();
  const { signOut } = useAuth();
  const theme = useThemePreference();
  const nav = useNav();
  const s = useStrings();
  const { colors } = useTheme();
  const isStaff = me.kind === 'staff';
  const profile = me.profile;
  const roleLine = isStaff ? me.roles.map((r) => r.name).join(', ') : me.clients.map((c) => `${c.role_name} · ${c.name}`).join(', ');

  return (
    <Screen>
      <ScreenHeader title={s.nav.account} />

      <Card onPress={() => nav.go('/account/profile')} accessibilityLabel="Profilni tahrirlash">
        <View style={styles.identity}>
          <Avatar name={profile?.full_name} url={profile?.avatar_url} size={60} />
          <View style={styles.identityText}>
            <Text variant="heading" numberOfLines={1}>
              {profile?.full_name || 'Ism kiritilmagan'}
            </Text>
            {me.employee?.job_title ? (
              <Text variant="caption" tone="secondary" numberOfLines={1}>
                {me.employee.job_title}
              </Text>
            ) : null}
            {profile?.email ? (
              <Text variant="caption" tone="tertiary" numberOfLines={1}>
                {profile.email}
              </Text>
            ) : null}
          </View>
          <Icon name="chevron-right" size={18} color={colors.textTertiary} />
        </View>
        {roleLine ? (
          <View style={styles.badges}>
            <Badge label={roleLine} tone="accent" />
          </View>
        ) : null}
      </Card>

      <TemporaryPasswordNotice />

      {isStaff ? <StaffSections /> : <ClientSections />}

      <Section title="Sozlamalar">
        <ListGroup>
          <ListRow icon="user" title="Shaxsiy ma’lumotlar" subtitle="Ism, familiya, telefon, rasm" onPress={() => nav.go('/account/profile')} />
          <ListRow icon="lock" title="Parolni o‘zgartirish" onPress={() => nav.go('/account/password')} />
          <ListRow icon="bell" title="Bildirishnomalar" subtitle="Qaysi xabarlar telefonga kelsin" onPress={() => nav.go('/account/notifications')} />
        </ListGroup>
      </Section>

      <Section title="Ko‘rinish">
        <SegmentedControl<ThemePreference>
          options={[
            { value: 'system', label: 'Tizim' },
            { value: 'light', label: 'Yorug‘' },
            { value: 'dark', label: 'Qorong‘u' },
          ]}
          value={theme}
          onChange={setThemePreference}
        />
      </Section>

      {DevRoleSwitch ? <DevRoleSwitch /> : null}

      <Button title={s.common.signOut} icon="log-out" variant="danger" onPress={() => confirmSignOut(() => unregisterDevice().catch(() => undefined).finally(signOut))} />
      <Text variant="caption" tone="tertiary" align="center">
        SUN MEDIA · {Constants.expoConfig?.version ?? '—'}
      </Text>
    </Screen>
  );
}

function StaffSections() {
  const me = useMe();
  const { can } = useAuth();
  const nav = useNav();
  const announcements = useQuery({ queryKey: ['workspace', 'announcements', me.userId], queryFn: () => fetchAnnouncements(me.userId) });
  const unread = announcements.data?.filter((a) => !a.read).length ?? 0;
  const seesClients = can('clients.read_all') || can('projects.manage') || can('subscriptions.read');
  const management = [
    seesClients ? { icon: 'briefcase' as const, title: 'Mijozlar', subtitle: 'Tarif, jarayon, kontaktlar', path: '/clients' } : null,
    seesClients ? { icon: 'folder' as const, title: 'Loyihalar', subtitle: 'Mijoz loyihalari va jamoasi', path: '/projects' } : null,
    can('attendance.manage') ? { icon: 'user-check' as const, title: 'Davomat', subtitle: 'Bugun kim keldi — belgilash', path: '/attendance' } : null,
    can('crm.read') ? { icon: 'target' as const, title: 'Lidlar (CRM)', subtitle: 'Meta reklamadan kelgan lidlar — mijozga yuborish', path: '/crm' } : null,
    can('crm.manage') ? { icon: 'send' as const, title: 'Lidlar hisobotini yuborish', subtitle: '7 kunlik, 30 kunlik yoki maxsus muddat', path: '/crm/report/new' } : null,
    can('reports.read') || can('reports.manage') ? { icon: 'bar-chart-2' as const, title: 'Oylik hisobotlar', subtitle: 'Mijozlar natijalari', path: '/reports' } : null,
    can('performance.read') ? { icon: 'trending-up' as const, title: 'Jamoa samaradorligi', subtitle: 'Xodimlarning oylik natijalari', path: '/performance' } : null,
  ].filter((r) => r !== null);

  return (
    <>
      <Section title="Mening ishim">
        <ListGroup>
          <ListRow icon="check-square" iconTone="brand" title="Vazifalarim" subtitle="Muddatlar va jamoa vazifalari" onPress={() => nav.go('/tasks')} />
          <ListRow icon="award" title="Mening natijam" subtitle="O‘z vaqtida bajarish va oylik natija" onPress={() => nav.go('/my-performance')} />
          <ListRow icon="folder" title="Fayllar" subtitle="Mijoz papkalari va materiallar" onPress={nav.files} />
        </ListGroup>
      </Section>

      <Section title="Jamoa uchun">
        <ListGroup>
          <ListRow icon="volume-2" title="E’lonlar" value={unread ? `${unread} yangi` : null} onPress={() => nav.go('/announcements')} />
          <ListRow icon="message-circle" title="Umumiy chat" subtitle="SUN MEDIA jamoasi — faqat xodimlar" onPress={() => nav.tab('inbox')} />
          <ListRow icon="calendar" title="Umumiy kalendar" subtitle="Syomkalar, uchrashuvlar, muddatlar" onPress={() => nav.tab('calendar')} />
          <ListRow icon="star" title="Tadbirlar va uchrashuvlar" onPress={() => nav.go('/events')} />
          <ListRow icon="book-open" title="Hujjatlar" subtitle="Ish tartibi, qo‘llanmalar, shablonlar" onPress={() => nav.go('/documents')} />
          <ListRow icon="users" title="Jamoa" subtitle="Xodimlar va ularning telefoni" onPress={() => nav.go('/team')} />
        </ListGroup>
      </Section>

      {management.length > 0 ? (
        <Section title="Boshqaruv">
          <ListGroup>
            {management.map((r) => (
              <ListRow key={r.path} icon={r.icon} title={r.title} subtitle={r.subtitle} onPress={() => nav.go(r.path)} />
            ))}
          </ListGroup>
        </Section>
      ) : null}
    </>
  );
}

/** A client follows the work and talks to SUN MEDIA; nothing here manages anything. */
function ClientSections() {
  const me = useMe();
  const { can } = useAuth();
  const nav = useNav();
  const resultsClient = me.clients.find((c) => c.permissions.includes('client.results.view'));
  return (
    <>
      {resultsClient ? (
        <Section title="Natijalar">
          <ResultsDoors client={resultsClient} />
        </Section>
      ) : null}
      <Section title="Mening">
        <ListGroup>
          {can('client.plan.view') ? <ListRow icon="credit-card" iconTone="brand" title="Mening tarifim" subtitle="Nima kiradi va qancha qoldi" onPress={() => nav.go('/plan')} /> : null}
          {can('client.reports.view') && !resultsClient ? <ListRow icon="bar-chart-2" title="Oylik hisobot" subtitle="Bu oy nima qilindi va natijalar" onPress={() => nav.go('/reports')} /> : null}
          <ListRow icon="folder" title="Fayllar" subtitle="Tayyor videolar va brend fayllari" onPress={nav.files} />
          <ListRow icon="message-circle" title="SUN MEDIA bilan chat" subtitle="Savol, fikr yoki taklif yozing" onPress={() => nav.tab('inbox')} />
          <ListRow icon="gift" iconTone="brand" title="Game Center" subtitle="SAFI Penalty · Free va Pro uchun" onPress={() => nav.go('/games')} />
        </ListGroup>
      </Section>
      <Section title="SUN MEDIA Pro">
        <ProStatusCard />
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityText: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
});
