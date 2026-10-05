import { Stack } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Screen, Text } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  CoinShopSheet,
  formatSunCoin,
  FreeAttemptCountdown,
  rewardReplay,
  SunCoinHud,
  useSunCoinWallet,
} from "@/features/sun-coin";
import { useNav } from "@/lib/routes";
import { canAccessGameCenter } from "./engine/gameSession";
import { EngagementCards } from "./EngagementCards";
import { useGameEngagement } from "./engagement";
import { safiTheme as t } from "./games/safi-penalty/config";
import { Chicken, Egg } from "./games/safi-penalty/components/Artwork";
import { gameRegistry } from "./registry";

export function GameCenterScreen() {
  const { appInterface } = useAuth();
  const nav = useNav();
  const wallet = useSunCoinWallet();
  const engagement = useGameEngagement();
  const [shop, setShop] = useState(false);
  if (!canAccessGameCenter(appInterface)) return null;
  const w = wallet.data;
  const replay = w ? rewardReplay(w) : null;
  return (
    <Screen edges={["bottom"]} contentStyle={s.screen}>
      <Stack.Screen options={{ title: "Game Center" }} />
      <View style={s.heading}>
        <View style={s.headingTop}>
          <Text variant="label" tone="secondary">
            SUN MEDIA
          </Text>
          <SunCoinHud balance={w?.balance} onPress={() => setShop(true)} />
        </View>
        <Text variant="display">Game Center</Text>
        <Text variant="body" tone="secondary">
          Bir oz tanaffus. Bir oz raqobat.
        </Text>
      </View>
      {engagement.data ? <EngagementCards engagement={engagement.data} /> : null}
      {engagement.data ? (
        <Pressable accessibilityRole="button" onPress={() => nav.go("/games/statistics")} style={s.statsLink}>
          <Text style={s.statsLinkText}>Zarba xaritasi va statistika ↗</Text>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" onPress={() => nav.go("/games/locker")} style={s.statsLink}>
        <Text style={s.statsLinkText}>SAFI Club · kolleksiya va reyting ↗</Text>
      </Pressable>
      {gameRegistry.map((g) =>
        g.id === "safi-penalty" ? (
          <Pressable
            key={g.id}
            onPress={() => nav.go("/games/safi-penalty")}
            accessibilityRole="button"
            accessibilityLabel="SAFI Penalty o‘ynash"
            style={s.card}
          >
            <View style={s.cardTop}>
              <Image source={t.logoDark} resizeMode="contain" style={s.logo} />
              <View style={s.pill}>
                <Text style={s.pillText}>HAMMA UCHUN</Text>
              </View>
            </View>
            <View style={s.art}>
              <View style={s.goal} />
              <View style={s.chicken}>
                <Chicken />
              </View>
              <View style={s.egg}>
                <Egg />
              </View>
            </View>
            <View style={s.cardBottom}>
              <View>
                <Text style={s.brand}>SAFI ORIGINAL</Text>
                <Text style={s.cardTitle}>Penalty</Text>
                <Text style={s.subtitle}>{g.subtitle}</Text>
              </View>
              <View style={s.arrow}>
                <Text style={s.arrowText}>↗</Text>
              </View>
            </View>
            <View style={s.cardFooter}>
              <Text style={s.cardMeta}>10 ZARBA</Text>
              <Text style={s.cardMeta}>15 NISHON</Text>
              <Text style={s.cardMeta}>MASHQ + REWARD</Text>
            </View>
            {/* Reward Mode at a glance: today's free attempt, or when the next one comes and what an extra costs */}
            {replay && replay.kind !== "closed" && w ? (
              <View style={s.reward}>
                <Text style={s.rewardLabel}>REWARD MODE</Text>
                {replay.kind === "free" ? (
                  <Text style={s.rewardValue}>Bugungi bepul urinish mavjud</Text>
                ) : (
                  <View style={s.rewardRow}>
                    <Text style={s.rewardMuted}>Keyingi bepul</Text>
                    <FreeAttemptCountdown
                      nextFreeAt={w.attempt.nextFreeAt}
                      offsetMs={w.clockOffsetMs}
                      onElapsed={() => void wallet.refetch()}
                      style={s.rewardValue}
                    />
                    <Text style={s.rewardMuted}>· qo‘shimcha {formatSunCoin(w.attempt.cost)}</Text>
                  </View>
                )}
              </View>
            ) : null}
          </Pressable>
        ) : (
          <View key={g.id} style={s.coming}>
            <View style={s.comingIcon}>
              <Text style={s.w}>W</Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text variant="heading">{g.title}</Text>
              <Text variant="caption" tone="secondary">
                {g.subtitle}
              </Text>
            </View>
            <Text variant="captionMedium" tone="tertiary">
              Tez kunda
            </Text>
          </View>
        ),
      )}
      <CoinShopSheet visible={shop} onClose={() => setShop(false)} onOpenWallet={() => { setShop(false); nav.go("/account/sun-coin"); }} />
      <Text variant="caption" tone="tertiary" style={s.note}>
        O‘yinlar barcha clientlar uchun ochiq. Sovg‘alar faol kampaniya va uning
        shartlariga bog‘liq.
      </Text>
    </Screen>
  );
}
const s = StyleSheet.create({
  screen: { gap: 22, paddingBottom: 32 },
  heading: { gap: 8, marginTop: 8 },
  headingTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statsLink: { alignSelf: "center", width: "100%", maxWidth: 540, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, backgroundColor: t.surface },
  statsLinkText: { color: t.arena, fontSize: 13, fontWeight: "700" },
  reward: { paddingHorizontal: 24, paddingVertical: 14, gap: 4, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.06)" },
  rewardLabel: { color: t.primary, fontSize: 9, letterSpacing: 2, fontWeight: "700" },
  rewardRow: { flexDirection: "row", alignItems: "baseline", gap: 6, flexWrap: "wrap" },
  rewardValue: { color: t.white, fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
  rewardMuted: { color: "#AAB8A6", fontSize: 12 },
  card: {
    backgroundColor: t.arenaDeep,
    borderRadius: 28,
    overflow: "hidden",
    maxWidth: 540,
    width: "100%",
    alignSelf: "center",
  },
  cardTop: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: { width: 56, height: 56 },
  pill: {
    backgroundColor: "rgba(255,255,255,.08)",
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  pillText: { color: t.white, fontSize: 9, letterSpacing: 1 },
  art: { height: 128, alignItems: "center" },
  goal: {
    position: "absolute",
    left: "10%",
    right: "10%",
    top: 8,
    height: 100,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: "rgba(255,255,255,.3)",
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  chicken: { width: 125, height: 141, position: "absolute", top: -4 },
  egg: {
    width: 25,
    height: 31,
    position: "absolute",
    bottom: -4,
    right: "22%",
    transform: [{ rotate: "22deg" }],
  },
  cardBottom: {
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { color: t.primary, fontSize: 9, letterSpacing: 2, fontWeight: "700" },
  cardTitle: {
    color: t.white,
    fontSize: 42,
    lineHeight: 51,
    fontWeight: "700",
    letterSpacing: -2,
  },
  subtitle: { color: "#D0D9CA", fontSize: 12 },
  arrow: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: t.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: { fontSize: 26, color: t.foreground },
  cardFooter: {
    paddingHorizontal: 24,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(112,188,34,.12)",
  },
  cardMeta: { color: "#C7D4C2", fontSize: 9, letterSpacing: 1.3 },
  coming: {
    padding: 18,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: 22,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  comingIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#ECE9E4",
    alignItems: "center",
    justifyContent: "center",
  },
  w: { fontSize: 23, color: t.muted, fontWeight: "700" },
  note: { textAlign: "center", lineHeight: 19 },
});
