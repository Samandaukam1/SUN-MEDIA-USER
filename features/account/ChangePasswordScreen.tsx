import { useMutation } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Icon, Screen, Text, TextField, useToast } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { changePassword, PASSWORD_RULES } from './api';

export function ChangePasswordScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const nav = useNav();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const mutation = useMutation({
    mutationFn: () => changePassword(password, confirm),
    onSuccess: () => {
      toast.show('Parol o‘zgartirildi');
      nav.back();
    },
    onError: toast.error,
  });
  const valid = PASSWORD_RULES.every((r) => r.test(password)) && password === confirm;

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: 'Parolni o‘zgartirish' }} />
      <Text variant="body" tone="secondary">
        Administrator bergan vaqtinchalik parolni o‘zingiz biladigan parolga almashtiring.
      </Text>
      <TextField label="Yangi parol" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <TextField
        label="Yangi parolni takrorlang"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={confirm && confirm !== password ? 'Parollar bir xil emas' : null}
      />
      <Card variant="sunken" style={styles.rules}>
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <View key={rule.key} style={styles.rule}>
              <Icon name={ok ? 'check-circle' : 'circle'} size={16} color={ok ? colors.success : colors.textTertiary} />
              <Text variant="caption" tone={ok ? 'primary' : 'tertiary'}>
                {rule.label}
              </Text>
            </View>
          );
        })}
      </Card>
      <Button title="Parolni saqlash" disabled={!valid} loading={mutation.isPending} onPress={() => mutation.mutate()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rules: { gap: spacing.sm },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
