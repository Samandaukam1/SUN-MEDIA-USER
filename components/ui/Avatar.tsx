import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';

function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function Avatar({ name, url, size = 36 }: { name?: string | null; url?: string | null; size?: number }) {
  const { colors } = useTheme();
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  if (url) {
    return <Image source={{ uri: url }} style={[dimension, { backgroundColor: colors.surfaceRaised }]} contentFit="cover" />;
  }
  return (
    <View style={[styles.fallback, dimension, { backgroundColor: colors.accentSoft }]}>
      <Text variant="captionMedium" style={{ fontSize: size * 0.36, color: colors.accentOnSoft }}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ fallback: { alignItems: 'center', justifyContent: 'center' } });
