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
import { feedback, motion, useReduceMotion } from "../../engine/animationUtils";
import {
  rewardClient,
  rewardModeLabel,
  rewardReasonText,
} from "../../engine/rewardClient";
import type { GameFeedback, GameMode, GameTransport, Session } from "../../engine/types";
import { safiTheme as t } from "./config";
import { Arena } from "./components/Arena";
import { ModeCards } from "./components/ModeCards";
import { ReplayContent, replayTitle } from "./components/RewardReplay";

function modeLabel(session: Session) {
  if (session.mode === "free") return "Sovg‘ali · bepul urinish";
  if (session.mode === "paid") return "Sovg‘ali · SUN Coin urinish";
  return rewardModeLabel(session.rewardEligible);
}

export function SafiPenaltyGame({
  transport = rewardClient,
  onBack,
  audio,
}: {
  transport?: GameTransport;
  onBack: () => void;
  audio?: GameFeedback;
}) {
  const controller = useMemo(
    () => new GameSession(transport, randomUUID),
    [transport],
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getGameState,
    controller.getGameState,
  );
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReduceMotion();
  const queryClient = useQueryClient();
  const me = useMe();
  const nav = useNav();
  const wallet = useSunCoinWallet();
  // One sheet for the replay choice and the shop, so switching between them never stacks two modals.
  const [sheet, setSheet] = useState<null | "replay" | "shop">(null);
  const shownSheet = useRef<"replay" | "shop">("replay");
  if (sheet) shownSheet.current = sheet;
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
  // The server has already decided and granted the reward; the app only celebrates it.
  const reward = finish?.reward ?? null;
  useEffect(() => {
    if (!reward) return;
    feedback("reward", reduced, audio);
    if (reward.type === "PRO_DAYS") {
      void queryClient.invalidateQueries({ queryKey: ["plan"] });
      void queryClient.invalidateQueries({ queryKey: ["pro"] });
    }
  }, [reward, reduced, audio, queryClient]);
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
  const starting = state.phase === "IDLE" || state.phase === "STARTING";
  const message =
    state.phase === "READY"
      ? "Darvozadagi nuqtani tanlang"
      : state.phase === "SHOOTING"
        ? "Zarba…"
        : state.phase === "RESOLVING"
          ? state.shot?.result === "GOAL"
            ? "GOL! Chiroyli zarba."
            : "Ushlab oldi! Keyingisiga tayyorlaning."
          : state.phase === "RESETTING"
            ? "Keyingi zarbaga tayyor…"
            : "Nishonni tanlang. Tuxumni darvozaga kiriting.";
  return (
    <ScrollView
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={s.page}
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
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Game Centerga qaytish"
          style={s.back}
        >
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <Text style={s.eyebrow}>GAME CENTER</Text>
        <SunCoinHud balance={wallet.data?.balance} onPress={() => setSheet("shop")} />
      </View>
      <View style={[s.titleRow, { width: arenaWidth }]}>
        <View>
          <Text style={s.kicker}>SAFI ORIGINAL</Text>
          <Text style={s.title}>Penalty</Text>
        </View>
        <View style={s.tag}>
          <View style={s.greenDot} />
          <Text style={s.tagText}>
            {state.session ? modeLabel(state.session) : "10 zarba · 15 nishon"}
          </Text>
        </View>
      </View>
      {state.phase !== "FINISHED" ? (
        <>
          <View style={[s.scoreboard, { width: arenaWidth }]}>
            <View>
              <Text style={s.statLabel}>URINISH</Text>
              <Text style={s.stat}>
                {String(state.session?.attemptsUsed ?? 0).padStart(2, "0")}
                <Text style={s.statSuffix}> / 10</Text>
              </Text>
            </View>
            <View style={s.scoreDivider} />
            <View style={s.scoreRight}>
              <Text style={s.statLabel}>GOL</Text>
              <ScoreValue score={state.session?.score ?? 0} reduced={reduced} />
            </View>
          </View>
          <Arena
            width={arenaWidth}
            state={state}
            controller={controller}
            reduced={reduced}
            audio={audio}
          />
          <View style={[s.below, { width: arenaWidth }]}>
            <View
              style={s.progress}
              accessibilityLabel={`${state.session?.attemptsUsed ?? 0} / 10 urinish`}
            >
              {Array.from({ length: 10 }, (_, i) => (
                <View
                  key={i}
                  style={[
                    s.dot,
                    {
                      backgroundColor:
                        i < (state.session?.attemptsUsed ?? 0)
                          ? t.primary
                          : t.line,
                    },
                  ]}
                />
              ))}
            </View>
            <Text accessibilityLiveRegion="polite" style={s.instruction}>
              {message}
            </Text>
            {starting ? (
              <>
                <Text style={s.description}>
                  Tovuq — darvozabon. Sizning to‘pingiz — tuxum.{`\n`}10 ta
                  zarba. Nechtasini gol qilasiz?
                </Text>
                {state.phase === "STARTING" ? (
                  <Action title="Tayyorlanmoqda…" busy onPress={() => undefined} />
                ) : (
                  <ModeCards
                    wallet={wallet.data}
                    loading={wallet.isPending}
                    busy={state.busy}
                    onStart={start}
                    onRewardAgain={rewardAgain}
                    onRefresh={refreshWallet}
                  />
                )}
              </>
            ) : state.session && !state.session.rewardEligible ? (
              <Text style={s.footnote}>
                {rewardReasonText(state.session.rewardReason)} Istalgancha mashq
                qiling.
              </Text>
            ) : (
              <Text style={s.footnote}>
                Sovg‘a imkoniyati natijadan keyin ochiladi.
              </Text>
            )}
          </View>
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
          <Text style={s.resultScore}>
            {finish.score}
            <Text style={s.resultTotal}> / {finish.attempts}</Text>
          </Text>
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
              <SunCoin size={48} />
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
      <Text style={s.footer}>SAFI × SUN MEDIA</Text>
      <GlassSheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        eyebrow={shownSheet.current === "shop" ? "SUN COIN" : "REWARD MODE"}
        title={shownSheet.current === "shop" ? "Coin Shop" : replayTitle(wallet.data)}
      >
        {shownSheet.current === "shop" ? (
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
  );
}
function ScoreValue({ score, reduced }: { score: number; reduced: boolean }) {
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
          color: t.arena,
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
  content: { alignItems: "center", gap: 18 },
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
  backText: { fontSize: 32, lineHeight: 36, color: t.foreground },
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
    fontSize: 44,
    fontWeight: "700",
    letterSpacing: -2,
    color: t.foreground,
    lineHeight: 50,
  },
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
    color: t.foreground,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
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
