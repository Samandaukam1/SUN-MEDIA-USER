import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/brand/Logo';
import { Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export function AuthScaffold({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <Logo color={colors.text} markSize={34} />
            <View style={styles.heading}>
              <Text variant="display">{title}</Text>
              {subtitle ? (
                <Text variant="body" tone="secondary">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {children}
          </View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function FormError({ message }: { message: string | null }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={[styles.error, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
      <Text variant="caption" tone="danger">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: spacing.xxl, paddingVertical: spacing.xxxl },
  inner: { gap: spacing.xxl, width: '100%', maxWidth: 440, alignSelf: 'center' },
  heading: { gap: spacing.sm, marginTop: spacing.xl },
  footer: { marginTop: spacing.xxxl, alignItems: 'center' },
  error: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: spacing.md },
});
