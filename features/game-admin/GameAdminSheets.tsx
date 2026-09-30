import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Chip, ChipRow, GlassSheet, Icon, SearchField, SegmentedControl, Text, TextField, ToggleRow, useToast } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { formatSunCoin, SunCoin } from '@/features/sun-coin';
import { useTheme } from '@/hooks/useTheme';
import { createCampaign, gameAdminError, gameAdminKey, giftCoins, savePack, searchRecipients, type Recipient } from './api';
import { poolSummary } from './levels';

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

type OptionRow = { key: number; amount: string; quantity: string; weight: string };

/** A new SUN Coin campaign for SAFI Penalty: pool, payouts, minimum score and how winners are drawn. */
export function CampaignSheet({ visible, onClose, hasActive }: { visible: boolean; onClose: () => void; hasActive: boolean }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('SAFI SUN Coin');
  const [pool, setPool] = useState('20');
  const [minimum, setMinimum] = useState('5');
  const [strategy, setStrategy] = useState<'FIRST_ELIGIBLE' | 'WEIGHTED_RANDOM'>('FIRST_ELIGIBLE');
  const [startNow, setStartNow] = useState(!hasActive);
  const [rows, setRows] = useState<OptionRow[]>([
    { key: 0, amount: '5', quantity: '2', weight: '20' },
    { key: 1, amount: '3', quantity: '3', weight: '30' },
  ]);
  const [next, setNext] = useState(2);
  useEffect(() => setStartNow(!hasActive), [hasActive, visible]);
  const options = rows.map((r) => ({ amount: Number(r.amount), quantity: r.quantity === '' ? null : Number(r.quantity), weight: Number(r.weight) || 1 }));
  const total = Number(pool);
  const min = Number(minimum);
  const summary = useMemo(() => poolSummary(total, options), [total, options]);
  const valid =
    title.trim().length > 0 && Number.isInteger(total) && total > 0 && Number.isInteger(min) && min >= 0 && min <= 10 &&
    options.length > 0 && options.every((o) => Number.isInteger(o.amount) && o.amount > 0 && (o.quantity == null || (Number.isInteger(o.quantity) && o.quantity > 0))) &&
    !summary.exceeds;
  const create = useMutation({
    mutationFn: () =>
      createCampaign({
        title: title.trim(), totalPool: total, minimumScore: min, strategy, status: startNow ? 'active' : 'draft',
        options: options.map((o) => ({ ...o, minScore: min, maxScore: 10 })),
      }),
    onSuccess: () => {
      toast.show(startNow ? 'Kampaniya ishga tushdi' : 'Qoralama saqlandi', 'success');
      void queryClient.invalidateQueries({ queryKey: gameAdminKey });
      onClose();
    },
    onError: (e) => toast.show(gameAdminError(e), 'error'),
  });
  const setRow = (key: number, field: keyof Omit<OptionRow, 'key'>, v: string) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: v.replace(/\D/g, '') } : r)));
  const add = (amount: number) => {
    setRows((rs) => [...rs, { key: next, amount: String(amount), quantity: '', weight: '10' }]);
    setNext((k) => k + 1);
  };

  return (
    <GlassSheet visible={visible} onClose={onClose} eyebrow="SAFI PENALTY" title="Yangi SUN Coin kampaniyasi">
      <TextField label="Nomi" value={title} onChangeText={setTitle} maxLength={100} />
      <View style={styles.two}>
        <View style={styles.flex}>
          <TextField label="Pool (SC)" keyboardType="number-pad" value={pool} onChangeText={(t) => setPool(t.replace(/\D/g, ''))} />
        </View>
        <View style={styles.flex}>
          <TextField label="Minimal gol (/10)" keyboardType="number-pad" value={minimum} onChangeText={(t) => setMinimum(t.replace(/\D/g, '').slice(0, 2))} />
        </View>
      </View>
      <SegmentedControl
        options={[
          { value: 'FIRST_ELIGIBLE', label: 'Tartib bo‘yicha' },
          { value: 'WEIGHTED_RANDOM', label: 'Vaznli tasodif' },
        ]}
        value={strategy}
        onChange={setStrategy}
      />
      <Text variant="label" tone="tertiary">Mukofotlar</Text>
      {rows.map((r) => (
        <View key={r.key} style={styles.option}>
          <View style={styles.flex}>
            <TextField label="SC" keyboardType="number-pad" value={r.amount} onChangeText={(t) => setRow(r.key, 'amount', t)} />
          </View>
          <View style={styles.flex}>
            <TextField label="G‘oliblar" keyboardType="number-pad" value={r.quantity} placeholder="Poolgacha" onChangeText={(t) => setRow(r.key, 'quantity', t)} />
          </View>
          {strategy === 'WEIGHTED_RANDOM' ? (
            <View style={styles.flex}>
              <TextField label="Vazn" keyboardType="number-pad" value={r.weight} onChangeText={(t) => setRow(r.key, 'weight', t)} />
            </View>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Mukofotni olib tashlash" hitSlop={10} onPress={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} style={styles.remove}>
            <Icon name="trash-2" size={18} color="#E5484D" />
          </Pressable>
        </View>
      ))}
      <ChipRow>
        {[1, 3, 5, 10].map((a) => (
          <Chip key={a} label={`+ ${a} SC`} onPress={() => add(a)} />
        ))}
      </ChipRow>
      <View style={styles.summary}>
        <View style={styles.flex}>
          <Text variant="caption" tone="secondary">Maksimal tarqatish</Text>
          <Text variant="heading">{`${summary.poolLimited ? '≤ ' : ''}${formatSunCoin(summary.maximum)}`}</Text>
        </View>
        <View style={styles.flex}>
          <Text variant="caption" tone="secondary">Taqsimlanmagan</Text>
          <Text variant="heading" tone={summary.exceeds ? 'danger' : 'primary'}>{summary.unallocated == null ? 'Poolga bog‘liq' : formatSunCoin(summary.unallocated)}</Text>
        </View>
      </View>
      {summary.exceeds ? <Text variant="caption" tone="danger">Mukofotlar pooldan oshib ketdi.</Text> : null}
      <ToggleRow
        label="Darhol ishga tushirish"
        description={hasActive ? 'Faol kampaniya bor: yangisi qoralama sifatida saqlanadi.' : 'O‘chiq bo‘lsa qoralama saqlanadi.'}
        value={startNow}
        onChange={setStartNow}
        disabled={hasActive}
      />
      <Button title={startNow ? 'Kampaniyani boshlash' : 'Qoralamani saqlash'} disabled={!valid} loading={create.isPending} onPress={() => create.mutate()} />
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
  two: { flexDirection: 'row', gap: spacing.md },
  option: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  remove: { paddingBottom: 16, paddingHorizontal: 4 },
  summary: { flexDirection: 'row', gap: spacing.md },
  center: { alignItems: 'center' },
});
