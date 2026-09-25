import { StyleSheet, View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';
import { CONTENT_STATUS, contentFormat } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { formatTime } from '@/lib/time';
import type { TodayContent } from '../api';

export function ContentRow({ content, onPress }: { content: TodayContent; onPress?: () => void }) {
  const status = CONTENT_STATUS[content.status];
  const publication = content.publications.find((p) => p.status !== 'cancelled');
  const meta = [
    contentFormat(content.content_type, publication?.platform),
    publication?.scheduled_at ? `nashr ${formatTime(publication.scheduled_at)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card onPress={onPress} accessibilityLabel={content.title}>
      <View style={styles.row}>
        <View style={styles.text}>
          <Text variant="bodyMedium" numberOfLines={2}>
            {content.title}
          </Text>
          <Text variant="caption" tone="tertiary">
            {meta}
          </Text>
        </View>
        <Badge label={status.label} tone={status.tone} dot />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 4 },
});
