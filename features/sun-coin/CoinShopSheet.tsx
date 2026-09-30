import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, GlassSheet, Text, useToast } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { formatPrice } from '@/features/pro/api';
import { cancelSunCoinPurchase, fetchSunCoinShop, requestSunCoinPurchase, sunCoinShopKey } from './api';
import { SunCoin } from './SunCoin';
import { bestValuePackId, formatSunCoin, type CoinPack, type SunCoinPurchaseRequest } from './types';

const PURCHASE_ERRORS: Record<string, string> = {
  COIN_PURCHASE_PENDING: 'Avvalgi so‘rovingiz hali ko‘rib chiqilmoqda.',
  COIN_PACK_UNAVAILABLE: 'Bu paket hozir mavjud emas.',
  COIN_PURCHASE_CLOSED: 'So‘rov allaqachon yopilgan.',
};

/**
 * Coin Shop: packs and prices come from SUN MEDIA's catalogue. "Sotib olish" sends a request; the payment is
 * settled with SUN MEDIA and the coins arrive only after SUN MEDIA confirms it on the server.
 */
export function CoinShopSheet({ visible, onClose, onOpenWallet }: { visible: boolean; onClose: () => void; onOpenWallet?: () => void }) {
  return (
    <GlassSheet visible={visible} onClose={onClose} eyebrow="SUN COIN" title="Coin Shop">
      <CoinShopContent onOpenWallet={onOpenWallet} />
    </GlassSheet>
  );
}

/** The shop itself, for any sheet (the game switches to it from the replay choice without a second modal). */
export function CoinShopContent({ onOpenWallet }: { onOpenWallet?: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const shop = useQuery({ queryKey: sunCoinShopKey, queryFn: fetchSunCoinShop });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['sun-coin'] });
  const fail = (e: unknown) => toast.show(PURCHASE_ERRORS[(e as { message?: string })?.message ?? ''] ?? 'So‘rov yuborilmadi. Qayta urinib ko‘ring.', 'error');
  const request = useMutation({
    mutationFn: requestSunCoinPurchase,
    onSuccess: () => {
      toast.show('So‘rov SUN MEDIA’ga yuborildi', 'success');
      void refresh();
    },
    onError: fail,
  });
  const cancel = useMutation({ mutationFn: cancelSunCoinPurchase, onSuccess: () => void refresh(), onError: fail });
  const data = shop.data;
  const best = data ? bestValuePackId(data.packs) : null;

  return (
    <>
      <View style={styles.balance}>
        <SunCoin size={34} />
        <View style={styles.flex}>
          <Text variant="caption" tone="secondary">
            Sizda
          </Text>
          <Text variant="heading" style={styles.num}>
            {data ? formatSunCoin(data.balance) : '— SC'}
          </Text>
        </View>
        {onOpenWallet ? <Button title="Tarix" variant="secondary" size="md" onPress={onOpenWallet} /> : null}
      </View>

      {data?.pending ? <PendingCard request={data.pending} busy={cancel.isPending} onCancel={() => cancel.mutate(data.pending!.id)} /> : null}

      {shop.isPending ? (
        <Text variant="body" tone="secondary">
          Paketlar yuklanmoqda…
        </Text>
      ) : shop.isError ? (
        <Text variant="body" tone="secondary">
          Paketlar yuklanmadi. Qayta ochib ko‘ring.
        </Text>
      ) : data && data.packs.length === 0 ? (
        <Card style={styles.empty}>
          <Text variant="subheading">Paketlar hali sozlanmagan</Text>
          <Text variant="caption" tone="secondary">
            SUN MEDIA SUN Coin paketlarini qo‘shganda shu yerda paydo bo‘ladi. Mashq rejimi doim bepul.
          </Text>
        </Card>
      ) : (
        <View style={styles.grid}>
          {data?.packs.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              best={pack.id === best}
              pendingHere={data.pending?.packId === pack.id}
              blocked={!!data.pending && data.pending.packId !== pack.id}
              busy={request.isPending && request.variables === pack.id}
              onBuy={() => request.mutate(pack.id)}
            />
          ))}
        </View>
      )}

      <Text variant="caption" tone="tertiary">
        To‘lov SUN MEDIA bilan shartnomangiz bo‘yicha amalga oshiriladi: so‘rovdan keyin menejer bog‘lanadi, to‘lov tasdiqlangach
        SUN Coin hisobingizga tushadi. SUN Coin faqat SUN MEDIA ichida ishlatiladi — pulga almashtirilmaydi va naqdlashtirilmaydi.
      </Text>
    </>
  );
}

function PackCard({ pack, best, pendingHere, blocked, busy, onBuy }: { pack: CoinPack; best: boolean; pendingHere: boolean; blocked: boolean; busy: boolean; onBuy: () => void }) {
  return (
    <Card style={styles.pack} padded={false}>
      <View style={styles.packTop}>{best ? <Badge label="Eng foydali" tone="accent" /> : <View style={styles.badgeSpace} />}</View>
      <SunCoin size={46} />
      <Text variant="title" style={styles.num}>
        {formatSunCoin(pack.coins)}
      </Text>
      <Text variant="body" tone="secondary">
        {formatPrice(pack.priceCents, pack.currency)}
      </Text>
      <Button
        title={pendingHere ? 'So‘rov yuborilgan' : 'SOTIB OLISH'}
        size="md"
        disabled={pendingHere || blocked}
        loading={busy}
        onPress={onBuy}
        accessibilityHint={`${formatSunCoin(pack.coins)} uchun so‘rov SUN MEDIA’ga yuboriladi`}
        style={styles.buy}
      />
    </Card>
  );
}

function PendingCard({ request, busy, onCancel }: { request: SunCoinPurchaseRequest; busy: boolean; onCancel: () => void }) {
  return (
    <Card style={styles.pending}>
      <Badge label="Kutilmoqda" tone="warning" dot />
      <Text variant="subheading">{`${formatSunCoin(request.coins)} · ${formatPrice(request.priceCents, request.currency)}`}</Text>
      <Text variant="caption" tone="secondary">
        So‘rov SUN MEDIA’ga yuborildi. To‘lov tasdiqlangach SUN Coin hisobingizga avtomatik tushadi.
      </Text>
      <Button title="So‘rovni bekor qilish" variant="secondary" size="md" loading={busy} onPress={onCancel} />
    </Card>
  );
}

const styles = StyleSheet.create({
  balance: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  pack: { flexBasis: '46%', flexGrow: 1, alignItems: 'center', gap: spacing.xs, padding: spacing.lg },
  packTop: { alignSelf: 'stretch', alignItems: 'flex-end', minHeight: 24 },
  badgeSpace: { height: 24 },
  buy: { alignSelf: 'stretch', marginTop: spacing.sm },
  pending: { gap: spacing.sm },
  empty: { gap: spacing.xs },
});
