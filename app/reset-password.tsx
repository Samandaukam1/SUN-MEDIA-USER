import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { Button, Text, TextField } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { exchangeAuthCode, newPasswordSchema, updatePassword } from '@/features/auth/api';
import { AuthScaffold, FormError } from '@/features/auth/components/AuthScaffold';
import { useTheme } from '@/hooks/useTheme';
import { toUserMessage } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';

type Phase = 'verifying' | 'form' | 'invalid' | 'done';

export default function ResetPasswordScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>('verifying');
  const [invalidReason, setInvalidReason] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // On web supabase-js exchanges ?code= itself (detectSessionInUrl).
        if (code && Platform.OS !== 'web') await exchangeAuthCode(code);
        const { data } = await getSupabase().auth.getSession();
        if (!active) return;
        if (data.session) setPhase('form');
        else {
          setInvalidReason('Havola yaroqsiz yoki muddati tugagan.');
          setPhase('invalid');
        }
      } catch (error) {
        if (!active) return;
        setInvalidReason(toUserMessage(error));
        setPhase('invalid');
      }
    })();
    return () => {
      active = false;
    };
  }, [code]);

  const submit = async () => {
    const parsed = newPasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      const next: typeof errors = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as 'password' | 'confirm';
        next[key] ??= issue.message;
      });
      setErrors(next);
      return;
    }
    setErrors({});
    setFormError(null);
    setBusy(true);
    try {
      await updatePassword(parsed.data.password);
      setPhase('done');
    } catch (error) {
      setFormError(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'verifying') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (phase === 'invalid') {
    return (
      <AuthScaffold title="Havola ishlamadi" subtitle={invalidReason ?? undefined}>
        <Button title="Yangi havola so‘rash" onPress={() => router.replace('/forgot-password')} />
        <Button title="Kirish sahifasi" variant="ghost" onPress={() => router.replace('/sign-in')} />
      </AuthScaffold>
    );
  }

  if (phase === 'done') {
    return (
      <AuthScaffold title="Parol yangilandi" subtitle="Endi yangi parol bilan kirasiz.">
        <Button title="Davom etish" onPress={() => router.replace('/')} />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold title="Yangi parol" subtitle="Kamida 8 ta belgi: harf va raqam bo‘lsin.">
      <View style={styles.form}>
        <TextField label="Yangi parol" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
        <TextField label="Parolni takrorlang" value={confirm} onChangeText={setConfirm} error={errors.confirm} secureTextEntry autoComplete="new-password" returnKeyType="done" onSubmitEditing={submit} />
        <FormError message={formError} />
        <Button title="Saqlash" onPress={submit} loading={busy} />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: { gap: spacing.lg },
});
