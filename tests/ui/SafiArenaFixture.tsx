/** Isolated rendering fixture. Never registered in production navigation; server scenarios run separately in SQL. */
import { useMemo, useState, useSyncExternalStore } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Arena } from "../../game-center/games/safi-penalty/components/Arena";
import { GameSession } from "../../game-center/engine/gameSession";
import { GameSettings } from "../../game-center/games/safi-penalty/components/GameSettings";
import { DEFAULT_PREFERENCES } from "../../game-center/engine/preferences";
import { useGameAudio } from "../../game-center/engine/useGameAudio";
import { SunCoin } from "../../features/sun-coin/SunCoin";
export default function SafiArenaFixture() {
  const [preferences, update] = useState(DEFAULT_PREFERENCES);
  const [settings, setSettings] = useState(false);
  const controller = useMemo(() => {
    let score = 0, n = 0, id = 0;
    return new GameSession({
      async startGame() { score = 0; n = 0; return { sessionId: `fixture-${++id}`, gameId: "safi-penalty", attempts: 10, attemptsUsed: 0, score: 0, rewardEligible: false, rewardReason: "PRACTICE", mode: "practice", expiresAt: "2099", presentation: { arena: "night", personality: "SHOWMAN", boss: true, eventTitle: "QA fixture" } }; },
      async submitShot(r) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        const result = r.selectedZone === 1 || r.selectedZone === 8 ? "CATCH" : "GOAL";
        score += result === "GOAL" ? 1 : 0;
        return { attemptId: r.requestId, sessionId: r.sessionId, attempt: ++n, selectedZone: r.selectedZone, goalkeeperZone: result === "CATCH" ? r.selectedZone : r.selectedZone === 15 ? 1 : r.selectedZone + 1, result, score, attempts: 10, visualEvent: n === 4 ? "LUCKY_EGG" : null };
      },
      async finishGame() { return { score, attempts: 10, boxes: false, flagged: false }; },
    }, () => `shot-${++id}`);
  }, []);
  const state = useSyncExternalStore(controller.subscribe, controller.getGameState);
  const audio = useGameAudio(preferences, state.phase, state.session?.attemptsUsed ?? 0, !state.paused, true);
  return <ScrollView contentContainerStyle={{ alignItems: "center", gap: 14, padding: 20, backgroundColor: "#F2F4EE" }}>
    <Text style={{ color: "#17271B", fontSize: 14, fontWeight: "700" }}>SAFI RENDERING FIXTURE · LOCAL QA</Text>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}><SunCoin size={32} animated={!preferences.reduceMotion && !state.paused} /><Text style={{ fontSize: 22 }}>{state.session?.score ?? 0} gol · {state.session?.attemptsUsed ?? 0}/10</Text></View>
    <Arena width={343} controller={controller} state={state} reduced={preferences.reduceMotion} audio={audio} paused={state.paused} />
    <View style={{ flexDirection: "row", gap: 14 }}>
      <Pressable accessibilityRole="button" onPress={() => void controller.startGame()}><Text>BOSHLASH</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => controller.setPaused(!state.paused)}><Text>{state.paused ? "DAVOM ETISH" : "PAUZA"}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setSettings(!settings)}><Text>SOZLAMALAR</Text></Pressable>
    </View>
    <Text>{state.phase}</Text>
    {settings ? <View style={{ width: 343 }}><GameSettings value={preferences} update={update} storageError={false} /></View> : null}
  </ScrollView>;
}
