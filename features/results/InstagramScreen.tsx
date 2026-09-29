import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Badge, Card, Chip, ChipRow, EmptyState, Icon, QueryView, Screen, Section, SegmentedControl, SkeletonCards, Stat, StatGrid, Text, TrendBars } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { deltaPercent, formatCompact, formatNumber } from '@/features/reports/api';
import { useTheme } from '@/hooks/useTheme';
import { formatDateKey, formatShortDateTime } from '@/lib/time';
import { fetchInstagramSummary, fetchTopMedia, signed, type InstagramDays, type InstagramSummary, type TopMedia } from './api';
import { useResultsClients } from './ResultsOverviewScreen';

const PRODUCT: Record<string, string> = { REELS: 'Reels', FEED: 'Post', STORY: 'Story' };

/** Akkaunt → Natijalar → Instagram: real numbers from the connected account, with history kept by SUN MEDIA. */
export function InstagramScreen() {
  const clients = useResultsClients();
  const [clientId, setClientId] = useState(clients[0]?.id);
  const client = clients.find((c) => c.id === clientId) ?? clients[0];
  const [days, setDays] = useState<InstagramDays>(30);
  const summary = useQuery({ queryKey: ['results', 'instagram', client?.id, days], queryFn: () => fetchInstagramSummary(client!.id, days), enabled: !!client });
  const top = useQuery({ queryKey: ['results', 'top-media', client?.id, days], queryFn: () => fetchTopMedia(client!.id, days, 10), enabled: !!client && !!summary.data });

  return (
    <Screen edges={[]} refreshing={summary.isRefetching} onRefresh={() => Promise.all([summary.refetch(), top.refetch()])}>
      <Stack.Screen options={{ title: 'Instagram' }} />
      {clients.length > 1 ? (
        <ChipRow>
          {clients.map((c) => (
            <Chip key={c.id} label={c.name} selected={c.id === client?.id} onPress={() => setClientId(c.id)} />
          ))}
        </ChipRow>
      ) : null}
      <SegmentedControl<'7' | '30' | '90'>
        options={[
          { value: '7', label: '7 kun' },
          { value: '30', label: '30 kun' },
          { value: '90', label: '3 oy' },
        ]}
        value={String(days) as '7' | '30' | '90'}
        onChange={(v) => setDays(Number(v) as InstagramDays)}
      />
      <QueryView
        query={summary}
        skeleton={<SkeletonCards count={3} />}
        isEmpty={(d) => d === null}
        empty={{ icon: 'instagram', title: 'Instagram hali ulanmagan', description: 'SUN MEDIA Instagram hisobingizni ulaganidan keyin statistika shu yerda har kuni yangilanadi.' }}
      >
        {(s) => (s ? <Summary s={s} top={top.data} topLoading={top.isPending} /> : null)}
      </QueryView>
    </Screen>
  );
}

function change(current: number | null | undefined, previous: number | null | undefined): string | undefined {
  const pct = deltaPercent(current ?? null, previous ?? null);
  if (pct == null) return undefined;
  return `${pct > 0 ? '+' : ''}${pct}% oldingi davrga nisbatan`;
}

