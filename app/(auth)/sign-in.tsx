import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { Button, Text, TextField } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { signInSchema, signInWithPassword } from '@/features/auth/api';
import { AuthScaffold, FormError } from '@/features/auth/components/AuthScaffold';
import { SocialSignIn } from '@/features/auth/components/SocialSignIn';
import { toUserMessage } from '@/lib/errors';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'password' | 'google' | 'apple'>(null);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    setFormError(null);
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof FieldErrors;
        errors[key] ??= issue.message;
      });
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setBusy('password');
    try {
      // On success the auth listener switches the navigator to the role-specific interface.
      await signInWithPassword(parsed.data);
    } catch (error) {
      setFormError(toUserMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AuthScaffold
      title="Tizimga kirish"
      subtitle="Kontent reja, syomkalar, tasdiqlash va natijalar — bitta joyda."
      footer={
        <Text variant="caption" tone="tertiary" align="center">
          Hisobni SUN MEDIA administratori yaratadi.{'\n'}Kirishda muammo bo‘lsa, menejeringizga yozing.
        </Text>
      }
    >
      <SocialSignIn
        disabled={busy !== null}
        onStart={(provider) => {
          setFormError(null);
          setBusy(provider);
        }}
        onDone={() => setBusy(null)}
        onError={(error) => setFormError(toUserMessage(error))}
      />
      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={fieldErrors.email}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          placeholder="ism@kompaniya.uz"
        />
        <TextField
          ref={passwordRef}
          label="Parol"
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          placeholder="••••••••"
        />
        <Link href="/forgot-password" style={styles.forgot}>
          <Text variant="captionMedium" tone="accent">
            Parolni unutdingizmi?
          </Text>
        </Link>
        <FormError message={formError} />
        <Button title="Kirish" onPress={submit} loading={busy === 'password'} disabled={busy !== null && busy !== 'password'} />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  forgot: { alignSelf: 'flex-end' },
});
