import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { Card, Icon, Text, type IconName } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatCompact, formatNumber } from '@/features/reports/api';
import { useNav } from '@/lib/routes';
import type { ClientMembership } from '@/types/app';
import { fetchClientResults, signed } from '../api';
import { resultItems } from '../ResultsOverviewScreen';

/** Akkaunt → NATIJALAR: four simple doors instead of one crowded dashboard. */
export function ResultsDoors({ client }: { client: ClientMembership }) {
  const nav = useNav();
  const perms = client.permissions;
  const doors: { key: string; icon: IconName; title: string; hint: string; path: string }[] = [
    { key: 'overall', icon: 'award', title: 'Umumiy natija', hint: 'Bu oy nima qilindi', path: '/results' },
    { key: 'instagram', icon: 'instagram', title: 'Instagram', hint: 'Obunachi, ko‘rish, qamrov', path: '/results/instagram' },
  ];
  if (perms.includes('client.crm.view')) doors.push({ key: 'leads', icon: 'users', title: 'Lidlar', hint: 'Reklamadan kelganlar', path: '/crm' });
  if (perms.includes('client.reports.view') || perms.includes('client.crm.view')) {
    doors.push({ key: 'reports', icon: 'file-text', title: 'Hisobotlar', hint: 'Oylik va lidlar', path: '/results/reports' });
  }
  return (
    <View style={styles.grid}>
      {doors.map((d) => (
        <Door key={d.key} icon={d.icon} title={d.title} hint={d.hint} onPress={() => nav.go(d.path)} />
      ))}
    </View>
  );
}

function Door({ icon, title, hint, onPress }: { icon: IconName; title: string; hint: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.door} onPress={onPress} accessibilityLabel={`${title}: ${hint}`}>
      <View style={[styles.doorIcon, { backgroundColor: colors.accentSoft }]}>
        <Icon name={icon} size={18} color={colors.accent} />
      </View>
      <Text variant="subheading">{title}</Text>
      <Text variant="caption" tone="secondary" numberOfLines={2}>
        {hint}
      </Text>
    </Card>
  );
}

/** Home: one short "Bu oyning natijasi" card; the details live under Akkaunt → Natijalar. */
export function MonthResultCard({ client }: { client: ClientMembership }) {
  const nav = useNav();
  const results = useQuery({ queryKey: ['results', 'month', client.id, 'current'], queryFn: () => fetchClientResults(client.id) });
  const r = results.data;
  if (!r) return null;
  const ig = r.instagram;
  const headline = [
    ig?.views != null ? `${formatCompact(ig.views)} ko‘rish` : null,
    ig?.followers_growth != null ? `${signed(formatCompact(ig.followers_growth), ig.followers_growth)} obunachi` : null,
    r.leads ? `${formatNumber(r.leads.delivered)} lid` : null,
  ].filter(Boolean);
  const items = resultItems(r);
  if (items.length === 0) return null;
  return (
    <Card onPress={() => nav.go('/results')} style={styles.month} accessibilityLabel="Bu oyning natijasi">
      <View style={styles.monthTop}>
        <Text variant="label" tone="tertiary">
          Bu oyning natijasi
        </Text>
        <Text variant="captionMedium" tone="accent">
          Batafsil →
        </Text>
      </View>
      <Text variant="heading">{headline.length > 0 ? headline.join(' · ') : items.slice(0, 3).map((i) => `${i.value} ${i.label}`).join(' · ')}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  door: { width: '47.5%', flexGrow: 1, gap: spacing.xs },
  doorIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  month: { gap: spacing.xs },
  monthTop: { flexDirection: 'row', justifyContent: 'space-between' },
});
