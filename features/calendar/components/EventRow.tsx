import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { eventMeta, PLATFORM, CONTENT_TYPE } from '@/constants/labels';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatTime } from '@/lib/time';
import type { Database } from '@/types/database';
import type { CalendarRow } from '../api';

type Enums = Database['public']['Enums'];

/** One calendar event: time, type icon + label (never colour alone), title, client and place. */
export function EventRow({ event, onPress, showClient = true }: { event: CalendarRow; onPress?: () => void; showClient?: boolean }) {
  const { colors } = useTheme();
  const meta = eventMeta(event.event_type);
  const allDay = event.event_type.startsWith('company_') && formatTime(event.starts_at) === '00:00';
  const toneColor =
    meta.tone === 'violet' ? colors.violet : meta.tone === 'success' ? colors.success : meta.tone === 'warning' ? colors.warning : meta.tone === 'info' ? colors.info : meta.tone === 'accent' ? colors.accent : colors.textTertiary;
  const kicker =
    event.event_type === 'publication'
      ? [event.platform ? PLATFORM[event.platform as Enums['social_platform']]?.label : null, event.content_type ? CONTENT_TYPE[event.content_type as Enums['content_type']]?.label : null]
          .filter(Boolean)
          .join(' ') || meta.label
      : meta.label;

  const body = (
    <>
      <View style={styles.time}>
        <Text variant="captionMedium" style={styles.tabular}>
          {allDay ? 'Kun' : formatTime(event.starts_at)}
        </Text>
        {event.event_type === 'shooting' && event.ends_at ? (
          <Text variant="micro" tone="tertiary" style={styles.tabular}>
            {formatTime(event.ends_at)}
          </Text>
        ) : null}
      </View>
      <View style={[styles.bar, { backgroundColor: toneColor }]} />
      <View style={[styles.icon, { backgroundColor: colors.surfaceSunken }]}>
        <Icon name={meta.icon} size={15} color={colors.text} />
      </View>
      <View style={styles.body}>
        <Text variant="micro" tone="tertiary" numberOfLines={1}>
          {kicker.toUpperCase()}
        </Text>
        <Text variant="bodyMedium" numberOfLines={2}>
          {event.title}
        </Text>
        {(showClient && event.client_name) || event.location_name ? (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {[showClient ? event.client_name : null, event.location_name].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
      {onPress ? <Icon name="chevron-right" size={16} color={colors.textTertiary} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${kicker}, ${event.title}, ${formatTime(event.starts_at)}`} onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  time: { width: 42, alignItems: 'flex-end' },
  tabular: { fontVariant: ['tabular-nums'] },
  bar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  icon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 1 },
});
