import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { Avatar } from './Avatar';
import { Text } from './Text';

type Person = { id: string; name: string | null; avatarUrl?: string | null };

export function AvatarStack({ people, size = 26, max = 4 }: { people: Person[]; size?: number; max?: number }) {
  const { colors } = useTheme();
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <View style={styles.row} accessibilityLabel={people.map((p) => p.name).filter(Boolean).join(', ')}>
      {shown.map((p, i) => (
        <View key={p.id} style={[styles.ring, { marginLeft: i === 0 ? 0 : -size * 0.3, borderColor: colors.surface, borderRadius: size }]}>
          <Avatar name={p.name} url={p.avatarUrl} size={size} />
        </View>
      ))}
      {rest > 0 ? (
        <View style={[styles.more, { width: size, height: size, borderRadius: size / 2, marginLeft: -size * 0.3, backgroundColor: colors.surfaceSunken, borderColor: colors.surface }]}>
          <Text variant="micro" tone="secondary">
            +{rest}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  ring: { borderWidth: 2 },
  more: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
