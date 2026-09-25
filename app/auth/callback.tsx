import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { exchangeAuthCode } from '@/features/auth/api';
import { useTheme } from '@/hooks/useTheme';
import { toUserMessage } from '@/lib/errors';

/** OAuth landing route (web redirects, or Android deep links that bypass the in-app browser session). */
export default function AuthCallback() {
  const { code, error_description: providerError } = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const { colors } = useTheme();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(providerError ?? null);

  useEffect(() => {
    if (providerError) return;
    if (!code || Platform.OS === 'web') {
      setDone(true);
      return;
    }
    exchangeAuthCode(code)
      .then(() => setDone(true))
      .catch((e) => setError(toUserMessage(e)));
  }, [code, providerError]);

  if (done) return <Redirect href="/" />;

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      {error ? (
        <>
          <Text variant="heading">Kirish tugallanmadi</Text>
          <Text variant="caption" tone="secondary" align="center">
            {error}
          </Text>
          <Button title="Qaytish" variant="secondary" fullWidth={false} onPress={() => setDone(true)} />
        </>
      ) : (
        <ActivityIndicator color={colors.accent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl } });
