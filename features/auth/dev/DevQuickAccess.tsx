import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Badge, Text } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { toUserMessage } from '@/lib/errors';
import { backendHost, isLocalBackend, signInAsTestAccount, TEST_ACCOUNTS, type TestAccount } from './testAccounts';

export function DevAccountButton({ account, busy, disabled, onPress }: { account: TestAccount; busy: boolean; disabled: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${account.label} sifatida kirish`}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.surface, borderColor: colors.border },
        (pressed || busy) && { borderColor: colors.accent },
        disabled && !busy && { opacity: 0.5 },
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={colors.text} /> : null}
      <Text variant="captionMedium" numberOfLines={1}>
        {account.label}
      </Text>
    </Pressable>
  );
}

/** DEV ONLY: one tap signs in with a local seed account through the normal Supabase password flow. */
export function DevQuickAccess({ disabled = false }: { disabled?: boolean }) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const local = isLocalBackend();

  const signIn = async (account: TestAccount) => {
    setError(null);
    setBusy(account.email);
    try {
      await signInAsTestAccount(account.email);
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.panel, { borderColor: colors.warning, backgroundColor: colors.warningSoft }]}>
      <View style={styles.header}>
        <Text variant="bodyMedium">DEV QUICK ACCESS</Text>
        <Badge label="faqat development" tone="warning" />
      </View>
      <Text variant="micro" tone="secondary">
        {local ? `Lokal baza: ${backendHost()} · parol yozish shart emas` : `Backend lokal emas (${backendHost() ?? '—'}). Test akkauntlar faqat lokal bazada bor.`}
      </Text>
      <View style={styles.grid}>
        {TEST_ACCOUNTS.map((account) => (
          <DevAccountButton
            key={account.email}
            account={account}
            busy={busy === account.email}
            disabled={!local || disabled || busy !== null}
            onPress={() => signIn(account)}
          />
        ))}
      </View>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
