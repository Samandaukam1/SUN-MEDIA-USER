import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { fonts, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';

type Props = TextInputProps & { label: string; error?: string | null; hint?: string; minHeight?: number; required?: boolean };

/** Multi-line text input with a character counter when maxLength is set. */
export function TextArea({ label, error, hint, minHeight = 120, required, maxLength, value, onFocus, onBlur, style, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      <Text variant="captionMedium" tone="secondary">
        {label}
        {required ? <Text variant="captionMedium" tone="danger"> *</Text> : null}
      </Text>
      <TextInput
        {...rest}
        value={value}
        maxLength={maxLength}
        multiline
        textAlignVertical="top"
        accessibilityLabel={label}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.accent}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          { minHeight, color: colors.text, backgroundColor: colors.surface, borderColor: error ? colors.danger : focused ? colors.accent : colors.border },
          style,
        ]}
      />
      <View style={styles.footer}>
        {error ? (
          <Text variant="caption" tone="danger" style={styles.flex}>
            {error}
          </Text>
        ) : hint ? (
          <Text variant="caption" tone="tertiary" style={styles.flex}>
            {hint}
          </Text>
        ) : (
          <View style={styles.flex} />
        )}
        {maxLength ? (
          <Text variant="micro" tone="tertiary">
            {(value ?? '').length}/{maxLength}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs + 2 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
