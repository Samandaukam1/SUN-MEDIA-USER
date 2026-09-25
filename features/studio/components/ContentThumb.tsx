import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { CONTENT_TYPE } from '@/constants/labels';
import { radius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSignedUrl, type StoredFile } from '@/lib/storage';
import type { ContentType } from '../api';

/** Thumbnail from storage, or an ink tile with the format icon and client code. */
export function ContentThumb({ file, type, code, size = 64 }: { file: StoredFile; type: ContentType; code?: string | null; size?: number }) {
  const { colors } = useTheme();
  const url = useSignedUrl(file);
  const vertical = type === 'reel' || type === 'story';
  const style = { width: vertical ? size * 0.75 : size, height: size, borderRadius: radius.md };
  if (url.data) {
    return <Image source={{ uri: url.data }} style={[style, { backgroundColor: colors.surfaceSunken }]} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[style, styles.tile, { backgroundColor: colors.hero }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Icon name={CONTENT_TYPE[type]?.icon ?? 'film'} size={size * 0.3} color={colors.brand} />
      {code ? (
        <Text variant="micro" style={[styles.code, { color: colors.heroTextSecondary }]} numberOfLines={1}>
          {code}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  code: { fontSize: 9, letterSpacing: 0.6 },
});