function Summary({ s, top, topLoading }: { s: InstagramSummary; top: TopMedia[] | undefined; topLoading: boolean }) {
  const { colors } = useTheme();
  const c = s.current;
  const noData = c.days_with_data === 0 && s.followers == null;
  return (
    <>
      <View style={styles.account}>
        <Icon name="instagram" size={16} color={colors.textSecondary} />
        <Text variant="bodyMedium" onPress={s.account.url ? () => Linking.openURL(s.account.url!).catch(() => undefined) : undefined}>
          @{s.account.handle}
        </Text>
        {!s.connected || s.account.sync_error ? <Badge label="Yangilanmayapti" tone="warning" /> : null}
        <Text variant="caption" tone="tertiary" style={styles.synced}>
          {s.account.last_synced_at ? `Yangilandi: ${formatShortDateTime(s.account.last_synced_at)}` : 'Birinchi yangilanish kutilmoqda'}
        </Text>
      </View>

      {noData ? (
        <EmptyState icon="clock" title="Statistika yig‘ilmoqda" description="Instagram ulandi. Birinchi raqamlar keyingi yangilanishda (har kuni ertalab) paydo bo‘ladi." />
      ) : (
        <>
          <StatGrid>
            <Stat icon="users" label="Obunachilar" value={formatCompact(s.followers)} detail={s.followers_growth != null ? `${signed(formatNumber(s.followers_growth), s.followers_growth)}${s.growth_since && s.growth_since > (s.daily[0]?.date ?? '') ? ` (${formatDateKey(s.growth_since)} dan)` : ''}` : 'O‘sish tarixi yig‘ilmoqda'} />
            <Stat icon="eye" label="Ko‘rishlar" value={formatCompact(c.views)} detail={change(c.views, s.previous?.views)} />
            <Stat icon="radio" label="Qamrov" value={formatCompact(s.reach)} detail={s.reach == null ? (s.days === 90 ? '3 oylik qamrovni Meta bermaydi' : undefined) : 'Noyob akkauntlar'} />
            <Stat icon="heart" label="Faollik" value={formatCompact(c.interactions)} detail={change(c.interactions, s.previous?.interactions)} />
          </StatGrid>

          {s.daily.some((d) => d.views != null) ? (
            <Section title="Kunlik ko‘rishlar">
              <Card>
                <TrendBars
                  accessibilityLabel="Kunlik ko‘rishlar grafigi"
                  points={s.daily.map((d) => ({ key: d.date, value: d.views, label: formatDateKey(d.date) }))}
                />
              </Card>
            </Section>
          ) : null}

          <Section title="Batafsil">
            <Card padded={false}>
              <Detail icon="thumbs-up" label="Layklar" value={c.likes} />
              <Detail icon="message-circle" label="Izohlar" value={c.comments} />
              <Detail icon="share-2" label="Ulashishlar" value={c.shares} />
              <Detail icon="bookmark" label="Saqlashlar" value={c.saves} />
              <Detail icon="external-link" label="Profil havolalari bosildi" value={c.profile_links_taps} />
            </Card>
            {s.history_from ? (
              <Text variant="caption" tone="tertiary">
                {`Tarix ${formatDateKey(s.history_from, true)} dan saqlanmoqda.`}
              </Text>
            ) : null}
          </Section>
        </>
      )}

      <Section title="Eng yaxshi kontentlar">
        {topLoading ? (
          <SkeletonCards count={2} />
        ) : top && top.length > 0 ? (
          top.map((m, i) => <MediaCard key={m.id} media={m} rank={i + 1} />)
        ) : (
          <Text variant="caption" tone="tertiary">
            Bu davrda joylangan post topilmadi.
          </Text>
        )}
      </Section>
    </>
  );
}

function Detail({ icon, label, value }: { icon: 'thumbs-up' | 'message-circle' | 'share-2' | 'bookmark' | 'external-link'; label: string; value: number | null }) {
  const { colors } = useTheme();
  if (value == null) return null;
  return (
    <View style={[styles.detail, { borderTopColor: colors.border }]}>
      <Icon name={icon} size={16} color={colors.textSecondary} />
      <Text variant="body" style={styles.flex}>
        {label}
      </Text>
      <Text variant="bodyMedium">{formatNumber(value)}</Text>
    </View>
  );
}

function MediaCard({ media, rank }: { media: TopMedia; rank: number }) {
  const { colors } = useTheme();
  const stats = [
    media.views != null ? `${formatCompact(media.views)} ko‘rish` : null,
    media.reach != null ? `${formatCompact(media.reach)} qamrov` : null,
    media.likes != null ? `${formatCompact(media.likes)} layk` : null,
    media.comments != null ? `${formatNumber(media.comments)} izoh` : null,
    media.shares != null ? `${formatNumber(media.shares)} ulashish` : null,
    media.saves != null ? `${formatNumber(media.saves)} saqlash` : null,
  ].filter(Boolean);
  return (
    <Card onPress={media.permalink ? () => Linking.openURL(media.permalink!).catch(() => undefined) : undefined} style={styles.media} accessibilityLabel={`${rank}-o‘rin: ${stats.join(', ')}`}>
      <View style={[styles.thumb, { backgroundColor: colors.surfaceSunken }]}>
        {media.thumbnail_url ? <Image source={{ uri: media.thumbnail_url }} style={styles.thumbImage} contentFit="cover" transition={150} /> : <Icon name="image" size={20} color={colors.textTertiary} />}
      </View>
      <View style={styles.mediaText}>
        <View style={styles.mediaTop}>
          <Text variant="label" tone="tertiary">{`#${rank} · ${PRODUCT[media.product_type ?? ''] ?? 'Post'}`}</Text>
          {media.posted_at ? (
            <Text variant="micro" tone="tertiary">
              {formatShortDateTime(media.posted_at)}
            </Text>
          ) : null}
        </View>
        <Text variant="captionMedium" numberOfLines={2}>
          {media.content_title || media.caption || 'Izohsiz post'}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={2}>
          {stats.join(' · ') || 'Statistika hali yo‘q'}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  account: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  synced: { marginLeft: 'auto' },
  detail: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1 },
  media: { flexDirection: 'row', gap: spacing.md },
  thumb: { width: 64, height: 80, borderRadius: radius.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumbImage: { width: '100%', height: '100%' },
  mediaText: { flex: 1, gap: 4 },
  mediaTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
});
