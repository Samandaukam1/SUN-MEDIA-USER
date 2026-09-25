import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { Icon, type IconName } from '@/components/ui';
import { fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export function useTabScreenOptions(): BottomTabNavigationOptions {
  const { colors } = useTheme();
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.textTertiary,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
    tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
    sceneStyle: { backgroundColor: colors.background },
  };
}

export function tabIcon(name: IconName) {
  return function TabIcon({ color }: { color: string }) {
    return <Icon name={name} size={21} color={color} />;
  };
}
