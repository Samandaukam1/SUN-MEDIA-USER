import { StyleSheet, View } from 'react-native';

import { Badge, Card, Icon, Text } from '@/components/ui';
import { SHOOTING_ATTENDANCE_STATUS, SHOOTING_STATUS, TEAM_ROLE_LABEL } from '@/constants/labels';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatTime } from '@/lib/time';
import type { Database } from '@/types/database';

type Enums = Database['public']['Enums'];

export type ShootingSummary = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  client_name?: string | null;
  location_name?: string | null;
  location_address?: string | null;
  members: { user_id: string; full_name: string; role?: string | null; attendance?: string | null }[];
};

/** Shooting at a glance: time block, client, place and who is on the crew (with attendance). */
export function ShootingCard({ shooting, onPress }: { shooting: ShootingSummary; onPress?: () => void }) {
  const { colors } = useTheme();
  const status = SHOOTING_STATUS[shooting.status as Enums['shooting_status']];
  return (
    <Card onPress={onPress} accessibilityLabel={`${formatTime(shooting.starts_at)} ${shooting.client_name ?? ''} syomkasi`}>
      <View style={styles.row}>
        <View style={[styles.time, { backgroundColor: colors.surfaceSunken }]}>
          <Text variant="heading">{formatTime(shooting.starts_at)}</Text>
          <Text variant="micro" tone="tertiary">
            {formatTime(shooting.ends_at)} gacha
          </Text>
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text variant="label" tone="tertiary" numberOfLines={1} style={styles.flex}>
              {shooting.client_name ?? 'Syomka'}
            </Text>
            {status ? <Badge label={status.label} tone={status.tone} /> : null}
          </View>
          <Text variant="subheading" numberOfLines={2}>
            {shooting.title}
          </Text>
          {shooting.location_name || shooting.location_address ? (
            <View style={styles.meta}>
              <Icon name="map-pin" size={13} color={colors.textTertiary} />
              <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.flex}>
                {[shooting.location_name, shooting.location_address].filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      {shooting.members.length > 0 ? (
        <View style={styles.crew}>
          {shooting.members.map((m) => {
            const att = m.attendance ? SHOOTING_ATTENDANCE_STATUS[m.attendance as Enums['shooting_attendance_status']] : null;
            return (
              <Badge
                key={m.user_id}
                label={`${m.full_name}${m.role ? ` · ${TEAM_ROLE_LABEL[m.role as Enums['team_role']] ?? m.role}` : ''}${att && m.attendance !== 'pending' ? ` · ${att.label}` : ''}`}
                tone={att && m.attendance !== 'pending' ? att.tone : 'neutral'}
                icon={att?.icon}
              />
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  time: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center', minWidth: 72 },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  crew: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, marginTop: spacing.md },
});
