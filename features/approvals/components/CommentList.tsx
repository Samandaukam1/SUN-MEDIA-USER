import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Card, Icon, IconButton, Text } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatTimecode } from '@/lib/timecode';
import { formatAgo } from '@/lib/time';

export type CommentItem = {
  key: string;
  timecode_ms: number | null;
  body: string;
  author: string | null;
  avatar: string | null;
  created_at: string | null;
  draft: boolean;
  resolved: boolean;
  canResolve: boolean;
  canDelete: boolean;
};

type Props = {
  items: CommentItem[];
  onSeek?: (ms: number) => void;
  onToggleResolved?: (item: CommentItem) => void;
  onDelete?: (item: CommentItem) => void;
};

/** Timecoded notes in video order; untimed notes follow. Drafts stay on this phone until sent. */
export function CommentList({ items, onSeek, onToggleResolved, onDelete }: Props) {
  const { colors } = useTheme();
  const sorted = [...items].sort((a, b) => (a.timecode_ms ?? Number.MAX_SAFE_INTEGER) - (b.timecode_ms ?? Number.MAX_SAFE_INTEGER));
  return (
    <Card padded={false}>
      {sorted.map((c, i) => (
        <View key={c.key} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
          {c.timecode_ms != null ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${formatTimecode(c.timecode_ms)} ga o‘tish`}
              onPress={() => onSeek?.(c.timecode_ms!)}
              disabled={!onSeek}
              style={[styles.time, { backgroundColor: c.resolved ? colors.successSoft : c.draft ? colors.warningSoft : colors.dangerSoft }]}
            >
              <Icon name="play" size={11} color={c.resolved ? colors.success : c.draft ? colors.warning : colors.danger} />
              <Text variant="captionMedium" style={[styles.mono, { color: c.resolved ? colors.success : c.draft ? colors.warning : colors.danger }]}>
                {formatTimecode(c.timecode_ms)}
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.time, { backgroundColor: colors.surfaceSunken }]}>
              <Icon name="message-square" size={12} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.body}>
            <View style={styles.meta}>
              {c.author ? <Avatar name={c.author} url={c.avatar} size={18} /> : null}
              <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.flex}>
                {[c.author, c.created_at ? formatAgo(c.created_at) : null].filter(Boolean).join(' · ')}
              </Text>
              {c.draft ? <Badge label="Yuborilmagan" tone="warning" /> : null}
              {c.resolved ? <Badge label="Tuzatildi" tone="success" /> : null}
            </View>
            <Text variant="body" style={c.resolved ? { color: colors.textSecondary, textDecorationLine: 'line-through' } : undefined}>
              {c.body}
            </Text>
          </View>
          <View style={styles.actions}>
            {c.canResolve && onToggleResolved ? (
              <IconButton variant="plain" size={34}
                icon={c.resolved ? 'check-square' : 'square'}
                label={c.resolved ? 'Qayta ochish' : 'Tuzatildi deb belgilash'}
                onPress={() => onToggleResolved(c)}
              />
            ) : null}
            {c.canDelete && onDelete ? <IconButton variant="plain" size={34} icon="trash-2" label="O‘chirish" onPress={() => onDelete(c)} /> : null}
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg },
  time: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, height: 26, minWidth: 30, justifyContent: 'center', borderRadius: radius.sm },
  mono: { fontVariant: ['tabular-nums'] },
  body: { flex: 1, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  flex: { flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: -6, marginRight: -8 },
});
