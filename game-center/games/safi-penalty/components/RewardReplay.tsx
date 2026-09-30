import { StyleSheet, View } from "react-native";
import { Button, Text } from "@/components/ui";
import { spacing } from "@/constants/theme";
import {
  formatSunCoin,
  FreeAttemptCountdown,
  rewardReplay,
  SunCoin,
  type SunCoinWallet,
} from "@/features/sun-coin";
import { useTheme } from "@/hooks/useTheme";

export function replayTitle(wallet: SunCoinWallet | undefined) {
  const kind = wallet ? rewardReplay(wallet).kind : "closed";
  return kind === "short" ? "Yana Reward Mode o‘ynash" : "Yana o‘ynash";
}

/**
 * "Play Reward Mode again" after the free attempt: the price, what is left after it, and the way forward —
 * confirm 10 SC (debited by the server when the round starts), or top up, or practise for free.
 */
export function ReplayContent({
  wallet,
  busy,
  onPlayFree,
  onPlayPaid,
  onPractice,
  onBuy,
  onRefresh,
}: {
  wallet: SunCoinWallet;
  busy: boolean;
  onPlayFree: () => void;
  onPlayPaid: () => void;
  onPractice: () => void;
  onBuy: () => void;
  onRefresh: () => void;
}) {
  const { colors } = useTheme();
  const r = rewardReplay(wallet);
  const countdown = !wallet.attempt.freeAvailable && wallet.attempt.nextFreeAt ? (
    <View style={[s.timer, { backgroundColor: colors.surfaceSunken }]}>
      <Text variant="label" tone="tertiary">
        Keyingi bepul urinish
      </Text>
      <FreeAttemptCountdown nextFreeAt={wallet.attempt.nextFreeAt} offsetMs={wallet.clockOffsetMs} onElapsed={onRefresh} style={[s.timerValue, { color: colors.text }]} />
    </View>
  ) : null;

  if (r.kind === "closed") {
    return (
      <>
        <Text variant="body" tone="secondary">
          Hozir faol sovg‘a kampaniyasi yo‘q. Mashq rejimi doim bepul.
        </Text>
        <Button title="MASHQ REJIMI" variant="secondary" onPress={onPractice} />
      </>
    );
  }
  if (r.kind === "free") {
    return (
      <>
        <Text variant="body" tone="secondary">
          Bugungi bepul Reward Mode urinishingiz mavjud.
        </Text>
        <Button title="BEPUL O‘YNASH" loading={busy} onPress={onPlayFree} />
        <Button title="MASHQ REJIMI" variant="secondary" onPress={onPractice} />
      </>
    );
  }
  const rows: [string, string][] =
    r.kind === "paid"
      ? [
          ["Reward Mode", formatSunCoin(r.cost)],
          ["Sizda", formatSunCoin(r.balance)],
          ["O‘yindan keyin", `${formatSunCoin(r.after)} qoladi`],
        ]
      : [
          ["Keyingi urinish", `${r.cost} SUN COIN`],
          ["Sizda", formatSunCoin(r.balance)],
          ["Yetishmaydi", formatSunCoin(r.missing)],
        ];
  return (
    <>
      <View style={[s.table, { borderColor: colors.glassBorder }]}>
        {rows.map(([label, value], i) => (
          <View key={label} style={[s.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <Text variant="body" tone="secondary">
              {label}
            </Text>
            <View style={s.value}>
              {label === "Sizda" ? <SunCoin size={22} animated={false} /> : null}
              <Text variant="bodyMedium" style={[s.num, label === "Yetishmaydi" && { color: colors.danger }]}>
                {value}
              </Text>
            </View>
          </View>
        ))}
      </View>
      {r.kind === "short" ? (
        <Text variant="body" tone="secondary">
          Yana Reward Mode o‘ynash uchun SUN Coin yetarli emas.
        </Text>
      ) : null}
      {r.kind === "paid" ? (
        <Button title={`${formatSunCoin(r.cost)} BILAN O‘YNASH`} loading={busy} onPress={onPlayPaid} accessibilityHint="O‘yin boshlanganda server balansingizdan yechadi" />
      ) : (
        <Button title="SUN COIN SOTIB OLISH" icon="shopping-bag" onPress={onBuy} />
      )}
      <Button title={r.kind === "paid" ? "MASHQ REJIMI" : "MASHQ REJIMIDA O‘YNASH"} variant="secondary" onPress={onPractice} />
      {countdown}
    </>
  );
}

const s = StyleSheet.create({
  table: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  value: { flexDirection: "row", alignItems: "center", gap: 2 },
  num: { fontVariant: ["tabular-nums"] },
  timer: { borderRadius: 16, paddingVertical: spacing.md, alignItems: "center", gap: 2 },
  timerValue: { fontSize: 28, fontWeight: "700", letterSpacing: 1 },
});
