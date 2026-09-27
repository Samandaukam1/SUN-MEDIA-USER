import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Card, Section, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { unregisterDevice } from '@/features/notifications/push';
import { toUserMessage } from '@/lib/errors';
import { DevAccountButton } from './DevQuickAccess';
import { isLocalBackend, signInAsTestAccount, SWITCH_ACCOUNTS, type TestAccount } from './testAccounts';

/** DEV ONLY: "Switch Test Role" — a real sign-out followed by a real sign-in as another local seed account. */
export function DevRoleSwitch() {
  const { signOut, session } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  if (!isLocalBackend()) return null;
  const current = session?.user.email?.toLowerCase();

  const switchTo = async (account: TestAccount) => {
    setBusy(account.email);
    try {
      await unregisterDevice().catch(() => undefined);
      await signOut();
      await signInAsTestAccount(account.email);
    } catch (e) {
      // Signed out by now: the sign-in screen is showing, the quick access panel is right there.
      Alert.alert('Test rolga o‘tib bo‘lmadi', toUserMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section title="Switch Test Role">
      <Card>
        <View style={styles.body}>
          <Text variant="caption" tone="secondary">
            Faqat development: chiqadi va tanlangan test akkaunt bilan qayta kiradi.
          </Text>
          <View style={styles.grid}>
            {SWITCH_ACCOUNTS.map((account) => (
              <DevAccountButton
                key={account.email}
                account={account}
                busy={busy === account.email}
                disabled={busy !== null || current === account.email}
                onPress={() => switchTo(account)}
              />
            ))}
          </View>
        </View>
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
