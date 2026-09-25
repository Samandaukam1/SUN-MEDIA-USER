import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { USE_NATIVE_DRIVER } from '@/lib/motion';
import { toUserMessage } from '@/lib/errors';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Tone = 'success' | 'error' | 'info';
type ToastApi = { show: (message: string, tone?: Tone) => void; error: (error: unknown) => void };

const ToastContext = createContext<ToastApi | null>(null);

/** Short, non-blocking confirmations ("Saqlandi") and errors for mutations. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; tone: Tone } | null>(null);
  const y = useRef(new Animated.Value(-120)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, tone: Tone = 'success') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, tone });
      AccessibilityInfo.announceForAccessibility(message);
      Animated.timing(y, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }).start();
      timer.current = setTimeout(() => {
        Animated.timing(y, { toValue: -120, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }).start(() =>
          setToast(null),
        );
      }, tone === 'error' ? 4200 : 2400);
    },
    [y],
  );

  const api = useMemo<ToastApi>(() => ({ show, error: (e) => show(toUserMessage(e), 'error') }), [show]);
  const icon: IconName = toast?.tone === 'error' ? 'alert-circle' : toast?.tone === 'info' ? 'info' : 'check-circle';
  const iconColor = toast?.tone === 'error' ? colors.danger : toast?.tone === 'info' ? colors.info : colors.brand;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View
          accessibilityRole="alert"
          style={[styles.wrap, { top: insets.top + spacing.sm, transform: [{ translateY: y }] }]}
        >
          <View style={[styles.toast, { backgroundColor: colors.hero, borderColor: colors.heroBorder }]}>
            <Icon name={icon} size={18} color={iconColor} />
            <Text variant="captionMedium" tone="hero" style={styles.text}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, zIndex: 50, pointerEvents: 'none' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  text: { flex: 1 },
});
