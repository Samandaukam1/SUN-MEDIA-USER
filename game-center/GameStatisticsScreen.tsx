import { Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/features/auth/AuthProvider";
import { Screen } from "@/components/ui";
import { useGameEngagement } from "./engagement";
import { canAccessGameCenter } from "./engine/gameSession";
import { safiTheme as t } from "./games/safi-penalty/config";
import { ZONES } from "./games/safi-penalty/physics";

export function GameStatisticsScreen() {
  const { appInterface } = useAuth();
  const engagement = useGameEngagement();
  if (!canAccessGameCenter(appInterface)) return null;
  const stats = engagement.data?.stats;
  const topGoalZone = stats?.zones.reduce((best, z) => z.goals > (best?.goals ?? 0) ? z : best, undefined as typeof stats.zones[number] | undefined);
  const topSaveZone = stats?.zones.reduce((best, z) => z.saves > (best?.saves ?? 0) ? z : best, undefined as typeof stats.zones[number] | undefined);
  return (
    <Screen scroll contentStyle={s.screen}>
      <Stack.Screen options={{ title: "SAFI statistika" }} />
      <Text style={s.eyebrow}>GAME CENTER · SAFI PENALTY</Text>
      <Text style={s.title}>O‘yin statistikasi</Text>
      {stats ? (
        <>
          <View style={s.grid}>
            <Metric title="ENG YAXSHI" value={`${stats.personalBest} / 10`} />
            <Metric title="O‘YINLAR" value={String(stats.gamesPlayed)} />
            <Metric title="GOLLAR" value={String(stats.goals)} />
            <Metric title="ENG UZOQ KOMBO" value={`×${stats.longestCombo}`} />
            <Metric title="MASHQ O‘YINLARI" value={stats.practiceRounds == null ? "—" : String(stats.practiceRounds)} />
            <Metric title="SOVG‘ALI O‘YINLAR" value={stats.rewardRounds == null ? "—" : String(stats.rewardRounds)} />
            <Metric title="O‘RTACHA NATIJA" value={stats.averageScore == null ? "—" : `${stats.averageScore.toFixed(1)} / 10`} />
            <Metric title="QAYTARILGAN" value={String(stats.savesFaced)} />
          </View>
          <View style={s.card}>
            <Text style={s.cardEyebrow}>ZARBA XARITASI</Text>
            <Text style={s.subtitle}>Darvozadagi har bir nuqtadagi natijangiz</Text>
            <View style={s.heatmap}>
              {ZONES.map((zone) => {
                const result = stats.zones.find((z) => z.zone === zone.id);
                const rate = result?.shots ? result.goals / result.shots : 0;
                return (
                  <View key={zone.id} accessible accessibilityLabel={`${zone.label}: ${result?.shots ?? 0} zarba, ${result?.goals ?? 0} gol, ${result?.saves ?? 0} save, ${result?.shots ? Math.round(rate * 100) + " foiz gol" : "foiz hali yo‘q"}`} style={[s.zone, { backgroundColor: result?.shots ? `rgba(112,188,34,${0.16 + rate * 0.68})` : "rgba(255,255,255,.06)" }]}>
                    <Text style={s.zoneGoals}>{result?.shots ? `${Math.round(rate * 100)}%` : "—"}</Text>
                    <Text style={s.zoneShots}>{result?.shots ?? 0} zarba</Text>
                    <Text style={s.zoneShots}>{result?.goals ?? 0} gol · {result?.saves ?? 0} save</Text>
                  </View>
                );
              })}
            </View>
            <Text style={s.legend}>Har katak: gol foizi, zarbalar, gollar va saves · yorqinroq rang = yuqori gol foizi</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardEyebrow}>MAYDONDAGI IZLARINGIZ</Text>
            <Insight label="Sevimli nishon" value={stats.favoriteZone ? ZONES[stats.favoriteZone - 1]?.label ?? "—" : "Hali aniqlanmadi"} />
            <Insight label="Eng sermahsul nishon" value={topGoalZone?.goals ? `${ZONES[topGoalZone.zone - 1]?.label} · ${topGoalZone.goals}` : "Hali gol yo‘q"} />
            <Insight label="SAFI eng ko‘p qaytargan joy" value={topSaveZone?.saves ? `${ZONES[topSaveZone.zone - 1]?.label} · ${topSaveZone.saves}` : "Hali qaytarilgan zarba yo‘q"} />
            <Insight label="Jami zarbalar" value={String(stats.shots)} />
          </View>
          {stats.recentPerformance?.length ? <View style={s.card}><Text style={s.cardEyebrow}>OXIRGI NATIJALAR</Text>{stats.recentPerformance.map((round, i) => <Insight key={`${round.completedAt}-${i}`} label={round.mode === "practice" ? "Mashq" : "Sovg‘ali"} value={`${round.score} / 10 · ${new Date(round.completedAt).toLocaleDateString("uz-UZ")}`} />)}</View> : null}
        </>
      ) : <Text style={s.subtitle}>{engagement.isPending ? "Statistika yuklanmoqda…" : "Statistika hozir ochilmadi. Qayta urinib ko‘ring."}</Text>}
    </Screen>
  );
}

function Metric({ title, value }: { title: string; value: string }) { return <View style={s.metric}><Text style={s.metricValue}>{value}</Text><Text style={s.metricTitle}>{title}</Text></View>; }
function Insight({ label, value }: { label: string; value: string }) { return <View style={s.insight}><Text style={s.insightLabel}>{label}</Text><Text style={s.insightValue}>{value}</Text></View>; }
const s = StyleSheet.create({
  screen: { gap: 18, paddingBottom: 40 },
  eyebrow: { color: t.arena, fontSize: 10, fontWeight: "800", letterSpacing: 1.8, marginTop: 10 },
  title: { color: t.foreground, fontSize: 32, fontWeight: "800" },
  subtitle: { color: t.muted, fontSize: 13, lineHeight: 19 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { width: "48%", flexGrow: 1, padding: 17, borderRadius: 20, backgroundColor: t.surface, gap: 4 },
  metricValue: { color: t.foreground, fontSize: 27, fontWeight: "800" },
  metricTitle: { color: t.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  card: { padding: 20, borderRadius: 24, backgroundColor: t.arenaDeep, gap: 12 },
  cardEyebrow: { color: t.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  heatmap: { flexDirection: "row", flexWrap: "wrap", gap: 5, borderColor: "rgba(255,255,255,.2)", borderWidth: 2, padding: 5, borderRadius: 8 },
  zone: { width: "18%", flexGrow: 1, height: 76, borderRadius: 7, gap: 3, alignItems: "center", justifyContent: "center" },
  zoneGoals: { color: t.white, fontSize: 15, fontWeight: "800" },
  zoneShots: { color: "#D2E2CE", fontSize: 8 },
  legend: { color: "#AAB8A6", fontSize: 11 },
  insight: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.1)", paddingTop: 12, gap: 3 },
  insightLabel: { color: "#9DAF9D", fontSize: 11 },
  insightValue: { color: t.white, fontSize: 14, fontWeight: "700" },
});
