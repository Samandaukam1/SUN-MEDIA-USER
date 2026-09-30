import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Chip, ChipRow, EmptyState, ListGroup, QueryView, Screen, Section, SkeletonCards, Text, ToggleRow, useToast } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatPrice } from '@/features/pro/api';
import { formatSunCoin, SunCoin } from '@/features/sun-coin';
import { useTheme } from '@/hooks/useTheme';
import { formatShortDateTime } from '@/lib/time';
import {
  confirmPurchase,
  fetchGameAdmin,
  gameAdminError,
  gameAdminKey,
  rejectPurchase,
  ruleDraft,
  savePack,
  setLevel,
  setRewardCampaignStatus,
  updateRewardRules,
  type CoinPurchase,
  type GameAdminDashboard,
  type LevelProfile,
  type RewardCampaign,
} from './api';
import { GiftSheet, PackSheet, RewardRulesSheet } from './GameAdminSheets';
import { LEVELS, percent, rewardText, ruleOdds, type LevelKey } from './levels';

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

const STATUS: Record<RewardCampaign['status'], { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  active: { label: 'ON · Faol', tone: 'success' },
  paused: { label: 'OFF · Pauza', tone: 'warning' },
  draft: { label: 'OFF · Qoralama', tone: 'neutral' },
  ended: { label: 'Tugagan', tone: 'neutral' },
};

type Sheet = { kind: 'gift' } | { kind: 'pack' } | { kind: 'rules'; campaign: RewardCampaign | null };

/**
 * Game Center control for SUN MEDIA managers (promo.manage), inside the app: coins in circulation, purchase
 * confirmations, gifts, the game's hidden level and its balance, reward rules and the Coin Shop. Managers do not
 * play; every action is checked again by the server.
 */
export function GameCenterAdminScreen() {
  const { can } = useAuth();
  const allowed = can('promo.manage');
  const dashboard = useQuery({ queryKey: gameAdminKey, queryFn: fetchGameAdmin, enabled: allowed });
  const [sheet, setSheet] = useState<Sheet | null>(null);

  if (!allowed) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Game Center' }} />
        <EmptyState icon="lock" title="Ruxsat yo‘q" description="Game Center’ni boshqarish uchun promo.manage ruxsati kerak." />
      </Screen>
    );
  }
  const data = dashboard.data;
  const level = (data?.settings.find((s) => s.gameId === 'safi-penalty')?.difficulty ?? 'easy') as LevelKey;
  return (
    <Screen edges={[]} refreshing={dashboard.isRefetching} onRefresh={() => void dashboard.refetch()}>
      <Stack.Screen options={{ title: 'Game Center' }} />
      <QueryView query={dashboard} skeleton={<SkeletonCards count={3} />}>
        {(d) => <Dashboard data={d} onSheet={setSheet} />}
      </QueryView>
      <GiftSheet visible={sheet?.kind === 'gift'} onClose={() => setSheet(null)} />
      <RewardRulesSheet
        visible={sheet?.kind === 'rules'}
        onClose={() => setSheet(null)}
        campaign={sheet?.kind === 'rules' ? sheet.campaign : null}
        hasActive={!!data?.rewardCampaigns.some((c) => c.status === 'active')}
        profile={data?.levels.find((l) => l.key === level)}
      />
      <PackSheet visible={sheet?.kind === 'pack'} onClose={() => setSheet(null)} />
    </Screen>
  );
}

function Dashboard({ data, onSheet }: { data: GameAdminDashboard; onSheet: (s: Sheet) => void }) {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: gameAdminKey });
  const act = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: refresh, onError: (e) => toast.show(gameAdminError(e), 'error') });
  const pending = data.purchaseRequests.filter((r) => r.status === 'pending');
  const level = (data.settings.find((s) => s.gameId === 'safi-penalty')?.difficulty ?? 'easy') as LevelKey;
  const profile = data.levels.find((l) => l.key === level);
  const a = data.analytics;
  const campaigns = data.rewardCampaigns.filter((c) => c.gameId === 'safi-penalty' && c.status !== 'ended');

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
      <Button title="SUN Coin sovg‘a qilish" icon="gift" onPress={() => onSheet({ kind: 'gift' })} />

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

      <Section title="Qiyinlik · SAFI Penalty">
        <ChipRow>
          {LEVELS.map((l) => (
            <Chip key={l.key} label={l.label} selected={l.key === level} onPress={() => { if (l.key !== level) act.mutate(() => setLevel(l.key)); }} />
          ))}
        </ChipRow>
        {profile ? <Balance profile={profile} /> : null}
        <Text variant="caption" tone="tertiary">
          Ichki sozlama: o‘yinchi darajani, chegarani va qoidalarni ko‘rmaydi. Yangi raundlarga qo‘llanadi; o‘ynalayotgan raund o‘z darajasida tugaydi.
        </Text>
      </Section>

      <Section title="Mukofot qoidalari" actionLabel="Yangi" onAction={() => onSheet({ kind: 'rules', campaign: null })}>
        {campaigns.length === 0 ? (
          <Text variant="caption" tone="tertiary">Faol yoki qoralama kampaniya yo‘q — Reward Mode yopiq. “Yangi” orqali qoidalarni yarating.</Text>
        ) : (
          campaigns.map((c) => (
            <RewardCampaignCard
              key={c.id}
              campaign={c}
              profile={profile}
              busy={act.isPending}
              onEdit={() => onSheet({ kind: 'rules', campaign: c })}
              onToggle={(score, enabled) => act.mutate(() => updateRewardRules(c.id, c.rules.filter((r) => r.score === score).map((r) => ({ ...ruleDraft(r), enabled }))))}
              onStatus={(s) => {
                const run = () => act.mutate(() => setRewardCampaignStatus(c.id, s));
                if (s === 'ended') confirm('Kampaniyani tugatish', `${c.title} qayta yoqilmaydi va o‘zgartirilmaydi. Berilgan mukofotlar tarixi saqlanadi.`, 'Tugatish', run, true);
                else run();
              }}
            />
          ))
        )}
        <Text variant="caption" tone="tertiary">
          {`Jami berilgan: ${formatSunCoin(data.rewardSummary.coins)} · ${data.rewardSummary.proDays} kun Pro · ${data.rewardSummary.winners} g‘olib`}
        </Text>
      </Section>

      <Section title="Coin Shop paketlari" actionLabel="Qo‘shish" onAction={() => onSheet({ kind: 'pack' })}>
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

