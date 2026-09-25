import type { BottomTabBarProps, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { BrandTabBar } from './BrandTabBar';

export function useTabScreenOptions(): BottomTabNavigationOptions {
  const { colors } = useTheme();
  return {
    headerShown: false,
    sceneStyle: { backgroundColor: colors.background },
    animation: 'shift',
  };
}

export function renderTabBar(props: BottomTabBarProps) {
  return <BrandTabBar {...props} />;
}

export function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: string; size: number }) {
    return <Icon name={name} size={size} color={color} />;
  };
}

/** Options for one tab: title, icon and an optional unread badge. */
export function tab(title: string, icon: IconName, badge?: number): BottomTabNavigationOptions {
  return { title, tabBarIcon: tabIcon(icon), tabBarBadge: badge && badge > 0 ? badge : undefined };
}
