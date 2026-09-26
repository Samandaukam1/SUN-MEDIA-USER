import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, EmptyState, Icon, ProgressBar, QueryView, Screen, Section, Sheet, Text, TextArea, useToast } from '@/components/ui';
import { CONTENT_TYPE, PLATFORM } from '@/constants/labels';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { formatShortDateTime } from '@/lib/time';
import type { Database } from '@/types/database';
import { deltaPercent, deltaPoints, fetchReport, formatNumber, generateReport, publishReport, saveHighlights, unpublishReport, type Report, type ReportMetric } from './api';
import { ReportPdfButton } from './ReportPdf';

type Enums = Database['public']['Enums'];

const SECTIONS: { key: ReportMetric['section']; title: string }[] = [
  { key: 'delivery', title: 'Reja bajarilishi' },
  { key: 'social', title: 'Ijtimoiy tarmoqlar' },
  { key: 'production', title: 'Ishlab chiqarish' },
  { key: 'approvals', title: 'Tasdiqlash' },
  { key: 'calendar', title: 'Kontent reja' },
  { key: 'internal', title: 'Ichki ko‘rsatkichlar' },
];

export function formatMetric(m: Pick<ReportMetric, 'value' | 'unit' | 'key'>): string {
  if (m.value == null) return '—';
  if (m.unit === 'daqiqa') {
    const h = Math.floor(m.value / 60);
    const min = Math.round(m.value % 60);
    return h ? `${h} soat${min ? ` ${min} daq` : ''}` : `${min} daq`;
  }
  if (m.unit === '%') return `${formatNumber(m.value)}%`;
  return m.unit && !['ta', 'dona'].includes(m.unit) ? `${formatNumber(m.value)} ${m.unit}` : formatNumber(m.value);
}

/** One monthly report: plan vs delivery, social growth, top content, production and approvals. */
export function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({ queryKey: ['reports', 'detail', id], queryFn: () => fetchReport(id), enabled: !!id });
  return (
    <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <Stack.Screen options={{ title: query.data?.month_label ?? 'Hisobot' }} />
      <QueryView query={query}>
        {(report) => (report ? <ReportBody report={report} /> : <EmptyState icon="bar-chart-2" title="Hisobot topilmadi" description="U hali nashr qilinmagan yoki sizga ko‘rinmaydi." />)}
      </QueryView>
    </Screen>
  );
}

