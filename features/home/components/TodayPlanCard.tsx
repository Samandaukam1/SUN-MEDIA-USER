import { StyleSheet, View } from 'react-native';

import { Badge, Card, Text , KeyValue as InfoRow } from '@/components/ui';
import { contentFormat, SHOOTING_STATUS } from '@/constants/labels';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatTime } from '@/lib/time';
import type { TodayContent, TodayShooting } from '../api';

const names = (people: { person: { full_name: string } | null }[]) =>
  people.map((p) => p.person?.full_name).filter(Boolean).join(', ') || null;

/** One shooting of the day with everything the client needs to know about it. */
export function TodayPlanCard({ shooting, contents, onPress }: { shooting: TodayShooting; contents: TodayContent[]; onPress?: () => void }) {
  const { colors } = useTheme();
  const status = SHOOTING_STATUS[shooting.status];
  const primary = contents[0];
  const publication = primary?.publications.find((p) => p.status !== 'cancelled') ?? null;
  const editors = contents.flatMap((c) => c.team.filter((t) => t.role === 'editor'));
  const operators = shooting.crew.filter((c) => c.role === 'operator');

  return (
    <Card onPress={onPress} accessibilityLabel={`${formatTime(shooting.starts_at)} ${shooting.title}`}>
      <View style={styles.header}>
        <View style={[styles.time, { backgroundColor: colors.brand }]}>
          <Text variant="heading" style={{ color: colors.onBrand }}>
            {formatTime(shooting.starts_at)}
          </Text>
        </View>
        <View style={styles.headerText}>
          <View style={styles.labelRow}>
            <Text variant="label" tone="tertiary">
              Syomka
            </Text>
            <Badge label={status.label} tone={status.tone} />
          </View>
          <Text variant="heading" numberOfLines={2}>
            {shooting.title}
          </Text>
        </View>
      </View>
      <View style={styles.rows}>
        <InfoRow icon="map-pin" label="Lokatsiya" value={shooting.location_name ?? shooting.location_address} />
        <InfoRow icon="film" label="Video" value={contents.map((c) => `“${c.title}”`).join('\n') || null} />
        <InfoRow icon="maximize" label="Format" value={primary ? contentFormat(primary.content_type, publication?.platform) : null} />
        <InfoRow icon="video" label="Operator" value={names(operators)} />
        <InfoRow icon="scissors" label="Montaj" value={names(editors)} />
        <InfoRow icon="clock" label="Tayyor bo‘ladi" value={primary?.due_at ? formatTime(primary.due_at) : null} />
        <InfoRow icon="send" label="Nashr" value={publication?.scheduled_at ? formatTime(publication.scheduled_at) : null} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  time: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerText: { flex: 1, gap: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rows: { gap: spacing.sm + 2, marginTop: spacing.lg },
});
