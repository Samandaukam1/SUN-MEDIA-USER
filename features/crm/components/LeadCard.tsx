import { Linking, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Icon, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatShortDateTime } from '@/lib/time';
import { platformLabel } from '../api';

type Props = {
  name: string | null;
  phone: string | null;
  email?: string | null;
  client?: string | null;
  campaign?: string | null;
  ad?: string | null;
  platform?: string | null;
  leadAt: string;
  failed?: boolean;
  onOpen?: () => void;
  onDeliver?: () => void;
  delivering?: boolean;
  deliveredAt?: string | null;
};

/** One lead: who, how to reach them, which client and ad, when — with the two actions an admin needs. */
export function LeadCard({ name, phone, email, client, campaign, ad, platform, leadAt, failed, onOpen, onDeliver, delivering, deliveredAt }: Props) {
  const { colors } = useTheme();
  const source = [campaign, ad].filter(Boolean).join(' · ');
  return (
    // Not pressable itself: the phone number and the buttons are the actions (no nested buttons on web).
    <Card style={styles.card} accessibilityLabel={`${name ?? 'Ism yo‘q'}, ${phone ?? ''}`}>
      <View style={styles.top}>
        <View style={styles.who}>
          <Text variant="subheading" numberOfLines={1}>
            {name || 'Ism ko‘rsatilmagan'}
          </Text>
          {phone ? (
            <Text
              variant="bodyMedium"
              tone="accent"
              onPress={() => Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch(() => undefined)}
              accessibilityRole="link"
              accessibilityLabel={`Qo‘ng‘iroq qilish: ${phone}`}
            >
              {phone}
            </Text>
          ) : email ? (
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {email}
            </Text>
          ) : null}
        </View>
        <Text variant="caption" tone="tertiary">
          {formatShortDateTime(leadAt)}
        </Text>
      </View>
      <View style={styles.meta}>
        {client ? <Badge label={client} tone="accent" /> : null}
        {platformLabel(platform) ? <Badge label={platformLabel(platform)!} /> : null}
        {failed ? <Badge label="Ma’lumot olinmadi" tone="danger" icon="alert-triangle" /> : null}
        {deliveredAt ? <Badge label={`Yuborildi ${formatShortDateTime(deliveredAt)}`} tone="success" icon="check" /> : null}
      </View>
      {source ? (
        <View style={styles.source}>
          <Icon name="target" size={13} color={colors.textTertiary} />
          <Text variant="caption" tone="secondary" numberOfLines={2} style={styles.sourceText}>
            {source}
          </Text>
        </View>
      ) : null}
      {onDeliver || onOpen ? (
        <View style={styles.actions}>
          {onDeliver ? <Button title="Yuborish" icon="send" size="md" fullWidth={false} style={styles.action} loading={delivering} onPress={onDeliver} /> : null}
          {onOpen ? <Button title="Batafsil" variant="secondary" size="md" fullWidth={false} style={styles.action} onPress={onOpen} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  who: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  source: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sourceText: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  action: { flex: 1 },
});
