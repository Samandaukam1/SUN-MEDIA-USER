import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Chip, ChipRow, GlassSheet, Icon, SearchField, SegmentedControl, Text, TextField, ToggleRow, useToast } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { formatSunCoin, SunCoin } from '@/features/sun-coin';
import { useTheme } from '@/hooks/useTheme';
import {
  createRewardCampaign,
  gameAdminError,
  gameAdminKey,
  giftCoins,
  savePack,
  searchRecipients,
  updateRewardRules,
  type LevelProfile,
  type Recipient,
  type RewardCampaign,
} from './api';
import { DEFAULT_RULES, percent, ruleOdds, rulesValid, type RewardKind, type RuleDraft } from './levels';

const GIFT_AMOUNTS = [5, 10, 25, 50, 100];

/** Gift SUN Coin to a client user: find them, pick an amount, add a note they will see. */
export function GiftSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [picked, setPicked] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState('10');
  const [note, setNote] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);
  useEffect(() => {
    if (!visible) {
      setPicked(null);
      setQuery('');
      setNote('');
      setAmount('10');
    }
  }, [visible]);
  const recipients = useQuery({ queryKey: [...gameAdminKey, 'recipients', debounced], queryFn: () => searchRecipients(debounced), enabled: visible });
  const value = Number(amount);
  const valid = !!picked && Number.isInteger(value) && value >= 1 && value <= 100000;
  const gift = useMutation({
    mutationFn: () => giftCoins(picked!.userId, value, note.trim()),
    onSuccess: (r) => {
      toast.show(`${picked?.name}: +${formatSunCoin(value)} (balans ${formatSunCoin(r.balance)})`, 'success');
      void queryClient.invalidateQueries({ queryKey: gameAdminKey });
      onClose();
    },
    onError: (e) => toast.show(gameAdminError(e), 'error'),
  });

  return (
    <GlassSheet visible={visible} onClose={onClose} eyebrow="SUN COIN" title="Sovg‘a qilish">
      {picked ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Boshqa mijozni tanlash" onPress={() => setPicked(null)} style={[styles.picked, { backgroundColor: colors.accentSoft }]}>
          <View style={styles.flex}>
            <Text variant="bodyMedium">{picked.name}</Text>
            <Text variant="caption" tone="secondary">{`${picked.clientName} · balans ${formatSunCoin(picked.balance)}`}</Text>
          </View>
          <Icon name="x" size={18} color={colors.textSecondary} />
        </Pressable>
      ) : (
        <>
          <SearchField value={query} onChangeText={setQuery} placeholder="Mijoz, ism yoki email" />
          <View style={[styles.list, { borderColor: colors.glassBorder }]}>
            {recipients.isPending ? (
              <Text variant="caption" tone="tertiary" style={styles.pad}>Qidirilmoqda…</Text>
            ) : (recipients.data ?? []).length === 0 ? (
              <Text variant="caption" tone="tertiary" style={styles.pad}>Hech kim topilmadi</Text>
            ) : (
              recipients.data!.slice(0, 8).map((r, i) => (
                <Pressable
                  key={r.userId}
                  accessibilityRole="button"
                  onPress={() => setPicked(r)}
                  style={({ pressed }) => [styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, pressed && { backgroundColor: colors.surfaceSunken }]}
                >
                  <View style={styles.flex}>
                    <Text variant="bodyMedium">{r.name}</Text>
                    <Text variant="caption" tone="secondary">{r.clientName}</Text>
                  </View>
                  <Text variant="captionMedium" tone="secondary">{formatSunCoin(r.balance)}</Text>
                </Pressable>
              ))
            )}
          </View>
        </>
      )}
      <ChipRow>
        {GIFT_AMOUNTS.map((a) => (
          <Chip key={a} label={`${a} SC`} selected={amount === String(a)} onPress={() => setAmount(String(a))} />
        ))}
      </ChipRow>
      <TextField label="Miqdor (SC)" keyboardType="number-pad" value={amount} onChangeText={(t) => setAmount(t.replace(/\D/g, ''))} maxLength={6} />
      <TextField label="Izoh (mijoz ko‘radi)" value={note} onChangeText={setNote} maxLength={200} placeholder="Masalan: faol ishtirok uchun" />
      <Button title={valid ? `${formatSunCoin(value)} sovg‘a qilish` : 'Mijoz va miqdorni tanlang'} disabled={!valid} loading={gift.isPending} onPress={() => gift.mutate()} />
    </GlassSheet>
  );
}

