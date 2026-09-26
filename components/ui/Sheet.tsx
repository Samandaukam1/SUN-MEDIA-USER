import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Primary action in the header (e.g. "Saqlash"). */
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  scroll?: boolean;
  footer?: ReactNode;
};

/** Native iOS page sheet (full-screen slide-up elsewhere) with a title bar. */
export function Sheet({ visible, onClose, title, children, actionLabel, onAction, actionDisabled, scroll = true, footer }: Props) {
  const { colors } = useTheme();
  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
    >
      <SafeAreaView edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']} style={[styles.fill, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12} style={styles.side}>
            <Text variant="bodyMedium" tone="secondary">
              Yopish
            </Text>
          </Pressable>
          <Text variant="heading" numberOfLines={1} style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <View style={[styles.side, styles.right]}>
            {actionLabel && onAction ? (
              <Pressable accessibilityRole="button" onPress={onAction} disabled={actionDisabled} hitSlop={12}>
                <Text variant="bodyMedium" style={{ color: actionDisabled ? colors.textTertiary : colors.text, fontFamily: 'Inter_700Bold' }}>
                  {actionLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
          {scroll ? (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              {children}
            </ScrollView>
          ) : (
            <View style={styles.fill}>{children}</View>
          )}
          {footer ? <View style={[styles.footer, { borderTopColor: colors.border }]}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { width: 84 },
  right: { alignItems: 'flex-end' },
  title: { flex: 1, textAlign: 'center' },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.huge },
  footer: { padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
