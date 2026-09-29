import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Icon, Screen, Text, TextField } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { toUserMessage } from '@/lib/errors';
import { formatShortDateTime } from '@/lib/time';
import { REDEEM_REASON, redeemPromo, type RedeemResult } from './api';

/** Akkaunt → Promo kod: a code from SUN MEDIA or a game prize turns on Pro for the given number of days. */
export function PromoScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const redeem = useMutation({
    mutationFn: () => redeemPromo(code),
    onSuccess: (r) => {
      setResult(r);
      setError(null);
      if (r.ok) {
        setCode('');
        queryClient.invalidateQueries({ queryKey: ['plan'] });
      }
    },
    onError: (e) => setError(toUserMessage(e)),
  });
  const valid = /^[A-Za-z0-9_-]{3,32}$/.test(code.trim());

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: 'Promo kod' }} />
      <Text variant="body" tone="secondary">
        SUN MEDIA bergan yoki o‘yinda yutgan kodni kiriting.
      </Text>
      <TextField
        label="Promo kod"
        value={code}
        onChangeText={(v) => {
          setCode(v.toUpperCase());
          setResult(null);
          setError(null);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="MASALAN: SAFI3DAY"
        returnKeyType="go"
        onSubmitEditing={() => valid && redeem.mutate()}
        error={error ?? (result && !result.ok ? REDEEM_REASON[result.reason] : null)}
      />
      <Button title="Faollashtirish" icon="gift" disabled={!valid} loading={redeem.isPending} onPress={() => redeem.mutate()} />

      {result?.ok ? (
        <Card style={[styles.success, { borderColor: colors.accent }]}>
          <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
            <Icon name="check" size={20} color={colors.text} />
          </View>
          <Text variant="heading">{`${result.days} kunlik ${result.plan} faollashtirildi`}</Text>
          <Text variant="body" tone="secondary">{`${formatShortDateTime(result.ends_at)} gacha amal qiladi.`}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  success: { gap: spacing.sm, borderWidth: 1, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
