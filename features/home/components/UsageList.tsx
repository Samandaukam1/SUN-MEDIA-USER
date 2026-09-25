import { StyleSheet, View } from 'react-native';

import { Card, ProgressBar, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import type { ClientHome } from '../api';

type Usage = ClientHome['usage'][number];

/** Plan quota usage: "Reels 8 / 12" with a bar; over-delivery is shown as a positive note. */
export function UsageList({ usage, limit }: { usage: Usage[]; limit?: number }) {
  const rows = usage.filter((u) => u.is_quantitative && u.is_included && (u.planned ?? 0) > 0).slice(0, limit);
  if (rows.length === 0) return null;
  return (
    <Card style={styles.card}>
      {rows.map((u) => {
        const planned = u.planned ?? 0;
        const over = u.used > planned;
        return (
          <View key={u.service_key} style={styles.row}>
            <View style={styles.line}>
              <Text variant="captionMedium" style={styles.flex}>
                {u.service_name}
              </Text>
              <Text variant="captionMedium" style={styles.num}>
                {u.used}
                <Text variant="caption" tone="tertiary">
                  {' '}/ {planned}
                </Text>
              </Text>
            </View>
            <ProgressBar value={planned ? u.used / planned : 0} tone={over ? 'success' : 'accent'} label={`${u.service_name}: ${u.used} / ${planned}`} />
            {over ? (
              <Text variant="micro" tone="success">
                Rejadan +{u.used - planned} ko‘p bajarildi
              </Text>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  row: { gap: 6 },
  line: { flexDirection: 'row', alignItems: 'baseline' },
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
});
