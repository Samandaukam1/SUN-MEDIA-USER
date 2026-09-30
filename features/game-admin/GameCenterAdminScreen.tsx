import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, EmptyState, ListGroup, QueryView, Screen, Section, SegmentedControl, SkeletonCards, Text, ToggleRow, useToast } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatPrice } from '@/features/pro/api';
import { formatSunCoin, SunCoin } from '@/features/sun-coin';
import { useTheme } from '@/hooks/useTheme';
import { formatShortDateTime } from '@/lib/time';
import {
  confirmPurchase,
  fetchGameAdmin,
  fetchProCampaigns,
  gameAdminError,
  gameAdminKey,
  rejectPurchase,
  savePack,
  setCampaignStatus,
  setLevel,
  setProCampaignActive,
  type CoinCampaign,
  type CoinPurchase,
  type GameAdminDashboard,
} from './api';
import { CampaignSheet, GiftSheet, PackSheet } from './GameAdminSheets';
import { levelOdds, LEVELS, type LevelKey } from './levels';

function confirm(title: string, message: string, action: string, onConfirm: () => void, destructive = false) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Bekor qilish', style: 'cancel' },
    { text: action, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

const STATUS: Record<CoinCampaign['status'], { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  active: { label: 'Faol', tone: 'success' },
  paused: { label: 'Pauza', tone: 'warning' },
  draft: { label: 'Qoralama', tone: 'neutral' },
  ended: { label: 'Tugagan', tone: 'neutral' },
};

/**
 * Game Center control for SUN MEDIA managers (promo.manage), inside the app: coins in circulation, purchase
 * confirmations, gifts, the game's level, SUN Coin and Pro campaigns and the Coin Shop. Managers do not play;
 * every action is checked again by the server.
 */
export function GameCenterAdminScreen() {
  const { can } = useAuth();
  const allowed = can('promo.manage');
  const dashboard = useQuery({ queryKey: gameAdminKey, queryFn: fetchGameAdmin, enabled: allowed });
  const [sheet, setSheet] = useState<'gift' | 'campaign' | 'pack' | null>(null);

  if (!allowed) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Game Center' }} />
        <EmptyState icon="lock" title="Ruxsat yo‘q" description="Game Center’ni boshqarish uchun promo.manage ruxsati kerak." />
      </Screen>
    );
  }
  return (
    <Screen edges={[]} refreshing={dashboard.isRefetching} onRefresh={() => void dashboard.refetch()}>
      <Stack.Screen options={{ title: 'Game Center' }} />
      <QueryView query={dashboard} skeleton={<SkeletonCards count={3} />}>
        {(data) => <Dashboard data={data} onSheet={setSheet} />}
      </QueryView>
      <GiftSheet visible={sheet === 'gift'} onClose={() => setSheet(null)} />
      <CampaignSheet visible={sheet === 'campaign'} onClose={() => setSheet(null)} hasActive={!!dashboard.data?.campaigns.some((c) => c.status === 'active')} />
      <PackSheet visible={sheet === 'pack'} onClose={() => setSheet(null)} />
    </Screen>
  );
}