function ReportBody({ report }: { report: Report }) {
  const { can, appInterface } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const manage = appInterface !== 'client' && can('reports.manage');
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['reports'] });

  const regenerate = useMutation({
    mutationFn: () => generateReport(report.client.id, report.period_month),
    onSuccess: () => {
      toast.show('Hisobot qayta hisoblandi');
      refresh();
    },
    onError: toast.error,
  });
  const publish = useMutation({
    mutationFn: () => (report.status === 'published' ? unpublishReport(report.id) : publishReport(report.id)),
    onSuccess: () => {
      toast.show(report.status === 'published' ? 'Qoralamaga qaytarildi' : 'Hisobot mijozga yuborildi');
      refresh();
    },
    onError: toast.error,
  });

  const topContents = report.top_contents.length ? (
    <Section title="Eng yaxshi kontentlar">
      <Card padded={false}>
        {report.top_contents.map((t, i) => (
          <Pressable
            key={t.rank}
            accessibilityRole={t.post_url ? 'link' : undefined}
            disabled={!t.post_url}
            onPress={() => t.post_url && WebBrowser.openBrowserAsync(t.post_url)}
            style={[styles.top, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
          >
            <Text variant="metricSmall" tone={i === 0 ? 'accent' : 'tertiary'} style={styles.rank}>
              {t.rank}
            </Text>
            <View style={styles.flex}>
              <Text variant="bodyMedium" numberOfLines={2}>
                {t.title}
              </Text>
              <Text variant="caption" tone="secondary">
                {[
                  t.content_type ? CONTENT_TYPE[t.content_type as Enums['content_type']]?.label : null,
                  t.platform ? PLATFORM[t.platform as Enums['social_platform']]?.label : null,
                  `${formatNumber(t.views)} ko‘rish`,
                  t.likes != null ? `${formatNumber(t.likes)} layk` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            {t.post_url ? <Icon name="external-link" size={16} color={colors.textTertiary} /> : null}
          </Pressable>
        ))}
      </Card>
    </Section>
  ) : null;

  const bySection = (key: ReportMetric['section']) => report.metrics.filter((m) => m.section === key && (m.value != null || m.target != null));
  const completion = report.metrics.find((m) => m.key === 'calendar.completion_rate');
  const delivered = bySection('delivery').filter((m) => m.target != null);
  const deliveredTotal = delivered.reduce((s, m) => s + (m.value ?? 0), 0);
  const plannedTotal = delivered.reduce((s, m) => s + (m.target ?? 0), 0);

  return (
    <>
      <Card variant="hero" style={styles.hero}>
        <View style={styles.row}>
          <Text variant="label" tone="heroSecondary" style={styles.flex}>
            {`${report.client.name}${report.plan_name ? ` · ${report.plan_name}` : ''}`}
          </Text>
          {manage ? <Badge label={report.status === 'published' ? 'Nashr qilingan' : 'Qoralama'} tone={report.status === 'published' ? 'success' : 'warning'} /> : null}
        </View>
        <Text variant="display" tone="hero">
          {report.month_label}
        </Text>
        <View style={styles.heroNumbers}>
          <View style={styles.flex}>
            <Text variant="metric" tone="hero">
              {completion?.value != null ? `${formatNumber(completion.value)}%` : '—'}
            </Text>
            <Text variant="caption" tone="heroSecondary">
              Kontent reja bajarilishi
            </Text>
          </View>
          <View style={styles.flex}>
            <Text variant="metric" tone="hero">
              {plannedTotal ? `${deliveredTotal}/${plannedTotal}` : formatNumber(deliveredTotal)}
            </Text>
            <Text variant="caption" tone="heroSecondary">
              Tarif bo‘yicha yetkazildi
            </Text>
          </View>
        </View>
        {completion?.value != null ? <ProgressBar value={completion.value / 100} tone="brand" height={6} label="Reja bajarilishi" /> : null}
      </Card>

      <View style={styles.actions}>
        <ReportPdfButton report={report} />
        {manage ? (
          <Button
            title={report.status === 'published' ? 'Qoralamaga qaytarish' : 'Mijozga nashr qilish'}
            icon={report.status === 'published' ? 'rotate-ccw' : 'send'}
            variant={report.status === 'published' ? 'secondary' : 'primary'}
            size="md"
            fullWidth={false}
            style={styles.flex}
            loading={publish.isPending}
            onPress={() =>
              Alert.alert(
                report.status === 'published' ? 'Qoralamaga qaytarilsinmi?' : 'Mijozga nashr qilinsinmi?',
                report.status === 'published' ? 'Mijoz hisobotni ko‘rmay qoladi.' : 'Mijoz bildirishnoma oladi va hisobotni ko‘radi.',
                [
                  { text: 'Bekor qilish', style: 'cancel' },
                  { text: 'Ha', onPress: () => publish.mutate() },
                ],
              )
            }
          />
        ) : null}
      </View>

      <Section title="Oy yutuqlari" actionLabel={manage ? 'Tahrirlash' : undefined} onAction={manage ? () => setEditing(true) : undefined}>
        <Card>
          <Text variant="body" tone={report.highlights ? 'primary' : 'tertiary'}>
            {report.highlights ?? (manage ? 'Account manager oy yutuqlarini shu yerga yozadi.' : 'Izoh qo‘shilmagan.')}
          </Text>
        </Card>
      </Section>

      {SECTIONS.map((s) => {
        const items = bySection(s.key);
        // Best posts read right after the social numbers, before production details.
        const lead = s.key === 'production' ? topContents : null;
        if (!items.length) return lead ? <View key={s.key}>{lead}</View> : null;
        if (s.key === 'delivery') return <DeliverySection key={s.key} title={s.title} items={items} />;
        return (
          <View key={s.key} style={styles.sectionWrap}>
            {lead}
            <Section title={s.title}>
              <View style={styles.grid}>
                {items.map((m) => (
                  <MetricTile key={m.key} m={m} />
                ))}
              </View>
            </Section>
          </View>
        );
      })}

      {manage ? (
        <Card variant="sunken" style={styles.meta}>
          <Text variant="caption" tone="secondary">
            {`Hisoblandi: ${report.generated_at ? formatShortDateTime(report.generated_at) : '—'}${report.published_at ? ` · nashr: ${formatShortDateTime(report.published_at)}` : ''}`}
          </Text>
          <Text variant="caption" tone="tertiary">
            Raqamlar bazadagi haqiqiy ma’lumotdan olinadi. Statistika kiritilgandan keyin hisobotni qayta hisoblang.
          </Text>
          {report.status === 'draft' ? (
            <Button title="Qayta hisoblash" icon="refresh-cw" variant="secondary" size="md" loading={regenerate.isPending} onPress={() => regenerate.mutate()} />
          ) : null}
        </Card>
      ) : null}

      <HighlightsSheet report={report} visible={editing} onClose={() => setEditing(false)} onSaved={refresh} />
    </>
  );
}

function DeliverySection({ title, items }: { title: string; items: ReportMetric[] }) {
  return (
    <Section title={title}>
      <Card style={styles.delivery}>
        {items.map((m) => {
          const over = m.target != null && (m.value ?? 0) > m.target;
          return (
            <View key={m.key} style={styles.deliveryRow}>
              <View style={styles.row}>
                <Text variant="bodyMedium" style={styles.flex}>
                  {m.label}
                </Text>
                <Text variant="bodyMedium" style={styles.num}>
                  {formatNumber(m.value)}
                  {m.target != null ? <Text variant="caption" tone="tertiary">{` / ${formatNumber(m.target)} ${m.unit ?? ''}`}</Text> : null}
                </Text>
              </View>
              {m.target ? <ProgressBar value={(m.value ?? 0) / m.target} tone={over ? 'success' : 'accent'} label={`${m.label}: ${m.value} / ${m.target}`} /> : null}
            </View>
          );
        })}
      </Card>
    </Section>
  );
}

function MetricTile({ m }: { m: ReportMetric }) {
  const { colors } = useTheme();
  const points = m.unit === '%';
  const delta = points ? deltaPoints(m.value, m.previous) : deltaPercent(m.value, m.previous);
  return (
    <Card style={styles.tile}>
      <Text variant="caption" tone="secondary" numberOfLines={2}>
        {m.label}
      </Text>
      <Text variant="metricSmall">{formatMetric(m)}</Text>
      {delta != null ? (
        <View style={styles.row}>
          <Icon name={delta >= 0 ? 'trending-up' : 'trending-down'} size={13} color={delta >= 0 ? colors.success : colors.danger} />
          <Text variant="micro" tone={delta >= 0 ? 'success' : 'danger'}>
            {`${delta >= 0 ? '+' : ''}${points ? `${formatNumber(delta)} p.p.` : `${delta}%`} o‘tgan oyga`}
          </Text>
        </View>
      ) : m.target != null ? (
        <Text variant="micro" tone="tertiary">{`maqsad ${formatNumber(m.target)}${m.unit === '%' ? '%' : ''}`}</Text>
      ) : null}
    </Card>
  );
}

function HighlightsSheet({ report, visible, onClose, onSaved }: { report: Report; visible: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [text, setText] = useState(report.highlights ?? '');
  const save = useMutation({
    mutationFn: () => saveHighlights(report.id, text),
    onSuccess: () => {
      toast.show('Saqlandi');
      onSaved();
      onClose();
    },
    onError: toast.error,
  });
  return (
    <Sheet visible={visible} onClose={onClose} title="Oy yutuqlari" actionLabel="Saqlash" actionDisabled={save.isPending} onAction={() => save.mutate()}>
      <TextArea
        label="Mijozga ko‘rinadi"
        value={text}
        onChangeText={setText}
        maxLength={5000}
        minHeight={200}
        placeholder="Masalan: Reels qamrovi 40% o‘sdi, yangi menyu kampaniyasi 120 000 ko‘rish oldi…"
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  hero: { gap: spacing.sm },
  heroNumbers: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  sectionWrap: { gap: spacing.xl },
  tile: { width: '47%', flexGrow: 1, gap: 4, borderRadius: radius.lg },
  delivery: { gap: spacing.lg },
  deliveryRow: { gap: 6 },
  num: { fontVariant: ['tabular-nums'] },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  rank: { width: 24, textAlign: 'center' },
  meta: { gap: spacing.sm },
});
