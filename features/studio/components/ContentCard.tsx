import { StyleSheet, View } from 'react-native';

import { AvatarStack, Badge, Card, Icon, ProgressBar, Text } from '@/components/ui';
import { CONTENT_STATUS, CONTENT_TYPE, contentProgress, PLATFORM, PRIORITY } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatRelativeDeadline, formatShortDateTime } from '@/lib/time';
import { isContentOverdue, type StudioItem } from '../api';
import { ContentThumb } from './ContentThumb';

/** Studio card: thumbnail, title, client, platform · type, status, pipeline progress, team, deadlines. */
export function ContentCard({ item, onPress, showClient = true }: { item: StudioItem; onPress: () => void; showClient?: boolean }) {
  const { colors } = useTheme();
  const status = CONTENT_STATUS[item.status];
  const overdue = isContentOverdue(item);
  const publication = item.publications.find((p) => p.status !== 'cancelled');
  const platforms = [...new Set(item.publications.filter((p) => p.status !== 'cancelled').map((p) => p.platform))];
  const editor = item.team.find((t) => t.role === 'editor')?.person;
  const operator = item.team.find((t) => t.role === 'operator')?.person;
  const people = item.team.map((t) => t.person).filter((p): p is NonNullable<typeof p> => !!p);
  const unique = [...new Map(people.map((p) => [p.id, p])).values()];

  return (
    <Card onPress={onPress} accessibilityLabel={`${item.title}, ${status.label}${overdue ? ', muddati o‘tgan' : ''}`}>
      <View style={styles.row}>
        <ContentThumb file={item.thumbnail} type={item.content_type} code={item.client?.code} />
        <View style={styles.body}>
          <View style={styles.kicker}>
            {platforms.length ? (
              platforms.slice(0, 3).map((p) => <Icon key={p} name={PLATFORM[p].icon} size={12} color={colors.textTertiary} />)
            ) : null}
            <Text variant="micro" tone="tertiary" numberOfLines={1} style={styles.flex}>
              {[showClient ? item.client?.name : null, CONTENT_TYPE[item.content_type].label, item.number ? `#${item.number}` : null].filter(Boolean).join(' · ')}
            </Text>
            {item.priority === 'urgent' || item.priority === 'high' ? <Icon name={PRIORITY[item.priority].icon ?? 'arrow-up'} size={13} color={colors.warning} /> : null}
          </View>
          <Text variant="subheading" numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.statusRow}>
            <Badge label={status.label} tone={status.tone} icon={status.icon} />
            {item.revision_count > 0 ? <Badge label={`${item.revision_count} revision`} tone="danger" /> : null}
          </View>
        </View>
      </View>
      <View style={styles.progress}>
        <ProgressBar value={contentProgress(item.status)} height={4} tone={item.status === 'revision' ? 'danger' : 'accent'} label="Ishlab chiqarish jarayoni" />
      </View>
      {unique.length ? (
        <View style={styles.footer}>
          <AvatarStack people={unique.map((p) => ({ id: p.id, name: p.full_name, avatarUrl: p.avatar_url }))} size={22} max={4} />
          <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.flex}>
            {[editor ? `Montaj: ${editor.full_name.split(' ')[0]}` : null, operator ? `Operator: ${operator.full_name.split(' ')[0]}` : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ) : null}
      {item.due_at || publication?.scheduled_at ? (
      <View style={styles.dates}>
        {item.due_at ? (
          <Text variant="captionMedium" tone={overdue ? 'danger' : 'secondary'}>
            {overdue ? 'Muddat o‘tdi · ' : 'Muddat · '}
            {formatShortDateTime(item.due_at)}
            {!overdue && formatRelativeDeadline(item.due_at) ? ` · ${formatRelativeDeadline(item.due_at)}` : ''}
          </Text>
        ) : null}
        {publication?.scheduled_at ? (
          <Text variant="caption" tone="tertiary">
            Nashr · {formatShortDateTime(publication.scheduled_at)}
          </Text>
        ) : null}
      </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  body: { flex: 1, gap: 4 },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  flex: { flex: 1 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, marginTop: 2 },
  progress: { marginTop: spacing.md },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  dates: { marginTop: spacing.xs + 2, gap: 2 },
});
