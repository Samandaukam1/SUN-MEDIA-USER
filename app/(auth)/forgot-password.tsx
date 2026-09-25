import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Button, Text, TextField } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { requestPasswordReset } from '@/features/auth/api';
import { AuthScaffold, FormError } from '@/features/auth/components/AuthScaffold';
import { toUserMessage } from '@/lib/errors';

const emailSchema = z.email({ message: 'Email manzilini to‘g‘ri kiriting' });

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Email noto‘g‘ri');
      return;
    }
    setFieldError(null);
    setFormError(null);
    setBusy(true);
    try {
      await requestPasswordReset(parsed.data);
      setSent(true);
    } catch (error) {
      setFormError(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthScaffold title="Pochtangizni tekshiring" subtitle={`${email.trim()} manziliga parolni tiklash havolasi yuborildi.`}>
        <View style={styles.form}>
          <Text variant="caption" tone="secondary">
            Havolani shu qurilmada oching. Xat kelmasa, “Spam” papkasini tekshiring.
          </Text>
          <Button title="Kirish sahifasiga qaytish" variant="secondary" onPress={() => router.replace('/sign-in')} />
        </View>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold title="Parolni tiklash" subtitle="Hisobingiz emailini kiriting — tiklash havolasini yuboramiz.">
      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={fieldError}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          returnKeyType="send"
          onSubmitEditing={submit}
          placeholder="ism@kompaniya.uz"
        />
        <FormError message={formError} />
        <Button title="Havola yuborish" onPress={submit} loading={busy} />
        <Button title="Orqaga" variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))} />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.lg } });
