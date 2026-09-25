import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, Icon, ListGroup, ListRow, Screen, ScreenHeader, Section, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
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
  const { signOut } = useAuth();
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
          <ListRow icon="globe" title="Til" value="O‘zbekcha" />
          <ListRow icon={scheme === 'dark' ? 'moon' : 'sun'} title="Mavzu" value="Tizim sozlamasi bo‘yicha" />
          <ListRow icon="info" title="Versiya" value={Constants.expoConfig?.version ?? '—'} />
        </ListGroup>
      </Section>

      <Button title={s.common.signOut} icon="log-out" variant="danger" onPress={() => confirmSignOut(signOut)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityText: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
});
