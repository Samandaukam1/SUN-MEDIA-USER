import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { formatSunCoin, prizeLines, SunCoinIcon, useSunCoinWallet, type SunCoinWallet } from "@/features/sun-coin";
import { formatShortDateTime } from "@/lib/time";
import type { GameMode } from "../../../engine/types";
import { safiTheme as t } from "../config";

/**
 * Before a round: Reward Mode (the daily free attempt, or another one for SUN Coin after a confirmation) or
 * Practice (always free and unlimited). What can be won comes from the server; the fee is taken by the server.
 */
export function RewardModePicker({ busy, onStart }: { busy: boolean; onStart: (mode: GameMode) => void }) {
  const wallet = useSunCoinWallet();
  const data = wallet.data;
  const active = data?.attempt.activeSession;
  const activeMode = (active as { mode?: string } | null | undefined)?.mode;

  if (active) {
    // Any start resumes the open round on the server; practice asks for practice so it is not closed.
    return (
      <View style={p.stack}>
        <ModeButton
          title={`Boshlangan o‘yinni davom ettirish · ${active.attemptsUsed}/${active.attempts}`}
          busy={busy}
          onPress={() => onStart(activeMode === "practice" || activeMode === "legacy" ? "practice" : "free")}
        />
        <Text style={p.note}>Tugallanmagan raund saqlangan. Yangi urinish sarflanmaydi.</Text>
      </View>
    );
  }

  return (
    <View style={p.stack}>
      <View style={p.card}>
        <View style={p.cardHead}>
          <Text style={p.kicker}>SOVG‘ALI O‘YIN</Text>
          <View style={p.balance} accessibilityLabel={data ? `Balans ${formatSunCoin(data.balance)}` : "Balans yuklanmoqda"}>
            <SunCoinIcon size={22} />
            {data ? <Text style={p.balanceText}>{formatSunCoin(data.balance)}</Text> : <ActivityIndicator size="small" color={t.muted} />}
          </View>
        </View>
        {data ? <RewardOffer data={data} busy={busy} onStart={onStart} /> : (
          <Text style={p.body}>{wallet.isError ? "Sovg‘a ma’lumotlari yuklanmadi. Mashq rejimi ochiq." : "Sovg‘alar yuklanmoqda…"}</Text>
        )}
      </View>
      <ModeButton title="Mashq qilish · bepul" secondary busy={busy} onPress={() => onStart("practice")} />
      <Text style={p.note}>Mashq rejimi cheksiz va bepul. SUN Coin va Pro faqat sovg‘ali o‘yinda beriladi.</Text>
    </View>
  );
}

function RewardOffer({ data, busy, onStart }: { data: SunCoinWallet; busy: boolean; onStart: (mode: GameMode) => void }) {
  if (!data.campaignAvailable) {
    return <Text style={p.body}>Hozir faol sovg‘a kampaniyasi yo‘q. Kampaniya boshlanganda shu yerda ochiladi.</Text>;
  }
  const { cost, freeAvailable, nextFreeAt } = data.attempt;
  const enough = data.balance >= cost;
  const confirmPaid = () => {
    const text = `Balansingizdan ${formatSunCoin(cost)} yechiladi: ${formatSunCoin(data.balance)} → ${formatSunCoin(data.balance - cost)}.`;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(text)) onStart("paid");
      return;
    }
    Alert.alert(`Sovg‘ali urinish · ${formatSunCoin(cost)}`, text, [
      { text: "Bekor qilish", style: "cancel" },
      { text: `${formatSunCoin(cost)} bilan o‘ynash`, onPress: () => onStart("paid") },
    ]);
  };
  return (
    <>
      {prizeLines(data).map((line) => (
        <Text key={line} style={p.prize}>{line}</Text>
      ))}
      {freeAvailable ? (
        <ModeButton title="Bepul urinish · har 24 soatda 1 ta" busy={busy} onPress={() => onStart("free")} />
      ) : (
        <>
          <ModeButton title={`Qo‘shimcha urinish · ${formatSunCoin(cost)}`} busy={busy} disabled={!enough} onPress={confirmPaid} />
          <Text style={p.note}>
            {[
              !enough ? `SUN Coin yetarli emas: kerak ${formatSunCoin(cost)}.` : null,
              nextFreeAt ? `Keyingi bepul urinish: ${formatShortDateTime(nextFreeAt)}.` : null,
            ].filter(Boolean).join(" ")}
          </Text>
        </>
      )}
    </>
  );
}

function ModeButton({ title, onPress, busy = false, disabled = false, secondary = false }: {
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
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [p.action, secondary && p.secondary, { opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }]}
    >
      {busy ? <ActivityIndicator color={t.foreground} /> : <Text style={p.actionText}>{title}</Text>}
    </Pressable>
  );
}

const p = StyleSheet.create({
  stack: { gap: 12, alignSelf: "stretch" },
  card: { backgroundColor: t.surface, borderRadius: 20, padding: 18, gap: 12, borderWidth: 1, borderColor: t.line },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kicker: { fontSize: 10, fontWeight: "700", letterSpacing: 2, color: t.muted },
  balance: { flexDirection: "row", alignItems: "center", gap: 6 },
  balanceText: { fontSize: 14, fontWeight: "700", color: t.foreground, fontVariant: ["tabular-nums"] },
  body: { fontSize: 13, lineHeight: 20, color: t.muted },
  prize: { fontSize: 14, fontWeight: "600", color: t.foreground },
  note: { fontSize: 11, lineHeight: 17, color: t.muted, textAlign: "center" },
  action: { backgroundColor: t.primary, padding: 17, borderRadius: 16, alignItems: "center", minHeight: 54, justifyContent: "center" },
  secondary: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.line },
  actionText: { color: t.foreground, fontWeight: "700", fontSize: 14 },
});
