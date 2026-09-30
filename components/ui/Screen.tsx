import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useContext, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { AppBackdrop } from './Glass';
import { PullRefreshControl } from './PullRefreshControl';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
};

export function Screen({ children, scroll = true, refreshing = false, onRefresh, edges = ['top'], contentStyle, footer }: Props) {
  const { colors } = useTheme();
  // Inside the tabs the glass bar floats over the content: leave room for it.
  const tabBar = useContext(BottomTabBarHeightContext) ?? 0;
  const bottom = tabBar ? { paddingBottom: spacing.huge + tabBar } : null;
  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, bottom, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          refreshControl={
            onRefresh ? <PullRefreshControl busy={refreshing} onRefresh={onRefresh} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, bottom, contentStyle]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.huge, gap: spacing.xl },
});
