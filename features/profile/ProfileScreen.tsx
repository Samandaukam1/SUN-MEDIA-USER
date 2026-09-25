import Constants from 'expo-constants';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, Screen, Section, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth, useMe } from '@/features/auth/AuthProvider';

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

export function ProfileScreen() {
  const me = useMe();
  const { signOut } = useAuth();
  const profile = me.profile;
  const roleNames = me.kind === 'client' ? me.clients.map((c) => `${c.role_name} · ${c.name}`) : me.roles.map((r) => r.name);

  return (
    <Screen>
      <Text variant="title">Profil</Text>
      <Card>
        <View style={styles.identity}>
          <Avatar name={profile?.full_name} url={profile?.avatar_url} size={56} />
          <View style={styles.identityText}>
            <Text variant="heading">{profile?.full_name || 'Ism kiritilmagan'}</Text>
            {profile?.email ? (
              <Text variant="caption" tone="secondary">
                {profile.email}
              </Text>
            ) : null}
            {me.employee?.job_title ? (
              <Text variant="caption" tone="tertiary">
                {me.employee.job_title}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.badges}>
          {roleNames.map((name) => (
            <Badge key={name} label={name} tone="accent" />
          ))}
        </View>
      </Card>

      <Section title="Ilova">
        <Card>
          <Row label="Versiya" value={Constants.expoConfig?.version ?? '—'} />
          <Row label="Til" value="O‘zbekcha" />
          <Row label="Mavzu" value="Tizim sozlamasi bo‘yicha" last />
        </Card>
      </Section>

      <Button title="Hisobdan chiqish" icon="log-out" variant="danger" onPress={() => confirmSignOut(signOut)} />
    </Screen>
  );
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowSpacing]}>
      <Text variant="body" tone="secondary">
        {label}
      </Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityText: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowSpacing: { marginBottom: spacing.md },
});
