import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CenterLogo } from '@/components/brand/CenterLogo';
import { Text } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';

/**
 * SUN MEDIA bottom navigation: [tab] [tab] [CENTRE LOGO = Home] [tab] [tab]. The centre is the workspace's own
 * logo (SUN MEDIA for the team, the company's for clients) with the neon orbit; other tabs keep icon + label,
 * the active one on a lime pill, unread counts as a compact badge.
 */
export function BrandTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { context } = useAuth();
  const homeIndex = state.routes.findIndex((r) => r.name === 'index');
  const others = state.routes.map((route, index) => ({ route, index })).filter((x) => x.index !== homeIndex);
  const middle = Math.ceil(others.length / 2);
  const ordered = homeIndex < 0 ? others : [...others.slice(0, middle), { route: state.routes[homeIndex], index: homeIndex }, ...others.slice(middle)];

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
      {ordered.map(({ route, index }, position) => {
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

        if (index === homeIndex) {
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={`${title}, tab, ${position + 1} of ${state.routes.length}`}
              onPress={onPress}
              style={styles.center}
            >
              <View style={styles.centerLift}>
                <CenterLogo focused={focused} logoUrl={context?.branding?.home_logo_url ?? null} />
              </View>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={`${title}, tab, ${position + 1} of ${state.routes.length}`}
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
  // The centre logo floats half above the bar.
  center: { width: 84, alignItems: 'center', minHeight: 48 },
  centerLift: { position: 'absolute', top: -40 },
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
