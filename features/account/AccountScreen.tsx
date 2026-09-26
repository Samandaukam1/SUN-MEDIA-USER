import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, Icon, ListGroup, ListRow, Screen, ScreenHeader, Section, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { fetchApprovalCounts } from '@/features/approvals/api';
import { unregisterDevice } from '@/features/notifications/push';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { fetchAnnouncements } from '@/features/workspace/api';
import { useTheme } from '@/hooks/useTheme';
import { useStrings } from '@/lib/i18n';
import { useNav } from '@/lib/routes';

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

/** ACCOUNT tab: identity, security, the internal workspace (staff) and app settings. */
export function AccountScreen() {
  const me = useMe();
  const { signOut, can } = useAuth();
  const nav = useNav();
  const s = useStrings();
  const { colors, scheme } = useTheme();
  const isStaff = me.kind === 'staff';
  const profile = me.profile;
  const roleLine = isStaff ? me.roles.map((r) => r.name).join(', ') : me.clients.map((c) => `${c.role_name} · ${c.name}`).join(', ');

  const announcements = useQuery({
    queryKey: ['workspace', 'announcements', me.userId],
    queryFn: () => fetchAnnouncements(me.userId),
    enabled: isStaff,
  });
  const unread = announcements.data?.filter((a) => !a.read).length ?? 0;
  const approvals = useQuery({ queryKey: ['approvals', 'counts'], queryFn: fetchApprovalCounts });
  const pendingApprovals = (approvals.data?.to_review ?? 0) + (approvals.data?.my_revisions ?? 0);

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

      {!isStaff ? (
        <Section title="Kontent va fayllar">
          <ListGroup>
            <ListRow icon="check-circle" iconTone="brand" title="Tasdiqlash markazi" subtitle="Video va dizaynlarni ko‘rib chiqing" value={pendingApprovals ? `${pendingApprovals} kutmoqda` : null} onPress={nav.approvals} />
            <ListRow icon="folder" title="Fayllar" subtitle="Brend fayllari va tasdiqlangan kontent" onPress={nav.files} />
            {can('client.plan.view') ? <ListRow icon="credit-card" title="Tarif va foydalanish" subtitle="Reja, qoldiq va tarifni o‘zgartirish" onPress={() => nav.go('/plan')} /> : null}
            {can('client.reports.view') ? <ListRow icon="bar-chart-2" title="Oylik hisobotlar" subtitle="Natijalar, o‘sish va PDF" onPress={() => nav.go('/reports')} /> : null}
          </ListGroup>
        </Section>
      ) : null}

      {isStaff ? (
        <Section title="Ish">
          <ListGroup>
            <ListRow icon="check-square" iconTone="brand" title="Vazifalar" subtitle="Mening va jamoa vazifalari, muddatlar" onPress={() => nav.go('/tasks')} />
            <ListRow icon="check-circle" title="Tasdiqlash markazi" subtitle="Versiyalar, revisionlar, vaqtli izohlar" value={pendingApprovals ? `${pendingApprovals} kutmoqda` : null} onPress={nav.approvals} />
            <ListRow icon="folder" title="Fayllar" subtitle="Mijoz papkalari: RAW, EDITED, APPROVED…" onPress={nav.files} />
            {can('reports.read') || can('reports.manage') ? <ListRow icon="bar-chart-2" title="Oylik hisobotlar" subtitle="Mijozlar natijalari, PDF" onPress={() => nav.go('/reports')} /> : null}
            <ListRow icon="folder" title="Loyihalar" subtitle="Mijoz loyihalari, jamoa va jarayon" onPress={() => nav.go('/projects')} />
            <ListRow icon="trending-up" title="Mening natijalarim" subtitle="KPI, o‘z vaqtida bajarish, davomat" onPress={() => nav.go('/my-performance')} />
            {can('attendance.read') ? <ListRow icon="user-check" title="Davomat" subtitle="Kim keldi, kechikdi, kelmadi" onPress={() => nav.go('/attendance')} /> : null}
            {can('performance.read') ? <ListRow icon="bar-chart-2" title="Jamoa KPI" subtitle="Oylik natijalar va reyting" onPress={() => nav.go('/performance')} /> : null}
          </ListGroup>
        </Section>
      ) : null}

      {isStaff ? (
        <Section title="Ish joyi">
          <ListGroup>
            <ListRow icon="volume-2" iconTone="brand" title="E’lonlar" subtitle="Kompaniya yangiliklari" value={unread ? `${unread} yangi` : null} onPress={() => nav.go('/announcements')} />
            <ListRow icon="calendar" title="Kompaniya tadbirlari" subtitle="Yig‘ilishlar, bayramlar, dam olish kunlari" onPress={() => nav.go('/events')} />
            <ListRow icon="book-open" title="Hujjatlar va SOP" subtitle="Qo‘llanmalar, brend fayllari, shablonlar" onPress={() => nav.go('/documents')} />
            <ListRow icon="users" title="Jamoa" subtitle="Xodimlar katalogi va aloqa" onPress={() => nav.go('/team')} />
          </ListGroup>
        </Section>
      ) : null}

      <Section title="Xavfsizlik">
        <ListGroup>
          <ListRow icon="user" title="Shaxsiy ma’lumotlar" subtitle="Ism, familiya, telefon" onPress={() => nav.go('/account/profile')} />
          <ListRow icon="lock" title="Parolni o‘zgartirish" subtitle="Vaqtinchalik parolni almashtiring" onPress={() => nav.go('/account/password')} />
        </ListGroup>
      </Section>

      <Section title="Ilova">
        <ListGroup>
          <ListRow icon="bell" title="Bildirishnomalar" subtitle="Push va ilova ichidagi xabarlar" onPress={() => nav.go('/account/notifications')} />
          <ListRow icon="globe" title="Til" value="O‘zbekcha" />
          <ListRow icon={scheme === 'dark' ? 'moon' : 'sun'} title="Mavzu" value="Tizim sozlamasi bo‘yicha" />
          <ListRow icon="info" title="Versiya" value={Constants.expoConfig?.version ?? '—'} />
        </ListGroup>
      </Section>

      <Button title={s.common.signOut} icon="log-out" variant="danger" onPress={() => confirmSignOut(() => unregisterDevice().catch(() => undefined).finally(signOut))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityText: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
});
