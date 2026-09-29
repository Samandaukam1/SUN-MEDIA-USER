import { StyleSheet, View } from 'react-native';

import { BreakdownBars, Card, Section, Stat, StatGrid, Text, TrendBars } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { formatNumber } from '@/features/reports/api';
import { formatDateKey } from '@/lib/time';
import type { CrmReportData } from '../api';

/** The CRM report as both the admin (preview) and the client (received) see it. */
export function CrmReportView({ data }: { data: CrmReportData }) {
  const best = data.by_campaign[0];
  return (
    <>
      <StatGrid>
        <Stat icon="users" label="Jami lid" value={formatNumber(data.total)} detail={`${formatDateKey(data.period_start)} – ${formatDateKey(data.period_end, true)}`} />
        <Stat icon="trending-up" label="Kunlik o‘rtacha" value={formatNumber(data.daily_average)} detail={`${data.days} kun`} />
        <Stat icon="send" label="Yuborilgan" value={formatNumber(data.delivered)} tone="success" />
        <Stat icon="clock" label="Yuborilmagan" value={formatNumber(data.pending)} tone={data.pending ? 'warning' : 'primary'} />
      </StatGrid>

      {data.total > 0 ? (
        <>
          <Section title="Kunlar bo‘yicha">
            <Card>
              <TrendBars
                accessibilityLabel={`Kunlik lidlar, eng ko‘pi ${Math.max(...data.daily.map((d) => d.count))}`}
                points={data.daily.map((d) => ({ key: d.date, value: d.count, label: formatDateKey(d.date) }))}
              />
            </Card>
          </Section>

          {data.weekly.length > 1 ? (
            <Section title="Haftalar bo‘yicha">
              <Card>
                <BreakdownBars rows={data.weekly.map((w) => ({ name: `${formatDateKey(w.week_start)} haftasi`, value: w.count }))} format={formatNumber} />
              </Card>
            </Section>
          ) : null}

          <Section title="Kampaniyalar">
            <Card style={styles.gap}>
              {best ? (
                <Text variant="caption" tone="secondary">
                  Eng ko‘p lid: <Text variant="captionMedium">{best.name}</Text> ({formatNumber(best.count)})
                </Text>
              ) : null}
              <BreakdownBars rows={data.by_campaign.map((c) => ({ name: c.name, value: c.count }))} format={formatNumber} />
            </Card>
          </Section>

          {data.top_ads.length > 0 ? (
            <Section title="Eng yaxshi reklamalar">
              <Card>
                <BreakdownBars rows={data.top_ads.map((a) => ({ name: a.name, value: a.count, detail: a.campaign }))} format={formatNumber} />
              </Card>
            </Section>
          ) : null}
        </>
      ) : (
        <View style={styles.empty}>
          <Text variant="caption" tone="tertiary">
            Bu davrda lid kelmagan.
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  empty: { paddingVertical: spacing.md },
});
