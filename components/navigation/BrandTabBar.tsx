import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/**
 * SUN MEDIA bottom navigation: icon + label for every tab, the active tab sits on a lime pill
 * (the brand's single accent), unread counts appear as a compact badge.
 */
export function BrandTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const title = options.title ?? route.name;
        const iconColor = focused ? (scheme === 'dark' ? colors.brand : colors.onBrand) : colors.textTertiary;
        const badge = options.tabBarBadge;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={`${title}, tab, ${index + 1} of ${state.routes.length}`}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.item}
          >
            <View
              style={[
                styles.pill,
                focused && { backgroundColor: scheme === 'dark' ? colors.accentSoft : colors.brand },
              ]}
            >
              {options.tabBarIcon?.({ focused, color: iconColor, size: 20 })}
              {badge != null ? (
                <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.tabBar }]}>
                  <Text variant="micro" style={styles.badgeText}>
                    {typeof badge === 'number' && badge > 99 ? '99+' : String(badge)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              variant="micro"
              numberOfLines={1}
              style={{ color: focused ? colors.text : colors.textTertiary, fontFamily: focused ? 'Inter_600SemiBold' : 'Inter_500Medium' }}
            >
              {title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  item: { flex: 1, alignItems: 'center', gap: 3, minHeight: 48 },
  pill: { width: 52, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -3,
    right: 6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, lineHeight: 12 },
});
