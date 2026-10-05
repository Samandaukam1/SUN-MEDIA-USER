import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SunCoinIcon } from "@/features/sun-coin";
import type { GameEngagement } from "./engagement";
import { safiTheme as t } from "./games/safi-penalty/config";

export function EngagementCards({ engagement }: { engagement: GameEngagement }) {
  const [showAll, setShowAll] = useState(false);
  const [allChallenges, setAllChallenges] = useState(false);
  const challenges = allChallenges ? engagement.challenges : engagement.challenges.slice(0, 1);
  const unlocked = engagement.achievements.filter((a) => a.unlocked).length;
  return (
    <View style={s.stack}>
      {challenges.map((featured) => (
        <View key={featured.id} style={s.challenge}>
          <View style={s.topline}>
            <Text style={s.eyebrow}>BUGUNGI CHALLENGE</Text>
            <Text style={s.day}>{engagement.dayKey}</Text>
          </View>
          <Text style={s.challengeTitle}>{featured.title}</Text>
          <Text style={s.detail}>{featured.description}</Text>
          <View style={s.progressRow}>
            <Text style={s.progressCount}>{Math.min(featured.progress, featured.target)} / {featured.target}</Text>
            {featured.completed ? <Text style={s.done}>BAJARILDI ✓</Text> : featured.rewardCoins > 0 ? (
              <View style={s.coinReward}><SunCoinIcon size={19} /><Text style={s.coinText}>+{featured.rewardCoins} SC</Text></View>
            ) : <Text style={s.detail}>Yutuq progressi</Text>}
          </View>
          <View style={s.track} accessibilityLabel={`${Math.min(featured.progress, featured.target)} / ${featured.target} challenge progress`}>
            <View style={[s.fill, { width: `${Math.min(100, featured.progress / featured.target * 100)}%` }]} />
          </View>
        </View>
      ))}
      {engagement.challenges.length > 1 ? <Pressable accessibilityRole="button" onPress={() => setAllChallenges((v) => !v)} style={s.showAll}><Text style={s.showAllText}>{allChallenges ? "Vazifalarni yopish" : `Barcha ${engagement.challenges.length} ta bugungi vazifa`} ↗</Text></Pressable> : null}
      <View style={s.metrics}>
        <View style={s.metric}><Text style={s.metricIcon}>◇</Text><Text style={s.metricValue}>{engagement.streak.current}</Text><Text style={s.metricLabel}>KUNLIK SERIYA</Text></View>
        <View style={s.divider} />
        <View style={s.metric}><Text style={s.metricIcon}>↗</Text><Text style={s.metricValue}>{engagement.stats.personalBest} / 10</Text><Text style={s.metricLabel}>ENG YAXSHI NATIJA</Text></View>
      </View>
      <View style={s.library}>
        <View style={s.topline}>
          <Text style={s.eyebrow}>YUTUQLAR</Text>
          <Text style={s.count}>{unlocked} / {engagement.achievements.length}</Text>
        </View>
        {engagement.achievements.slice(0, showAll ? undefined : 3).map((a) => (
          <View key={a.id} style={s.achievement}>
            <View style={[s.badge, a.unlocked && s.badgeUnlocked]}><Text style={s.badgeText}>{a.unlocked ? "✦" : "○"}</Text></View>
            <View style={s.achievementBody}>
              <Text style={s.achievementTitle}>{a.title}</Text>
              <Text style={s.detail}>{a.description}</Text>
            </View>
            <Text style={s.achievementProgress}>{a.unlocked ? "✓" : `${Math.min(a.progress, a.target)}/${a.target}`}</Text>
          </View>
        ))}
        {engagement.achievements.length > 3 ? (
          <Pressable accessibilityRole="button" onPress={() => setShowAll((v) => !v)} style={s.showAll}>
            <Text style={s.showAllText}>{showAll ? "Kamroq ko‘rsatish" : "Barcha yutuqlar"} ↗</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  stack: { width: "100%", maxWidth: 540, alignSelf: "center", gap: 14 },
  challenge: { padding: 22, borderRadius: 24, backgroundColor: "#202923", gap: 7 },
  topline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: t.primary, fontSize: 10, fontWeight: "800", letterSpacing: 1.8 },
  day: { color: "#9DAF9D", fontSize: 10 },
  challengeTitle: { color: t.white, fontSize: 23, fontWeight: "800", marginTop: 5 },
  detail: { color: "#AAB8A6", fontSize: 12, lineHeight: 18 },
  progressRow: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressCount: { color: t.white, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
  done: { color: t.primary, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  coinReward: { flexDirection: "row", alignItems: "center", gap: 5 },
  coinText: { color: t.white, fontSize: 12, fontWeight: "700" },
  track: { height: 8, borderRadius: 8, backgroundColor: "rgba(255,255,255,.11)", overflow: "hidden", marginTop: 4 },
  fill: { height: 8, borderRadius: 8, backgroundColor: t.primary },
  more: { color: "#9DAF9D", fontSize: 11, marginTop: 6 },
  metrics: { flexDirection: "row", alignItems: "center", paddingVertical: 18, borderRadius: 22, backgroundColor: t.surface },
  metric: { flex: 1, alignItems: "center", gap: 3 },
  metricIcon: { color: t.primary, fontSize: 20, fontWeight: "700" },
  metricValue: { color: t.foreground, fontSize: 23, fontWeight: "800" },
  metricLabel: { color: t.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  divider: { height: 40, width: 1, backgroundColor: t.line },
  library: { padding: 21, borderRadius: 24, backgroundColor: t.surface, gap: 12 },
  count: { color: t.muted, fontSize: 11, fontWeight: "700" },
  achievement: { flexDirection: "row", alignItems: "center", gap: 12 },
  badge: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#E5E9E1", alignItems: "center", justifyContent: "center" },
  badgeUnlocked: { backgroundColor: "#D9EDC9" },
  badgeText: { color: t.arena, fontSize: 20, fontWeight: "700" },
  achievementBody: { flex: 1, gap: 2 },
  achievementTitle: { color: t.foreground, fontWeight: "700", fontSize: 13 },
  achievementProgress: { color: t.arena, fontWeight: "700", fontSize: 12 },
  showAll: { alignSelf: "flex-start", paddingVertical: 5 },
  showAllText: { color: t.arena, fontSize: 12, fontWeight: "800" },
});