/** The level's target balance: top result, average and how often each score happens (exact server numbers). */
function Balance({ profile }: { profile: LevelProfile }) {
  const { colors } = useTheme();
  const peak = Math.max(...profile.distribution);
  return (
    <Card style={styles.card}>
      <View style={styles.metricsRow}>
        <View style={styles.flex}>
          <Text variant="caption" tone="tertiary">Juda yaxshi natija</Text>
          <Text variant="subheading">{`${profile.top}/10`}</Text>
        </View>
        <View style={styles.flex}>
          <Text variant="caption" tone="tertiary">O‘rtacha</Text>
          <Text variant="subheading">{`${profile.average.toFixed(1)} gol`}</Text>
        </View>
        <View style={styles.flex}>
          <Text variant="caption" tone="tertiary">{`${profile.top}/10 chiqadi`}</Text>
          <Text variant="subheading">{percent(profile.distribution[profile.top] ?? 0)}</Text>
        </View>
      </View>
      <View style={styles.bars} accessibilityLabel="Natijalar taqsimoti">
        {profile.distribution.map((p, score) => (
          <View key={score} style={styles.barCol}>
            <View style={[styles.bar, { height: peak > 0 ? Math.max(2, (p / peak) * 48) : 2, backgroundColor: score === profile.top ? colors.accent : colors.border }]} />
            <Text variant="caption" tone="tertiary">{score}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function RewardCampaignCard({ campaign: c, profile, busy, onEdit, onToggle, onStatus }: {
  campaign: RewardCampaign;
  profile?: LevelProfile;
  busy: boolean;
  onEdit: () => void;
  onToggle: (score: number, enabled: boolean) => void;
  onStatus: (s: 'active' | 'paused' | 'ended') => void;
}) {
  const status = STATUS[c.status];
  const odds = profile ? ruleOdds(profile.distribution, c.rules) : null;
  const open = c.rules.some((r) => r.enabled && (r.remaining == null || r.remaining > 0));
  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.flex}>
          <Text variant="bodyMedium">{c.title}</Text>
          <Text variant="caption" tone="secondary">{`${formatShortDateTime(c.startsAt)} → ${c.endsAt ? formatShortDateTime(c.endsAt) : 'muddatsiz'}`}</Text>
        </View>
        <Badge label={status.label} tone={status.tone} dot />
      </View>
      {c.status === 'active' && !open ? <Text variant="caption" tone="danger">Yoqilgan va zaxirasi bor qoida yo‘q — Reward Mode yopiq.</Text> : null}
      <ListGroup>
        {c.rules.map((r) => {
          const unreachable = profile && r.score > profile.top;
          const stock = r.quantity == null ? `berildi ${r.awarded}` : `berildi ${r.awarded}/${r.quantity}`;
          const chance = !r.enabled ? 'OFF' : unreachable ? 'bu darajada yetib bo‘lmaydi' : odds?.has(r.score) ? `≈ ${percent(odds.get(r.score) ?? 0)} raund` : '';
          return (
            <ToggleRow
              key={r.id}
              label={`${r.score}/10 gol → ${rewardText(r)}`}
              description={`${stock} · ${chance}`}
              value={r.enabled}
              onChange={(v) => onToggle(r.score, v)}
            />
          );
        })}
      </ListGroup>
      <View style={styles.actions}>
        <Button title="Tahrirlash" size="md" variant="secondary" disabled={busy} onPress={onEdit} style={styles.flex} />
        {c.status === 'active' ? <Button title="Pauza" size="md" variant="secondary" loading={busy} onPress={() => onStatus('paused')} /> : null}
        {c.status === 'paused' || c.status === 'draft' ? <Button title="Yoqish" size="md" loading={busy} onPress={() => onStatus('active')} /> : null}
        {c.status !== 'draft' ? <Button title="Tugatish" size="md" variant="danger" disabled={busy} onPress={() => onStatus('ended')} /> : null}
      </View>
      <Text variant="caption" tone="tertiary">{`G‘oliblar: ${c.winners} · ${formatSunCoin(c.coinsGiven)} · ${c.proDaysGiven} kun Pro`}</Text>
    </Card>
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barCol: { flex: 1, alignItems: 'center', gap: 2 },
  bar: { width: '100%', borderRadius: 3 },
});
