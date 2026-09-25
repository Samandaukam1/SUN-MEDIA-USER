import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { fonts, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Icon } from './Icon';
import { Text } from './Text';

type Props = TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, hint, secureTextEntry, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isSecret = secureTextEntry === true;

  return (
    <View style={styles.wrapper}>
      <Text variant="captionMedium" tone="secondary">
        {label}
      </Text>
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : focused ? colors.accent : colors.border,
          },
        ]}
      >
        <TextInput
          ref={ref}
          {...rest}
          accessibilityLabel={label}
          secureTextEntry={isSecret && hidden}
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
          style={[styles.input, { color: colors.text }, style]}
        />
        {isSecret ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Parolni ko‘rsatish' : 'Parolni yashirish'}
            hitSlop={12}
            onPress={() => setHidden((v) => !v)}
          >
            <Icon name={hidden ? 'eye' : 'eye-off'} size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="tertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs + 2 },
  field: {
    height: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, height: '100%' },
});
