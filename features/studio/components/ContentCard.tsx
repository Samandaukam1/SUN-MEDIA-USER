import { StyleSheet, View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';
import { contentStatusFor, CONTENT_TYPE } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { formatRelativeDeadline, formatShortDateTime } from '@/lib/time';
import { isContentOverdue, type StudioItem } from '../api';
import { ContentThumb } from './ContentThumb';

const FINISHED = ['approved', 'scheduled', 'published', 'cancelled'];

/**
 * Studio card: only what is needed to pick the right item — picture, name, client, status, one date.
 * Team, platforms and history live on the content page.
 */
export function ContentCard({ item, onPress, showClient = true, isClient = false }: { item: StudioItem; onPress: () => void; showClient?: boolean; isClient?: boolean }) {
  const status = contentStatusFor(item.status, isClient);
  const overdue = !isClient && isContentOverdue(item);
  const post = item.publications.find((p) => p.status !== 'cancelled' && p.scheduled_at)?.scheduled_at ?? null;
  const date = dateLine(item, isClient, overdue, post);

  return (
    <Card onPress={onPress} accessibilityLabel={`${item.title}, ${status.label}${overdue ? ', muddati o‘tgan' : ''}`}>
      <View style={styles.row}>
        <ContentThumb file={item.thumbnail} type={item.content_type} code={item.client?.code} />
        <View style={styles.body}>
          <Text variant="micro" tone="tertiary" numberOfLines={1}>
            {[showClient ? item.client?.name : null, CONTENT_TYPE[item.content_type].label].filter(Boolean).join(' · ')}
          </Text>
          <Text variant="subheading" numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.statusRow}>
            <Badge label={status.label} tone={status.tone} icon={status.icon} />
          </View>
          {date ? (
            <Text variant="caption" tone={overdue ? 'danger' : 'secondary'} numberOfLines={1}>
              {date}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

/** Staff see the work deadline; a client sees when the post goes out (or when their answer is due). */
function dateLine(item: StudioItem, isClient: boolean, overdue: boolean, post: string | null): string | null {
  if (isClient) {
    if (item.status === 'client_review' && item.client_approval_due_at) return `Javob: ${formatShortDateTime(item.client_approval_due_at)}`;
    if (item.status === 'published') return null;
    return post ? `Post: ${formatShortDateTime(post)}` : null;
  }
  if (FINISHED.includes(item.status)) return post && item.status !== 'published' ? `Post: ${formatShortDateTime(post)}` : null;
  if (!item.due_at) return null;
  if (overdue) return `Muddat o‘tdi · ${formatShortDateTime(item.due_at)}`;
  const left = formatRelativeDeadline(item.due_at);
  return `Muddat: ${formatShortDateTime(item.due_at)}${left ? ` · ${left}` : ''}`;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  body: { flex: 1, gap: 4 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, marginTop: 2 },
});
