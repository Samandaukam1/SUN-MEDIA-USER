import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { fetchAuthProviders, signInWithAppleNative, signInWithOAuth } from '../api';

type Props = {
  disabled: boolean;
  onStart: (provider: 'google' | 'apple') => void;
  onDone: () => void;
  onError: (error: unknown) => void;
};

export function SocialSignIn({ disabled, onStart, onDone, onError }: Props) {
  const { colors, scheme } = useTheme();
  const [nativeApple, setNativeApple] = useState(false);
  // Only providers the backend has configured are offered; while unknown (or offline) the email form stands alone.
  const providers = useQuery({ queryKey: ['auth', 'providers'], queryFn: fetchAuthProviders, staleTime: 10 * 60_000, retry: 1 });
  const google = providers.data?.google === true;
  const apple = providers.data?.apple === true;

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setNativeApple).catch(() => setNativeApple(false));
    }
  }, []);

  const run = async (provider: 'google' | 'apple') => {
    onStart(provider);
    try {
      if (provider === 'apple' && nativeApple) await signInWithAppleNative();
      else await signInWithOAuth(provider);
    } catch (error) {
      onError(error);
    } finally {
      onDone();
    }
  };

  if (!google && !apple) return null;

  return (
    <View style={styles.stack}>
      {apple && nativeApple ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={
            scheme === 'dark'
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={radius.md}
          style={styles.apple}
          onPress={() => !disabled && run('apple')}
        />
      ) : apple ? (
        <ProviderButton label="Apple ID bilan kirish" icon="apple" disabled={disabled} onPress={() => run('apple')} />
      ) : null}
      {google ? <ProviderButton label="Google bilan kirish" icon="google" disabled={disabled} onPress={() => run('google')} /> : null}
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text variant="caption" tone="tertiary">
          yoki email orqali
        </Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>
    </View>
  );
}

function ProviderButton({ label, icon, disabled, onPress }: { label: string; icon: 'apple' | 'google'; disabled: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.provider,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      <FontAwesome name={icon} size={18} color={colors.text} />
      <Text variant="bodyMedium">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  apple: { height: 52, width: '100%' },
  provider: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xs },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
});
