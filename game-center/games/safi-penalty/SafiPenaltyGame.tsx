import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { LinearGradient } from "expo-linear-gradient";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ActivityIndicator,
  AppState,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMe } from "@/features/auth/AuthProvider";
import { GlassSheet } from "@/components/ui";
import {
  CoinShopContent,
  formatSunCoin,
  FreeAttemptCountdown,
  rewardReplay,
  SunCoin,
  SunCoinHud,
  sunCoinWalletKey,
  useSunCoinWallet,
  type SunCoinWallet,
} from "@/features/sun-coin";
import { useNav } from "@/lib/routes";
import { formatDayMonth } from "@/lib/time";
import { GameSession } from "../../engine/gameSession";
import { sessionJournal } from "../../engine/sessionJournal";
import { useGamePreferences } from "../../engine/useGamePreferences";
import { useGameAudio } from "../../engine/useGameAudio";
import { gameEngagementKey, useGameEngagement } from "../../engagement";
import { useSafiLocker, useSafiPublicConfig } from "../../safiService";
import { EngagementCards } from "../../EngagementCards";
import { feedback, motion, useReduceMotion } from "../../engine/animationUtils";
import { rewardClient } from "../../engine/rewardClient";
import type { GameFeedback, GameMode, GameTransport } from "../../engine/types";
import { safiTheme as t } from "./config";
import { Arena } from "./components/Arena";
import { ModeCards } from "./components/ModeCards";
import { ReplayContent, replayTitle } from "./components/RewardReplay";
import { ResultCelebration } from "./components/ResultCelebration";
import { GameSettings } from "./components/GameSettings";

