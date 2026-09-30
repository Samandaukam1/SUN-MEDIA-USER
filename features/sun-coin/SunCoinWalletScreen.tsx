import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Icon, ListGroup, ListRow, QueryView, Screen, Section, Text } from '@/components/ui';
import { brand, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { formatShortDateTime } from '@/lib/time';
import { useSunCoinWallet } from './api';
import { SunCoinIcon } from './SunCoinIcon';
import { formatSunCoin, transactionLabel, type SunCoinTransaction } from './types';

export function SunCoinWalletScreen() {
  const wallet = useSunCoinWallet();
  const { colors } = useTheme();
  const nav = useNav();

  return (
    <Screen edges={[]} refreshing={wallet.isRefetching} onRefresh={() => { void wallet.refetch(); }}>
      <Stack.Screen options={{ title: 'SUN Coin' }} />
      <QueryView query={wallet}>
        {(data) => (
          <>
            <Card variant="hero" style={styles.hero}>
              <View style={styles.heroTop}>
                <View style={styles.balance}>
                  <Text variant="captionMedium" style={{ color: colors.heroTextSecondary }}>Mening SUN Coin balansim</Text>
                  <Text variant="hero" style={{ color: colors.heroText }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} accessibilityLiveRegion="polite">{formatSunCoin(data.balance)}</Text>
                </View>
                <SunCoinIcon size={88} />
              </View>
              <View style={styles.heroFooter}>
                <View style={styles.dot} />
                <Text variant="caption" style={{ color: colors.heroTextSecondary }}>SUN MEDIA ichki virtual valyutasi</Text>
              </View>
            </Card>

            {wallet.isError ? (
              <Card style={styles.notice}>
                <Icon name="wifi-off" size={18} color={colors.warning} />
                <Text variant="caption" tone="secondary" style={styles.flex}>Yangilanmadi. Oxirgi yuklangan balans ko‘rsatilmoqda. Yangilash uchun pastga torting.</Text>
              </Card>
            ) : null}

            <Section title="SUN Coin imkoniyatlari">
              <Card style={styles.details}>
                <Text variant="subheading">O‘ynang, yuting, yana sinab ko‘ring</Text>
                <Text variant="body" tone="secondary">Faol SUN Coin kampaniyasida sovg‘ali o‘yin orqali coin yuting. Qo‘shimcha sovg‘ali urinish uchun SUN Coin ishlating.</Text>
                <View style={[styles.tip, { backgroundColor: colors.accentSoft }]}>
                  <Icon name="clock" size={17} color={colors.accentOnSoft} />
                  <Text variant="caption" style={[styles.flex, { color: colors.accentOnSoft }]}>Har 24 soatda 1 bepul sovg‘ali urinish. Mashq rejimi doim bepul, coin bermaydi.</Text>
                </View>
                <Button title="Game Center’ni ochish" variant="secondary" icon="arrow-right" onPress={() => nav.go('/games')} />
              </Card>
            </Section>

            <Section title="Oxirgi operatsiyalar">
              {data.transactions.length > 0 ? (
                <>
                  <ListGroup>{data.transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}</ListGroup>
                  <Text variant="micro" tone="tertiary">Oxirgi {data.transactions.length} ta operatsiya. Balans barcha operatsiyalarni hisobga oladi.</Text>
                </>
              ) : (
                <Card style={styles.empty}>
                  <SunCoinIcon size={48} />
                  <Text variant="heading" align="center">Hali operatsiya yo‘q</Text>
                  <Text variant="caption" tone="secondary" align="center">Yutgan va sarflagan SUN Coin shu yerda ko‘rinadi.</Text>
                </Card>
              )}
            </Section>
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  SAFI_PENALTY: 'SAFI Penalty',
  SAFI_PENALTY_REWARD_ATTEMPT: 'SAFI Penalty · sovg‘ali urinish',
};

function TransactionRow({ transaction }: { transaction: SunCoinTransaction }) {
  const { colors } = useTheme();
  const positive = transaction.amount > 0;
  const source = SOURCE_LABELS[transaction.source] ?? transaction.source.replace(/[_-]/g, ' ');
  return (
    <ListRow
      title={transactionLabel(transaction.type)}
      subtitle={`${source} · ${formatShortDateTime(transaction.createdAt)}`}
      leading={<SunCoinIcon size={32} />}
      trailing={<Text variant="subheading" style={{ color: positive ? colors.success : colors.text, fontVariant: ['tabular-nums'] }}>{positive ? '+' : '−'}{formatSunCoin(Math.abs(transaction.amount))}</Text>}
    />
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing.xxl, gap: spacing.xl },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  balance: { flex: 1, gap: spacing.sm },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: brand.lime },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  details: { gap: spacing.md },
  tip: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', borderRadius: 12, padding: spacing.md },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
});