type RuleRow = { key: number; score: string; type: RewardKind; amount: string; quantity: string; enabled: boolean; awarded: number };
const toRow = (r: RuleDraft & { awarded?: number }, key: number): RuleRow => ({
  key, score: String(r.score), type: r.type, amount: String(r.amount), quantity: r.quantity == null ? '' : String(r.quantity), enabled: r.enabled, awarded: r.awarded ?? 0,
});
const toDraft = (r: RuleRow): RuleDraft => ({
  score: Number(r.score), type: r.type, amount: Number(r.amount), quantity: r.quantity === '' ? null : Number(r.quantity), enabled: r.enabled,
});

/**
 * Reward rules for SAFI Penalty: for each score, SUN Coin or days of Pro, an optional quantity and an on/off switch.
 * New campaign, or — with `campaign` — the rules of an existing one, changed in place (no app update needed).
 */
export function RewardRulesSheet({ visible, onClose, campaign, hasActive, profile }: {
  visible: boolean;
  onClose: () => void;
  campaign?: RewardCampaign | null;
  hasActive: boolean;
  profile?: LevelProfile;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [startNow, setStartNow] = useState(false);
  const [rows, setRows] = useState<RuleRow[]>([]);
  const [removed, setRemoved] = useState<number[]>([]);
  useEffect(() => {
    if (!visible) return;
    setTitle(campaign?.title ?? 'SAFI Penalty mukofotlari');
    setRows((campaign ? campaign.rules : DEFAULT_RULES).map(toRow));
    setRemoved([]);
    setStartNow(!hasActive && !campaign);
  }, [visible, campaign, hasActive]);
  const drafts = rows.map(toDraft);
  const valid = title.trim().length > 0 && rulesValid(drafts) && rows.every((r) => r.quantity === '' || Number(r.quantity) >= r.awarded);
  const odds = useMemo(() => (profile ? ruleOdds(profile.distribution, drafts) : null), [profile, drafts]);
  const save = useMutation({
    mutationFn: () =>
      campaign
        ? updateRewardRules(campaign.id, drafts, { title: title.trim(), removed: removed.filter((s) => !drafts.some((d) => d.score === s)) })
        : createRewardCampaign({ title: title.trim(), status: startNow ? 'active' : 'draft', rules: drafts }),
    onSuccess: () => {
      toast.show(campaign ? 'Saqlandi — keyingi raunddan kuchga kiradi' : startNow ? 'Kampaniya yoqildi' : 'Qoralama saqlandi', 'success');
      void queryClient.invalidateQueries({ queryKey: gameAdminKey });
      onClose();
    },
    onError: (e) => toast.show(gameAdminError(e), 'error'),
  });
  const setRow = (key: number, patch: Partial<RuleRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const freeScores = Array.from({ length: 10 }, (_, i) => 10 - i).filter((s) => !rows.some((r) => Number(r.score) === s));

  return (
    <GlassSheet visible={visible} onClose={onClose} eyebrow="SAFI PENALTY · REWARD RULES" title={campaign ? 'Qoidalarni tahrirlash' : 'Yangi mukofot kampaniyasi'}>
      <TextField label="Nomi" value={title} onChangeText={setTitle} maxLength={100} />
      <Text variant="caption" tone="secondary">
        O‘yinchi erishgan eng yuqori yoqilgan qoida beriladi — bitta raundga bitta mukofot. O‘yinchi bu qoidalarni ko‘rmaydi.
      </Text>
      {rows.map((r) => {
        const unreachable = profile && r.enabled && Number(r.score) > profile.top;
        const p = odds?.get(Number(r.score));
        return (
          <View key={r.key} style={[styles.rule, { opacity: r.enabled ? 1 : 0.6 }]}>
            <View style={styles.two}>
              <View style={styles.score}>
                <TextField label="Gol (/10)" keyboardType="number-pad" value={r.score} editable={r.awarded === 0} onChangeText={(t) => setRow(r.key, { score: t.replace(/\D/g, '').slice(0, 2) })} />
              </View>
              <View style={styles.flex}>
                <SegmentedControl<RewardKind>
                  options={[{ value: 'SUN_COIN', label: 'SUN Coin' }, { value: 'PRO_DAYS', label: 'Pro kun' }]}
                  value={r.type}
                  onChange={(v) => setRow(r.key, { type: v })}
                />
              </View>
            </View>
            <View style={styles.two}>
              <View style={styles.flex}>
                <TextField label={r.type === 'SUN_COIN' ? 'Miqdor (SC)' : 'Muddat (kun)'} keyboardType="number-pad" value={r.amount} onChangeText={(t) => setRow(r.key, { amount: t.replace(/\D/g, '').slice(0, 7) })} />
              </View>
              <View style={styles.flex}>
                <TextField label={r.awarded ? `Soni (berilgan ${r.awarded})` : 'Soni'} keyboardType="number-pad" value={r.quantity} placeholder="Cheklanmagan" onChangeText={(t) => setRow(r.key, { quantity: t.replace(/\D/g, '').slice(0, 7) })} />
              </View>
            </View>
            <View style={styles.ruleFoot}>
              <View style={styles.flex}>
                <ToggleRow
                  label={r.enabled ? 'ON' : 'OFF'}
                  description={unreachable ? `Joriy darajada ${profile?.top}/10 dan ortiq bo‘lmaydi` : r.enabled && p != null ? `≈ ${percent(p)} raund` : 'Berilmaydi'}
                  value={r.enabled}
                  onChange={(v) => setRow(r.key, { enabled: v })}
                />
              </View>
              {r.awarded === 0 ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`${r.score}-gol qoidasini olib tashlash`} hitSlop={10} onPress={() => {
                  setRows((rs) => rs.filter((x) => x.key !== r.key));
                  if (Number(r.score)) setRemoved((s) => [...s, Number(r.score)]);
                }} style={styles.remove}>
                  <Icon name="trash-2" size={18} color="#E5484D" />
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
      {freeScores.length > 0 && rows.length < 10 ? (
        <ChipRow>
          {freeScores.slice(0, 5).map((s) => (
            <Chip key={s} label={`+ ${s}/10`} onPress={() => setRows((rs) => [...rs, toRow({ score: s, type: 'SUN_COIN', amount: 1, quantity: null, enabled: true }, rs.reduce((m, x) => Math.max(m, x.key), -1) + 1)])} />
          ))}
        </ChipRow>
      ) : null}
      {!campaign ? (
        <ToggleRow
          label="Darhol yoqish"
          description={hasActive ? 'Faol kampaniya bor: yangisi qoralama bo‘lib saqlanadi.' : 'O‘chiq bo‘lsa qoralama saqlanadi.'}
          value={startNow}
          onChange={setStartNow}
          disabled={hasActive}
        />
      ) : null}
      {!valid ? <Text variant="caption" tone="danger">Har gol soni (1–10) bir marta, miqdor kamida 1 (Pro ≤ 365 kun), soni berilganidan kam emas.</Text> : null}
      <Button title={campaign ? 'Saqlash' : startNow ? 'Kampaniyani yoqish' : 'Qoralamani saqlash'} disabled={!valid} loading={save.isPending} onPress={() => save.mutate()} />
    </GlassSheet>
  );
}

/** A Coin Shop pack: coins and the price SUN MEDIA charges for them. */
export function PackSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [coins, setCoins] = useState('100');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const cents = Math.round(Number(price.replace(',', '.')) * 100);
  const valid = Number(coins) >= 1 && Number.isInteger(Number(coins)) && cents >= 1 && /^[A-Za-z]{3}$/.test(currency);
  const save = useMutation({
    mutationFn: () => savePack({ coins: Number(coins), priceCents: cents, currency: currency.toUpperCase() }),
    onSuccess: () => {
      toast.show(`${coins} SC paketi qo‘shildi`, 'success');
      void queryClient.invalidateQueries({ queryKey: gameAdminKey });
      onClose();
    },
    onError: (e) => toast.show(gameAdminError(e), 'error'),
  });
  return (
    <GlassSheet visible={visible} onClose={onClose} eyebrow="COIN SHOP" title="Yangi paket">
      <View style={styles.center}>
        <SunCoin size={56} />
      </View>
      <TextField label="SUN Coin (SC)" keyboardType="number-pad" value={coins} onChangeText={(t) => setCoins(t.replace(/\D/g, ''))} />
      <View style={styles.two}>
        <View style={styles.flex}>
          <TextField label="Narx" keyboardType="decimal-pad" value={price} placeholder="4.99" onChangeText={setPrice} />
        </View>
        <View style={styles.flex}>
          <TextField label="Valyuta" autoCapitalize="characters" maxLength={3} value={currency} onChangeText={setCurrency} />
        </View>
      </View>
      <Button title="Paketni qo‘shish" disabled={!valid} loading={save.isPending} onPress={() => save.mutate()} />
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: spacing.lg },
  list: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  picked: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, padding: spacing.lg },
  two: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  score: { width: 96 },
  rule: { gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(127,127,127,0.25)' },
  ruleFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  remove: { paddingHorizontal: 4 },
  center: { alignItems: 'center' },
});
