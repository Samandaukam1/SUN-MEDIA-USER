import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  formatSunCoin,
  FreeAttemptCountdown,
  prizeTeaser,
  rewardReplay,
  SunCoin,
  type SunCoinWallet,
} from "@/features/sun-coin";
import type { GameMode } from "../../../engine/types";
import { safiTheme as t } from "../config";

/**
 * The two ways to play, never mixed up: REWARD MODE (one free attempt every 24 hours, then 10 SC each, prizes
 * from live campaigns) and PRACTICE (free, unlimited, no prizes). Every state says why and what comes next.
 */
export function ModeCards({
  wallet,
  loading,
  busy,
  onStart,
  onRewardAgain,
  onRefresh,
}: {
  wallet: SunCoinWallet | undefined;
  loading: boolean;
  busy: boolean;
  onStart: (mode: GameMode) => void;
  onRewardAgain: () => void;
  onRefresh: () => void;
}) {
  const active = wallet?.attempt.activeSession;
  const activeMode = (active as { mode?: string } | null | undefined)?.mode;
  if (active) {
    return (
      <View style={s.stack}>
        <Cta
          title={`Boshlangan o‘yinni davom ettirish · ${active.attemptsUsed}/${active.attempts}`}
          busy={busy}
          onPress={() => onStart(activeMode === "practice" || activeMode === "legacy" ? "practice" : "free")}
        />
        <Text style={s.note}>Tugallanmagan raund saqlangan. Yangi urinish sarflanmaydi.</Text>
      </View>
    );
  }
  const replay = wallet ? rewardReplay(wallet) : null;
  return (
    <View style={s.stack}>
      <View style={s.reward}>
        <View style={s.head}>
          <Text style={s.kickerLight}>REWARD MODE</Text>
          {replay && replay.kind !== "closed" ? (
            <View style={[s.pill, replay.kind === "free" ? s.pillOn : s.pillOff]}>
              <Text style={[s.pillText, replay.kind === "free" ? s.pillTextOn : null]}>
                {replay.kind === "free" ? "BUGUN BEPUL" : "BEPUL ISHLATILGAN"}
              </Text>
            </View>
          ) : null}
        </View>
        {loading && !wallet ? (
          <ActivityIndicator color={t.primary} />
        ) : !wallet ? (
          <Text style={s.bodyLight}>Sovg‘a ma’lumotlari yuklanmadi. Mashq rejimi ochiq.</Text>
        ) : replay?.kind === "closed" ? (
          <Text style={s.bodyLight}>Hozir faol sovg‘a kampaniyasi yo‘q. Kampaniya boshlanganda shu yerda ochiladi.</Text>
        ) : (
          <>
            <Text style={s.prize}>{prizeTeaser(wallet.rewardKinds)}</Text>
            <View style={s.facts}>
              <Fact label="Bugungi bepul urinish" value={wallet.attempt.freeAvailable ? "Mavjud" : "Ishlatilgan"} strong={wallet.attempt.freeAvailable} />
              <Fact label="Qo‘shimcha urinish" value={formatSunCoin(wallet.attempt.cost)} />
              <View style={s.fact}>
                <Text style={s.factLabel}>Balans</Text>
                <View style={s.balance}>
                  <SunCoin size={18} animated={false} />
                  <Text style={s.factValue}>{formatSunCoin(wallet.balance)}</Text>
                </View>
              </View>
            </View>
            {!wallet.attempt.freeAvailable && wallet.attempt.nextFreeAt ? (
              <View style={s.timer}>
                <Text style={s.timerLabel}>KEYINGI BEPUL URINISH</Text>
                <FreeAttemptCountdown nextFreeAt={wallet.attempt.nextFreeAt} offsetMs={wallet.clockOffsetMs} onElapsed={onRefresh} style={s.timerValue} />
              </View>
            ) : null}
            {replay?.kind === "free" ? (
              <Cta title="BEPUL O‘YNASH" busy={busy} onPress={() => onStart("free")} />
            ) : (
              <Cta title={`YANA REWARD O‘YNASH · ${formatSunCoin(wallet.attempt.cost)}`} busy={busy} onPress={onRewardAgain} />
            )}
          </>
        )}
      </View>

      <View style={s.practice}>
        <View style={s.head}>
          <Text style={s.kicker}>MASHQ REJIMI</Text>
          <View style={[s.pill, s.pillSoft]}>
            <Text style={s.pillText}>BEPUL · CHEKSIZ</Text>
          </View>
        </View>
        <Text style={s.body}>O‘yin xuddi shunday, lekin sovg‘a, SUN Coin va Pro berilmaydi.</Text>
        <Cta title="MASHQ QILISH" secondary busy={busy} onPress={() => onStart("practice")} />
      </View>
    </View>
  );
}

function Fact({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={s.fact}>
      <Text style={s.factLabel}>{label}</Text>
      <Text style={[s.factValue, strong && { color: t.primary }]}>{value}</Text>
    </View>
  );
}

export function Cta({ title, onPress, busy = false, disabled = false, secondary = false }: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const off = busy || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [s.cta, secondary && s.ctaSecondary, { opacity: disabled ? 0.45 : pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
    >
      {busy ? <ActivityIndicator color={t.foreground} /> : <Text style={s.ctaText}>{title}</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  stack: { gap: 12, alignSelf: "stretch" },
  reward: { backgroundColor: t.arenaDeep, borderRadius: 22, padding: 18, gap: 12, borderWidth: 1, borderColor: "rgba(112,188,34,0.35)" },
  practice: { backgroundColor: t.surface, borderRadius: 22, padding: 18, gap: 12, borderWidth: 1, borderColor: t.line },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  kicker: { fontSize: 11, fontWeight: "700", letterSpacing: 2, color: t.muted },
  kickerLight: { fontSize: 11, fontWeight: "700", letterSpacing: 2, color: "#C7D4C2" },
  pill: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  pillOn: { backgroundColor: t.primary },
  pillOff: { backgroundColor: "rgba(255,255,255,0.1)" },
  pillSoft: { backgroundColor: "#E8EFDF" },
  pillText: { fontSize: 9, fontWeight: "700", letterSpacing: 1, color: "#C7D4C2" },
  pillTextOn: { color: t.foreground },
  prize: { fontSize: 15, fontWeight: "700", color: t.white },
  body: { fontSize: 13, lineHeight: 20, color: t.muted },
  bodyLight: { fontSize: 13, lineHeight: 20, color: "#C7D4C2" },
  facts: { gap: 6, paddingVertical: 4 },
  fact: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  factLabel: { fontSize: 13, color: "#AAB8A6" },
  factValue: { fontSize: 13, fontWeight: "700", color: t.white, fontVariant: ["tabular-nums"] },
  balance: { flexDirection: "row", alignItems: "center", gap: 2 },
  timer: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", gap: 2 },
  timerLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 2, color: "#AAB8A6" },
  timerValue: { fontSize: 26, lineHeight: 32, fontWeight: "700", color: t.white, letterSpacing: 1 },
  note: { fontSize: 11, lineHeight: 17, color: t.muted, textAlign: "center" },
  cta: { backgroundColor: t.primary, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 16, alignItems: "center", minHeight: 54, justifyContent: "center" },
  ctaSecondary: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.line },
  ctaText: { color: t.foreground, fontWeight: "800", fontSize: 14, letterSpacing: 0.4 },
});
