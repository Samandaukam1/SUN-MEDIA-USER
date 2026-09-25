import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, ErrorState, Icon, Screen, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';

/** Signed in, but no role yet (e.g. first Google/Apple sign-in), account disabled, or context failed to load. */
export default function PendingScreen() {
  const { status, session, error, refreshContext, signOut } = useAuth();
  const { colors } = useTheme();
  const [checking, setChecking] = useState(false);

  const recheck = async () => {
    setChecking(true);
    try {
      await refreshContext();
    } finally {
      setChecking(false);
    }
  };

  if (status === 'error') {
    return (
      <Screen scroll={false} contentStyle={styles.center}>
        <ErrorState error={error} onRetry={recheck} />
        <Button title="Chiqish" variant="ghost" onPress={signOut} fullWidth={false} />
      </Screen>
    );
  }

  const disabled = status === 'disabled';
  return (
    <Screen scroll={false} contentStyle={styles.center}>
      <View style={[styles.icon, { backgroundColor: disabled ? colors.dangerSoft : colors.accentSoft }]}>
        <Icon name={disabled ? 'slash' : 'clock'} size={26} color={disabled ? colors.danger : colors.accent} />
      </View>
      <View style={styles.text}>
        <Text variant="title" align="center">
          {disabled ? 'Hisob o‘chirilgan' : 'Hisobingiz faollashtirilmoqda'}
        </Text>
        <Text variant="body" tone="secondary" align="center">
          {disabled
            ? 'Bu hisobga kirish to‘xtatilgan. Administrator bilan bog‘laning.'
            : 'SUN MEDIA administratori sizga rol va kompaniya biriktirgach, ilova avtomatik ochiladi.'}
        </Text>
        {session?.user.email ? (
          <Text variant="captionMedium" tone="tertiary" align="center">
            {session.user.email}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        {!disabled ? <Button title="Qayta tekshirish" icon="refresh-cw" onPress={recheck} loading={checking} /> : null}
        <Button title="Boshqa hisob bilan kirish" variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.xxl },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  text: { gap: spacing.sm, maxWidth: 340 },
  actions: { alignSelf: 'stretch', gap: spacing.sm, maxWidth: 440, width: '100%', marginHorizontal: 'auto' },
});