function Dashboard({ data, onSheet }: { data: GameAdminDashboard; onSheet: (s: 'gift' | 'campaign' | 'pack') => void }) {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: gameAdminKey });
  const act = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: refresh, onError: (e) => toast.show(gameAdminError(e), 'error') });
  const pending = data.purchaseRequests.filter((r) => r.status === 'pending');
  const level = (data.settings.find((s) => s.gameId === 'safi-penalty')?.difficulty ?? 'easy') as LevelKey;
  const odds = levelOdds(level);
  const a = data.analytics;
  const campaigns = data.campaigns.filter((c) => c.gameId === 'safi-penalty').slice(0, 6);

  return (
    <>
      <Card variant="hero" style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.flex}>
            <Text variant="label" style={{ color: colors.heroTextSecondary }}>MUOMALADAGI SUN COIN</Text>
            <Text variant="display" style={{ color: colors.heroText }}>{formatSunCoin(a.circulating)}</Text>
          </View>
          <SunCoin size={64} />
        </View>
        <View style={styles.metrics}>
          {[
            ['Sovg‘a', a.gifted],
            ['Mukofot', a.rewarded],
            ['Sarflangan', a.spent],
            ['Xarid', a.purchased],
          ].map(([label, value]) => (
            <View key={label as string} style={styles.metric}>
              <Text variant="caption" style={{ color: colors.heroTextSecondary }}>{label as string}</Text>
              <Text variant="subheading" style={{ color: colors.heroText }}>{formatSunCoin(value as number)}</Text>
            </View>
          ))}
        </View>
      </Card>
      <Button title="SUN Coin sovg‘a qilish" icon="gift" onPress={() => onSheet('gift')} />

      <Section title={pending.length ? `Xarid so‘rovlari · ${pending.length}` : 'Xarid so‘rovlari'}>
        {pending.length === 0 ? (
          <Text variant="caption" tone="tertiary">Kutilayotgan so‘rov yo‘q. Mijoz Coin Shop’da paket tanlasa shu yerda chiqadi.</Text>
        ) : (
          pending.map((r) => <PurchaseCard key={r.id} request={r} busy={act.isPending} onConfirm={() =>
            confirm('To‘lovni tasdiqlash', `${r.userName ?? 'Mijoz'}: ${formatSunCoin(r.coins)} · ${formatPrice(r.priceCents, r.currency)}. SUN Coin darhol hisobga tushadi.`, 'Tasdiqlash', () =>
              act.mutate(() => confirmPurchase(r.id)))
          } onReject={() =>
            confirm('So‘rovni rad etish', `${r.userName ?? 'Mijoz'}: ${formatSunCoin(r.coins)}. Mijozga bildirishnoma boradi.`, 'Rad etish', () =>
              act.mutate(() => rejectPurchase(r.id, 'SUN MEDIA to‘lovni tasdiqlamadi.')), true)
          } />)
        )}
      </Section>

      <Section title="O‘yin darajasi · SAFI Penalty">
        <SegmentedControl<LevelKey>
          options={LEVELS.map((l) => ({ value: l.key, label: l.label }))}
          value={level}
          onChange={(v) => act.mutate(() => setLevel(v))}
        />
        <Text variant="caption" tone="secondary">
          {`Gol ≈ ${odds.goal}% · tovuq ushlaydi ≈ ${odds.save}%. Yangi raundlarga qo‘llanadi; o‘ynalayotgan raund o‘z darajasida tugaydi. Sovg‘a ehtimoli kampaniya sozlamalarida alohida.`}
        </Text>
      </Section>

      <Section title="SUN Coin kampaniyalari" actionLabel="Yangi" onAction={() => onSheet('campaign')}>
        {campaigns.length === 0 ? (
          <Text variant="caption" tone="tertiary">Hali kampaniya yo‘q.</Text>
        ) : (
          campaigns.map((c) => <CampaignCard key={c.id} campaign={c} busy={act.isPending} onStatus={(s) => {
            const run = () => act.mutate(() => setCampaignStatus(c.id, s));
            if (s === 'ended') confirm('Kampaniyani tugatish', `${c.title} qayta ishga tushirilmaydi. Tarixi saqlanadi.`, 'Tugatish', run, true);
            else run();
          }} />)
        )}
      </Section>

      <ProCampaigns />

      <Section title="Coin Shop paketlari" actionLabel="Qo‘shish" onAction={() => onSheet('pack')}>
        {data.packs.length === 0 ? (
          <Text variant="caption" tone="tertiary">Paketlar yo‘q — mijozlar “Paketlar hali sozlanmagan” ko‘radi.</Text>
        ) : (
          <View style={styles.stack}>
            {data.packs.map((p) => (
              <ToggleRow
                key={p.id}
                label={`${formatSunCoin(p.coins)} · ${formatPrice(p.priceCents, p.currency)}`}
                description={p.isActive ? 'Coin Shop’da ko‘rinadi' : 'Yashirin'}
                value={p.isActive}
                onChange={(v) => act.mutate(() => savePack({ id: p.id, isActive: v }))}
              />
            ))}
          </View>
        )}
      </Section>
    </>
  );
}