export function SafiPenaltyGame({
  transport = rewardClient,
  onBack,
  audio: externalAudio,
}: {
  transport?: GameTransport;
  onBack: () => void;
  audio?: GameFeedback;
}) {
  const me = useMe();
  const controller = useMemo(
    () => new GameSession(transport, randomUUID, "safi-penalty", sessionJournal(me.userId)),
    [transport, me.userId],
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getGameState,
    controller.getGameState,
  );
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const systemReduced = useReduceMotion();
  const { preferences, update, loaded, storageError } = useGamePreferences();
  const reduced = systemReduced || preferences.reduceMotion;
  const queryClient = useQueryClient();
  const nav = useNav();
  const wallet = useSunCoinWallet();
  const engagement = useGameEngagement();
  const locker = useSafiLocker();
  const availability = useSafiPublicConfig();
  // One sheet for the replay choice and the shop, so switching between them never stacks two modals.
  const [sheet, setSheet] = useState<null | "replay" | "shop" | "pause" | "settings">(null);
  const shownSheet = useRef<"replay" | "shop" | "pause" | "settings">("replay");
  if (sheet) shownSheet.current = sheet;
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [restoring, setRestoring] = useState(true);
  useEffect(() => {
    let active = true;
    void controller.restore().finally(() => { if (active) setRestoring(false); });
    return () => { active = false; controller.dispose(); };
  }, [controller]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (value) => {
      setForeground(value === "active");
      if (value !== "active") setSheet((s) => s ?? "pause");
    });
    return () => sub.remove();
  }, []);
  const paused = !foreground || sheet !== null || restoring;
  useEffect(() => { controller.setPaused(paused); }, [controller, paused]);
  const audio = useGameAudio(preferences, state.phase, state.session?.attemptsUsed ?? 0, !paused, loaded, externalAudio, state.finish ? state.finish.score >= 5 : undefined);
  // Entering SAFI: the scene fades up out of the dark while the score and ambience come in.
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = motion(enter, 1, 700);
    anim.start();
    return () => anim.stop();
  }, [enter]);
  const refreshWallet = () => void wallet.refetch();
  const start = (mode: GameMode) => {
    setSheet(null);
    void controller.startGame(mode);
  };
  // "Play Reward Mode again": free if today's attempt is still there, otherwise the 10 SC choice first.
  const rewardAgain = () => {
    if (wallet.data && rewardReplay(wallet.data).kind === "free") start("free");
    else setSheet("replay");
  };
  const rewardOpen = wallet.data ? rewardReplay(wallet.data).kind !== "closed" : false;
  const [containerWidth, setContainerWidth] = useState(width);
  const arenaWidth = Math.max(240, Math.min(containerWidth - 32, 480));
  const finish = state.finish;
  const notifiedReward = useRef<string | null>(null);
  const notifiedEngagement = useRef<string | null>(null);
  // The server has already decided and granted the reward; the app only celebrates it.
  const reward = finish?.reward ?? null;
  useEffect(() => {
    if (!reward || paused || notifiedReward.current === state.session?.sessionId) return;
    notifiedReward.current = state.session?.sessionId ?? null;
    feedback("reward", reduced, audio);
    if (reward.type === "PRO_DAYS") {
      void queryClient.invalidateQueries({ queryKey: ["plan"] });
      void queryClient.invalidateQueries({ queryKey: ["pro"] });
    }
  }, [reward, reduced, audio, queryClient, paused, state.session?.sessionId]);
  // The wallet follows the server at once: a paid start debits, a finished round may credit.
  const sessionId = state.session?.sessionId;
  const coinBalance = state.finish?.coinBalance ?? state.session?.coinBalance;
  useEffect(() => {
    if (!sessionId) return;
    if (coinBalance != null) {
      queryClient.setQueryData<SunCoinWallet>(sunCoinWalletKey(me.userId), (w) => (w ? { ...w, balance: coinBalance } : w));
    }
    void queryClient.invalidateQueries({ queryKey: ["sun-coin"] });
  }, [sessionId, coinBalance, state.finish, me.userId, queryClient]);
  useEffect(() => {
    if (!state.finish?.engagement || paused || notifiedEngagement.current === sessionId) return;
    notifiedEngagement.current = sessionId ?? null;
    void queryClient.invalidateQueries({ queryKey: gameEngagementKey(me.userId) });
    if (state.finish.engagement.unlockedAchievements.length)
      feedback("achievement", reduced, audio);
    else if (state.finish.engagement.newPersonalBest)
      feedback("personalBest", reduced, audio);
  }, [state.finish, me.userId, queryClient, reduced, audio, paused, sessionId]);
  const starting = state.phase === "IDLE" || state.phase === "STARTING";
  const message =
    state.phase === "READY"
      ? "Nishonni tanlang"
      : state.phase === "SHOOTING"
        ? "Zarba…"
        : state.phase === "RESOLVING"
          ? state.shot?.result === "GOAL"
            ? "GOL!"
            : "Ushladi!"
          : "";
  // While a round is on, the page goes dark so the goal, the keeper and the egg are all there is.
  const immersive = !starting && state.phase !== "FINISHED";
  const ink = immersive ? "#FFFFFF" : t.foreground;
  return (
    <Animated.View style={{ flex: 1, backgroundColor: immersive ? t.arenaDeep : t.background, opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }] }}>
    <ScrollView
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={[s.page, immersive && { backgroundColor: t.arenaDeep }]}
      contentContainerStyle={[
        s.content,
        {
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 20) + 16,
        },
      ]}
    >
      <View style={[s.header, { width: arenaWidth }]}>
        <Pressable
          onPress={() => (starting ? onBack() : setSheet("pause"))}
          accessibilityRole="button"
          accessibilityLabel={starting ? "Orqaga" : "O‘yinni pauza qilish"}
          style={[s.back, immersive && s.backDark]}
        >
          <Text style={[s.backText, { color: ink }]}>{starting ? "‹" : "Ⅱ"}</Text>
        </Pressable>
        <SunCoinHud balance={wallet.data?.balance} animated={!reduced && !paused} onPress={() => setSheet("shop")} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ovoz va sozlamalar"
          onPress={() => setSheet("settings")}
          style={[s.back, immersive && s.backDark]}
        >
          <Text style={[s.backText, { color: ink, fontSize: 20, opacity: preferences.master ? 1 : 0.4 }]}>♪</Text>
        </Pressable>
      </View>
      {state.phase !== "FINISHED" ? (
        <>
          {starting ? <Text style={s.title}>SAFI Penalty</Text> : null}
          <Arena
            width={arenaWidth}
            state={state}
            controller={controller}
            reduced={reduced}
            audio={audio}
            paused={paused}
            locker={locker.data}
          />
          {starting ? (
            <View style={[s.below, { width: arenaWidth }]}>
              {restoring ? <ActivityIndicator color={t.primary} /> : availability.data?.enabled === false ? <Text style={s.footnote}>SAFI vaqtincha yopiq. Keyinroq qayta urinib ko‘ring.</Text> : state.phase === "STARTING" ? (
                <Action title="Tayyorlanmoqda…" busy onPress={() => undefined} />
              ) : (
                <ModeCards
                  wallet={wallet.data}
                  loading={wallet.isPending}
                  busy={state.busy}
                  onStart={start}
                  onRewardAgain={rewardAgain}
                  onRefresh={refreshWallet}
                  practiceEnabled={availability.data?.practiceEnabled}
                />
              )}
            </View>
          ) : (
            <View style={[s.hud, { width: arenaWidth }]}>
              <View>
                <Text style={[s.statLabel, immersive && { color: "#9FB09A" }]}>GOL</Text>
                <ScoreValue score={state.session?.score ?? 0} reduced={reduced} color={ink} />
              </View>
              <Text accessibilityLiveRegion="polite" style={[s.instruction, { color: ink }]}>
                {message}
              </Text>
              <View style={s.scoreRight}>
                <Text style={[s.statLabel, immersive && { color: "#9FB09A" }]}>URINISH</Text>
                <Text style={[s.stat, { color: ink }]}>
                  {String(Math.max(0, (state.session?.attempts ?? 10) - (state.session?.attemptsUsed ?? 0))).padStart(2, "0")}
                  <Text style={s.statSuffix}> qoldi</Text>
                </Text>
              </View>
            </View>
          )}
        </>
      ) : finish ? (
        <LinearGradient
          colors={["#FFFFFF", "#EDF3E5"]}
          style={[s.result, { width: arenaWidth }]}
        >
          <Image
            source={t.logoLight}
            resizeMode="contain"
            style={s.resultLogo}
            accessibilityLabel="SAFI"
          />
          <Text style={s.kicker}>O‘YIN YAKUNLANDI</Text>
          <ResultCelebration key={sessionId} score={finish.score} attempts={finish.attempts} reduced={reduced} paused={paused} />
          <Text style={s.resultTitle}>
            {reward
              ? "AJOYIB!"
              : finish.score >= 7
                ? "Yaxshi zarbalar!"
                : finish.score >= 4
                  ? "Yaxshi boshlanish!"
                  : "Yana urinib ko‘ramiz!"}
          </Text>
          {reward?.type === "SUN_COIN" ? (
            <View accessibilityLiveRegion="polite" style={s.coinWin}>
              <SunCoin size={48} animated={!reduced && !paused} />
              <View>
                <Text style={s.coinAmount}>+{reward.amount} SUN COIN</Text>
                {finish.coinBalance != null ? (
                  <Text style={s.coinBalance}>Balans: {formatSunCoin(finish.coinBalance)}</Text>
                ) : null}
              </View>
            </View>
          ) : reward?.type === "PRO_DAYS" ? (
            <View accessibilityLiveRegion="polite" style={s.reveal}>
              <Text style={s.coinAmount}>+{reward.amount} KUN PRO</Text>
              <Text style={s.coinBalance}>
                {reward.endsAt ? `Pro ${formatDayMonth(reward.endsAt)} gacha uzaytirildi.` : "Pro muddati akkauntingizda uzaytirildi."}
              </Text>
            </View>
          ) : null}
          <Text style={s.description}>
            {state.session?.mode === "practice"
              ? "Mashq rejimi: sovg‘alar faqat sovg‘ali o‘yinda."
              : "Har bir zarba — yangi imkoniyat."}
          </Text>
          <View style={{ flexDirection: "row", gap: 20, justifyContent: "center" }}>
            <Text style={s.footnote}>Rekord: {finish.engagement?.personalBest ?? engagement.data?.stats.personalBest ?? "—"}/10</Text>
            <Text style={s.footnote}>Kombo: ×{finish.engagement?.longestCombo ?? "—"}</Text>
          </View>
          {finish.engagement?.newPersonalBest ? (
            <View style={s.reveal}><Text style={s.coinAmount}>YANGI SHAXSIY REKORD</Text><Text style={s.coinBalance}>{finish.score} / {finish.attempts} gol</Text></View>
          ) : null}
          {finish.engagement?.unlockedAchievements.map((item) => (
            <View key={item.id} style={s.reveal}><Text style={s.coinAmount}>YUTUQ OCHILDI</Text><Text style={s.coinBalance}>{item.title}</Text></View>
          ))}
          {finish.engagement?.completedChallenges.map((item) => (
            <View key={item.id} style={s.reveal}><Text style={s.coinAmount}>CHALLENGE BAJARILDI</Text><Text style={s.coinBalance}>{item.title}{item.coinsAwarded > 0 ? ` · +${item.coinsAwarded} SC` : ""}</Text></View>
          ))}
          <View style={s.resultActions}>
            {rewardOpen ? (
              <Action
                title="YANA REWARD O‘YNASH"
                busy={state.busy}
                onPress={rewardAgain}
              />
            ) : null}
            <Action title="MASHQ REJIMI" secondary busy={state.busy} onPress={() => start("practice")} />
            <Action title="GAME CENTER" secondary onPress={onBack} />
          </View>
          {rewardOpen && wallet.data && !wallet.data.attempt.freeAvailable && wallet.data.attempt.nextFreeAt ? (
            <View style={s.nextFree}>
              <Text style={s.footnote}>Keyingi bepul urinish</Text>
              <FreeAttemptCountdown
                nextFreeAt={wallet.data.attempt.nextFreeAt}
                offsetMs={wallet.data.clockOffsetMs}
                onElapsed={refreshWallet}
                style={s.nextFreeValue}
              />
            </View>
          ) : null}
        </LinearGradient>
      ) : null}
      {(starting || finish) && engagement.data ? <View style={{ width: arenaWidth }}><EngagementCards engagement={engagement.data} /></View> : null}
      {state.error ? (
        <View
          accessibilityRole="alert"
          style={[s.error, { width: arenaWidth }]}
        >
          <Text style={s.errorText}>{state.error}</Text>
          {state.phase !== "FINISHED" && state.phase !== "IDLE" ? (
            <Action
              title="Qayta urinish"
              busy={state.busy}
              onPress={() => void controller.retry()}
              secondary
            />
          ) : null}
          {!starting && state.phase !== "FINISHED" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => controller.leaveRound()}
              style={s.cancel}
            >
              <Text style={s.footnote}>Boshlanishiga qaytish</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <GlassSheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        eyebrow={shownSheet.current === "shop" ? "SUN COIN" : shownSheet.current === "pause" || shownSheet.current === "settings" ? "SAFI PENALTY" : "REWARD MODE"}
        title={shownSheet.current === "shop" ? "Coin Shop" : shownSheet.current === "pause" ? "Pauza" : shownSheet.current === "settings" ? "O‘yin sozlamalari" : replayTitle(wallet.data)}
      >
        {shownSheet.current === "settings" ? <GameSettings value={preferences} update={update} storageError={storageError} /> : shownSheet.current === "pause" ? (
          <View style={s.resultActions}>
            <Action title="DAVOM ETISH" onPress={() => setSheet(null)} />
            <Action title="SOZLAMALAR" secondary onPress={() => setSheet("settings")} />
            <Action title="GAME CENTERGA QAYTISH" secondary onPress={onBack} />
          </View>
        ) : shownSheet.current === "shop" ? (
          <CoinShopContent
            onOpenWallet={() => {
              setSheet(null);
              nav.go("/account/sun-coin");
            }}
          />
        ) : wallet.data ? (
          <ReplayContent
            wallet={wallet.data}
            busy={state.busy}
            onPlayFree={() => start("free")}
            onPlayPaid={() => start("paid")}
            onPractice={() => start("practice")}
            onBuy={() => setSheet("shop")}
            onRefresh={refreshWallet}
          />
        ) : null}
      </GlassSheet>
    </ScrollView>
    </Animated.View>
  );
}
function ScoreValue({ score, reduced, color }: { score: number; reduced: boolean; color: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced) return;
    pulse.setValue(0);
    const animation = motion(pulse, 1, 220);
    animation.start();
    return () => animation.stop();
  }, [score, reduced, pulse]);
  return (
    <Animated.Text
      style={[
        s.stat,
        {
          color,
          opacity: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.6, 1],
          }),
          transform: [
            {
              scale: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.92, 1],
              }),
            },
          ],
        },
      ]}
    >
      {String(score).padStart(2, "0")}
    </Animated.Text>
  );
}
export function Action({
  title,
  onPress,
  busy = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        secondary && s.secondary,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={t.foreground} />
      ) : (
        <Text style={s.actionText}>
          {title}
          <Text> ↗</Text>
        </Text>
      )}
    </Pressable>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: t.background },
  content: { alignItems: "center", gap: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  backDark: { backgroundColor: "rgba(255,255,255,0.1)" },
  backText: { fontSize: 28, lineHeight: 32, color: t.foreground },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.3,
    color: t.muted,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  kicker: { fontSize: 10, fontWeight: "700", letterSpacing: 2, color: t.muted },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1,
    color: t.foreground,
  },
  hud: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  tag: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    backgroundColor: "#E8EFDF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 6,
  },
  tagText: { fontSize: 10, fontWeight: "600", color: t.arena },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: t.primary,
  },
  scoreboard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: t.surface,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "700",
    color: t.muted,
  },
  stat: {
    fontSize: 30,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: t.foreground,
    letterSpacing: -1,
  },
  statSuffix: { fontSize: 16, color: t.muted, fontWeight: "400" },
  scoreDivider: {
    height: 32,
    width: 1,
    backgroundColor: t.line,
    marginHorizontal: 24,
  },
  scoreRight: { flex: 1, alignItems: "flex-end" },
  below: { gap: 14 },
  progress: { flexDirection: "row", gap: 7, justifyContent: "center" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  instruction: {
    flex: 1,
    color: t.foreground,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
  },
  description: {
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    color: t.muted,
  },
  action: {
    backgroundColor: t.primary,
    padding: 17,
    borderRadius: 16,
    alignItems: "center",
    minHeight: 54,
    justifyContent: "center",
  },
  actionText: { color: t.foreground, fontWeight: "700", fontSize: 14 },
  secondary: {
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.line,
  },
  footnote: {
    fontSize: 11,
    lineHeight: 17,
    color: t.muted,
    textAlign: "center",
  },
  footer: { fontSize: 9, letterSpacing: 2, color: t.muted, marginTop: 8 },
  result: {
    padding: 26,
    borderRadius: 28,
    alignItems: "center",
    borderColor: t.white,
    borderWidth: 1,
    gap: 14,
  },
  resultLogo: { width: 72, height: 72, marginBottom: 8 },
  resultScore: {
    fontSize: 84,
    letterSpacing: -5,
    fontWeight: "700",
    color: t.foreground,
  },
  resultTotal: {
    fontSize: 32,
    color: t.muted,
    fontWeight: "400",
    letterSpacing: -1,
  },
  resultTitle: {
    fontSize: 23,
    fontWeight: "600",
    color: t.foreground,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  resultActions: { alignSelf: "stretch", gap: 10, marginTop: 12 },
  reveal: {
    gap: 14,
    alignItems: "center",
    alignSelf: "stretch",
    marginTop: 12,
  },
  error: {
    backgroundColor: t.surface,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: t.line,
  },
  errorText: { color: t.foreground, fontSize: 13, textAlign: "center" },
  cancel: { padding: 12 },
  coinWin: { flexDirection: "row", alignItems: "center", gap: 12 },
  coinAmount: { fontSize: 30, fontWeight: "800", color: t.foreground, letterSpacing: -0.8, fontVariant: ["tabular-nums"] },
  coinBalance: { fontSize: 12, color: t.muted, fontVariant: ["tabular-nums"] },
  nextFree: { alignItems: "center", gap: 2 },
  nextFreeValue: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: t.foreground, letterSpacing: 1 },
});