function PurchaseCard({ request, busy, onConfirm, onReject }: { request: CoinPurchase; busy: boolean; onConfirm: () => void; onReject: () => void }) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.flex}>
          <Text variant="bodyMedium">{request.userName ?? 'Mijoz'}</Text>
          <Text variant="caption" tone="secondary">{`${request.clientName ?? ''} · ${formatShortDateTime(request.createdAt)}`}</Text>
        </View>
        <View style={styles.right}>
          <Text variant="subheading">{formatSunCoin(request.coins)}</Text>
          <Text variant="caption" tone="secondary">{formatPrice(request.priceCents, request.currency)}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="To‘lov qabul qilindi" size="md" loading={busy} onPress={onConfirm} style={styles.flex} />
        <Button title="Rad etish" size="md" variant="secondary" disabled={busy} onPress={onReject} />
      </View>
    </Card>
  );
}

function CampaignCard({ campaign: c, busy, onStatus }: { campaign: CoinCampaign; busy: boolean; onStatus: (s: 'active' | 'paused' | 'ended') => void }) {
  const status = STATUS[c.status];
  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <Text variant="bodyMedium" style={styles.flex}>{c.title}</Text>
        <Badge label={status.label} tone={status.tone} dot />
      </View>
      <View style={styles.metricsRow}>
        {[
          ['Pool', c.totalPool],
          ['Tarqatildi', c.distributed],
          ['Qoldi', c.remaining],
        ].map(([label, value]) => (
          <View key={label as string} style={styles.flex}>
            <Text variant="caption" tone="tertiary">{label as string}</Text>
            <Text variant="subheading">{formatSunCoin(value as number)}</Text>
          </View>
        ))}
        <View style={styles.flex}>
          <Text variant="caption" tone="tertiary">G‘oliblar</Text>
          <Text variant="subheading">{c.totalWinners}</Text>
        </View>
      </View>
      <Text variant="caption" tone="secondary">
        {`${c.options.map((o) => `${o.amount} SC × ${o.awarded}${o.quantity == null ? '' : `/${o.quantity}`}`).join(' · ')} · min ${c.minimumScore}/10 gol`}
      </Text>
      {c.status !== 'ended' ? (
        <View style={styles.actions}>
          {c.status === 'active' ? <Button title="Pauza" size="md" variant="secondary" loading={busy} onPress={() => onStatus('paused')} style={styles.flex} /> : null}
          {c.status === 'paused' || c.status === 'draft' ? <Button title={c.status === 'draft' ? 'Boshlash' : 'Davom ettirish'} size="md" loading={busy} onPress={() => onStatus('active')} style={styles.flex} /> : null}
          {c.status !== 'draft' ? <Button title="Tugatish" size="md" variant="danger" disabled={busy} onPress={() => onStatus('ended')} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

/** Pro reward campaigns of the game (their rules are set in the web panel); on / off from here. */
function ProCampaigns() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const pro = useQuery({ queryKey: [...gameAdminKey, 'pro'], queryFn: fetchProCampaigns });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setProCampaignActive(id, active),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [...gameAdminKey, 'pro'] }),
    onError: (e) => toast.show(gameAdminError(e), 'error'),
  });
  const list = (pro.data ?? []).filter((c) => c.template === 'penalty');
  if (!pro.data || list.length === 0) return null;
  return (
    <Section title="Pro sovg‘a kampaniyalari">
      <ListGroup>
        {list.map((c) => (
          <ToggleRow
            key={c.id}
            label={`${c.title}${c.client ? ` · ${c.client.name}` : ''}`}
            description={`${c.reward_days} kun Pro · ${c.target_score}+ gol · berildi ${c.rewards_given}${c.max_rewards_total == null ? '' : `/${c.max_rewards_total}`}`}
            value={c.is_active}
            onChange={(v) => toggle.mutate({ id: c.id, active: v })}
          />
        ))}
      </ListGroup>
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: spacing.sm },
  hero: { gap: spacing.lg },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  metric: { width: '50%', gap: 2 },
  card: { gap: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  right: { alignItems: 'flex-end' },
  metricsRow: { flexDirection: 'row', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
