import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button, Card, EmptyState, QueryView, Screen, Text } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { toUserMessage } from '@/lib/errors';
import { useNav } from '@/lib/routes';
import { blockedReason, fetchMyGames, finishGame, gameErrorMessage, nextAttempt, openBox, startGame, submitAttempt, type Game } from './api';
import { aimX, chickenX, DIFFICULTY_LABEL, pourCentre, pourLevel, pourOverflowAt, type CatchParams, type PourParams } from './physics';

type Phase = 'intro' | 'playing' | 'result' | 'reveal';
type Finish = Awaited<ReturnType<typeof finishGame>>;
type Reveal = Awaited<ReturnType<typeof openBox>>;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const haptic = (kind: 'tap' | 'hit' | 'miss') => {
  if (Platform.OS === 'web') return;
  if (kind === 'tap') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  else Haptics.notificationAsync(kind === 'hit' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
};

/** One branded game: intro with the real rules → attempts (judged by the server) → score → gift boxes. */
export function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const games = useQuery({ queryKey: ['games', 'mine'], queryFn: fetchMyGames });
  return (
    <Screen edges={[]} scroll={false} contentStyle={styles.bleed}>
      <Stack.Screen options={{ title: games.data?.find((g) => g.id === id)?.title ?? 'O‘yin' }} />
      <QueryView query={games}>
        {(list) => {
          const game = list.find((g) => g.id === id);
          return game ? <Play game={game} /> : <EmptyState icon="gift" title="O‘yin topilmadi" description="Kampaniya tugagan bo‘lishi mumkin." />;
        }}
      </QueryView>
    </Screen>
  );
}

function Play({ game }: { game: Game }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const nav = useNav();
  const brand = { primary: game.brand.primary ?? colors.accent, background: game.brand.background ?? colors.surface, text: game.brand.text ?? colors.text };
  const [phase, setPhase] = useState<Phase>('intro');
  const [session, setSession] = useState<string | null>(null);
  const [marks, setMarks] = useState<(boolean | null)[]>([]);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const blocked = blockedReason(game);

  const fail = (e: unknown) => setError(gameErrorMessage(e) ?? toUserMessage(e));

  const begin = async () => {
    setError(null);
    setBusy(true);
    try {
      const s = await startGame(game.id);
      setSession(s.session_id);
      setMarks([]);
      setFinish(null);
      setReveal(null);
      setPhase('playing');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const done = useCallback(
    async (sid: string) => {
      try {
        setFinish(await finishGame(sid));
        setPhase('result');
      } catch (e) {
        fail(e);
      } finally {
        queryClient.invalidateQueries({ queryKey: ['games'] });
      }
    },
    [queryClient],
  );

  const pick = async (box: number) => {
    if (!session || busy) return;
    setBusy(true);
    try {
      const r = await openBox(session, box);
      setReveal(r);
      setPhase('reveal');
      haptic(r.won ? 'hit' : 'miss');
      if (r.won) queryClient.invalidateQueries({ queryKey: ['plan'] });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.fill, { backgroundColor: brand.background }]}>
      {phase === 'intro' ? (
        <View style={styles.intro}>
          <Text variant="label" style={{ color: brand.primary }}>
            {game.client_name}
          </Text>
          <Text variant="display" style={{ color: brand.text }}>
            {game.title}
          </Text>
          {game.subtitle ? <Text variant="body" style={{ color: brand.text }}>{game.subtitle}</Text> : null}
          <Card style={styles.rules}>
            <Text variant="subheading">{game.template === 'catch' ? 'Qanday o‘ynaladi' : 'Qanday o‘ynaladi'}</Text>
            <Text variant="body" tone="secondary">
              {game.template === 'catch'
                ? 'Nishon chapga-o‘ngga yuradi. To‘g‘ri paytda bosing — tuxum uchadi, tovuq uni tutishi kerak.'
                : 'Stakan to‘lib boradi. Suyuqlik yashil chiziq ichida bo‘lganda bosing.'}
            </Text>
            <Text variant="caption" tone="secondary">{`${game.attempts} urinish · ${DIFFICULTY_LABEL[game.difficulty] ?? game.difficulty}`}</Text>
            <Text variant="captionMedium">{game.rules_text}</Text>
            {game.rules ? <Text variant="caption" tone="tertiary">{game.rules}</Text> : null}
          </Card>
          {error ? <Text variant="caption" tone="danger">{error}</Text> : null}
          <Button title={blocked ?? 'Boshlash'} disabled={!!blocked} loading={busy} onPress={begin} />
        </View>
      ) : null}

      {phase === 'playing' && session ? (
        <Attempts game={game} session={session} brand={brand} marks={marks} onMark={(hit) => setMarks((m) => [...m, hit])} onDone={() => done(session)} onError={fail} />
      ) : null}

      {phase === 'result' && finish ? (
        <View style={styles.intro}>
          <Text variant="label" style={{ color: brand.primary }}>
            Natija
          </Text>
          <Text variant="hero" style={{ color: brand.text }}>{`${finish.score}/${finish.attempts}`}</Text>
          {finish.flagged ? (
            <Text variant="body" tone="danger">
              Natija tasdiqlanmadi: bosish vaqtlari odatiy emas. Keyinroq qayta o‘ynab ko‘ring.
            </Text>
          ) : finish.boxes ? (
            <>
              <Text variant="heading" style={{ color: brand.text }}>
                Sovg‘a imkoniyati! Bitta qutini tanlang.
              </Text>
              <View style={styles.boxes}>
                {[0, 1, 2].map((b) => (
                  <GiftBox key={b} color={brand.primary} disabled={busy} onPress={() => pick(b)} />
                ))}
              </View>
              <Text variant="caption" tone="tertiary">
                {game.rules_text}
              </Text>
            </>
          ) : (
            <Text variant="body" style={{ color: brand.text }}>{`Sovg‘a uchun ${finish.target_score}/${finish.attempts} kerak. Keyingi safar albatta!`}</Text>
          )}
          {error ? <Text variant="caption" tone="danger">{error}</Text> : null}
          {!finish.boxes || finish.flagged ? <Button title="O‘yinlarga qaytish" variant="secondary" onPress={() => nav.back()} /> : null}
        </View>
      ) : null}

      {phase === 'reveal' && reveal ? (
        <View style={styles.intro}>
          <Text variant="hero">{reveal.won ? '🎁' : '📦'}</Text>
          <Text variant="title" style={{ color: brand.text }}>
            {reveal.won ? `${reveal.days} kunlik SUN MEDIA Pro yutdingiz!` : reveal.sold_out ? 'Sovg‘alar tugab qoldi' : 'Bu safar quti bo‘sh chiqdi'}
          </Text>
          <Text variant="body" tone="secondary">
            {reveal.won ? 'Pro darhol faollashdi. Akkaunt bo‘limida muddatini ko‘rasiz.' : 'Keyingi o‘yinda omad!'}
          </Text>
          <Button title="Tayyor" onPress={() => nav.back()} />
        </View>
      ) : null}
    </View>
  );
}

function GiftBox({ color, disabled, onPress }: { color: string; disabled: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Sovg‘a qutisi" disabled={disabled} onPress={onPress}>
      <Animated.View style={[styles.box, { borderColor: color, transform: [{ scale }] }]}>
        <Text style={styles.boxEmoji}>🎁</Text>
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------
type Brand = { primary: string; background: string; text: string };

function Attempts({
  game,
  session,
  brand,
  marks,
  onMark,
  onDone,
  onError,
}: {
  game: Game;
  session: string;
  brand: Brand;
  marks: (boolean | null)[];
  onMark: (hit: boolean) => void;
  onDone: () => void;
  onError: (e: unknown) => void;
}) {
  const { width } = useWindowDimensions();
  const fieldW = Math.min(width - spacing.xl * 2, 460);
  const fieldH = Math.round(fieldW * 1.25);
  const [attempt, setAttempt] = useState<{ n: number; params: Record<string, number> } | null>(null);
  const [tapped, setTapped] = useState(false);
  const [outcome, setOutcome] = useState<boolean | null>(null);
  // Refs keep one attempt's timing stable across re-renders (the tap time is what the server judges).
  const current = useRef<{ n: number; params: Record<string, number> } | null>(null);
  const start = useRef(0);
  const frame = useRef<number | null>(null);
  const tapAt = useRef<number | null>(null);
  const resolved = useRef(false);
  const callbacks = useRef({ onMark, onDone, onError });
  callbacks.current = { onMark, onDone, onError };
  const a = useRef({ x1: new Animated.Value(0), x2: new Animated.Value(0), level: new Animated.Value(0), band: new Animated.Value(0), fly: new Animated.Value(0) }).current;

  const stopLoop = () => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };

  const load = useCallback(async () => {
    try {
      const next = await nextAttempt(session);
      tapAt.current = null;
      resolved.current = false;
      a.fly.setValue(0);
      current.current = next;
      start.current = now();
      setTapped(false);
      setOutcome(null);
      setAttempt(next);
    } catch (e) {
      callbacks.current.onError(e);
    }
  }, [session, a]);

  // Exactly one attempt is requested per step: on mount, then after each result.
  useEffect(() => {
    load();
    return stopLoop;
  }, [load]);

  const submit = useCallback(
    async (tapMs: number) => {
      const at = current.current;
      if (!at) return false;
      try {
        return (await submitAttempt(session, at.n, tapMs)).hit;
      } catch (e) {
        callbacks.current.onError(e);
        return false;
      }
    },
    [session],
  );

  const advance = useCallback(
    (hit: boolean) => {
      if (resolved.current) return;
      resolved.current = true;
      const n = current.current?.n ?? 0;
      callbacks.current.onMark(hit);
      haptic(hit ? 'hit' : 'miss');
      setOutcome(hit);
      setTimeout(() => {
        if (n >= game.attempts) callbacks.current.onDone();
        else load();
      }, 900);
    },
    [game.attempts, load],
  );

  // Motion loop for the current attempt (closed-form: exactly what the server will judge).
  useEffect(() => {
    if (!attempt) return;
    const p = attempt.params;
    const tick = () => {
      const t = (now() - start.current) / 1000;
      if (game.template === 'catch') {
        const cp = p as unknown as CatchParams;
        a.x1.setValue(chickenX(cp, t) * fieldW);
        if (tapAt.current == null) a.x2.setValue(aimX(cp, t) * fieldW);
        if (tapAt.current != null && t > tapAt.current / 1000 + cp.t + 0.35) return stopLoop();
      } else {
        const pp = p as unknown as PourParams;
        if (tapAt.current == null) {
          a.level.setValue(Math.min(pourLevel(pp, t), 1.25));
          if (t >= pourOverflowAt(pp)) {
            // Overflow: the attempt ends as a miss (the server judges the same moment).
            tapAt.current = Math.round(pourOverflowAt(pp) * 1000);
            setTapped(true);
            submit(tapAt.current).then((hit) => advance(!!hit));
          }
        }
        a.band.setValue(pourCentre(pp, t));
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return stopLoop;
  }, [attempt, game.template, fieldW, a, submit, advance]);

  const onTap = async () => {
    const at = current.current;
    if (!at || tapAt.current != null) return;
    const tapMs = now() - start.current;
    tapAt.current = tapMs;
    setTapped(true);
    haptic('tap');
    if (game.template === 'catch') {
      const cp = at.params as unknown as CatchParams;
      Animated.timing(a.fly, { toValue: 1, duration: cp.t * 1000, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
      const [hit] = await Promise.all([submit(tapMs), new Promise((r) => setTimeout(r, cp.t * 1000))]);
      advance(!!hit);
    } else {
      advance(!!(await submit(tapMs)));
    }
  };

  const score = marks.filter(Boolean).length;
  return (
    <View style={styles.play}>
      <View style={styles.hud}>
        <Text variant="subheading" style={{ color: brand.text }}>{`${Math.min((attempt?.n ?? 1), game.attempts)}/${game.attempts}`}</Text>
        <View style={styles.dots}>
          {Array.from({ length: game.attempts }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: marks[i] == null ? 'rgba(0,0,0,0.12)' : marks[i] ? brand.primary : '#9CA3AF' }]} />
          ))}
        </View>
        <Text variant="subheading" style={{ color: brand.text }}>{`★ ${score}`}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={game.template === 'catch' ? 'Tuxumni otish' : 'Quyishni to‘xtatish'} onPress={onTap} style={[styles.field, { width: fieldW, height: fieldH, borderColor: brand.primary }]}>
        {game.template === 'catch' ? <CatchScene a={a} w={fieldW} h={fieldH} brand={brand} attempt={attempt} tapped={tapped} /> : <PourScene a={a} w={fieldW} h={fieldH} brand={brand} params={attempt?.params as unknown as PourParams | undefined} />}
        {outcome != null ? (
          <View style={styles.outcome}>
            <Text variant="title" style={{ color: outcome ? brand.primary : '#6B7280' }}>
              {outcome ? (game.template === 'catch' ? 'Tutdi!' : 'Aniq!') : game.template === 'catch' ? 'O‘tib ketdi' : 'Xato'}
            </Text>
          </View>
        ) : null}
      </Pressable>
      <Text variant="caption" tone="tertiary" align="center">
        {tapped ? ' ' : game.template === 'catch' ? 'Ekranni bosing — tuxum nishonga uchadi' : 'Chiziq ichida bosing'}
      </Text>
    </View>
  );
}

type Anim = { x1: Animated.Value; x2: Animated.Value; level: Animated.Value; band: Animated.Value; fly: Animated.Value };

function CatchScene({ a, w, h, brand, attempt, tapped }: { a: Anim; w: number; h: number; brand: Brand; attempt: { params: Record<string, number> } | null; tapped: boolean }) {
  const gateY = 56;
  const eggStartX = w / 2 - 16;
  const eggStartY = h - 64;
  const r = (attempt?.params.r ?? 0.08) * w;
  return (
    <>
      {/* Gate (darvoza): posts and bar; the chicken walks on it */}
      <View style={[styles.gateBar, { top: gateY + 36, backgroundColor: brand.primary }]} />
      <View style={[styles.gatePost, { left: 0, top: gateY, backgroundColor: brand.primary }]} />
      <View style={[styles.gatePost, { right: 0, top: gateY, backgroundColor: brand.primary }]} />
      <Animated.View style={[styles.chicken, { top: gateY - 6, transform: [{ translateX: Animated.subtract(a.x1, 24) }] }]}>
        <Text style={styles.chickenEmoji}>🐔</Text>
        <View style={[styles.catchZone, { width: r * 2, left: 24 - r, borderColor: brand.primary }]} />
      </Animated.View>
      {/* Aim marker on the gate line */}
      {!tapped ? (
        <Animated.View style={[styles.aim, { top: gateY + 28, borderColor: brand.text, transform: [{ translateX: Animated.subtract(a.x2, 9) }] }]} />
      ) : null}
      {/* Egg: from the launcher to where the aim was at the tap */}
      <EggFlight a={a} startX={eggStartX} startY={eggStartY} endY={gateY + 24} />
      <Text style={[styles.launcher, { top: h - 40, left: w / 2 - 20, color: brand.text }]}>▲</Text>
    </>
  );
}

/** The egg flies straight up to the aim point captured at the tap (x2 stops updating after the tap). */
function EggFlight({ a, startX, startY, endY }: { a: Anim; startX: number; startY: number; endY: number }) {
  const x = Animated.add(Animated.multiply(a.fly, Animated.subtract(Animated.subtract(a.x2, 16), startX)), startX);
  const y = a.fly.interpolate({ inputRange: [0, 1], outputRange: [startY, endY] });
  return (
    <Animated.View pointerEvents="none" style={[styles.eggBox, { transform: [{ translateX: x }, { translateY: y }] }]}>
      <Text style={styles.eggEmoji}>🥚</Text>
    </Animated.View>
  );
}

function PourScene({ a, w, h, brand, params }: { a: Anim; w: number; h: number; brand: Brand; params?: PourParams }) {
  const glassW = w * 0.46;
  const glassH = h * 0.7;
  const scale = glassH / 1.25;
  const bandH = (params?.w ?? 0.05) * 2 * scale;
  return (
    <View style={styles.pourWrap}>
      <View style={[styles.glass, { width: glassW, height: glassH, borderColor: brand.text }]}>
        <Animated.View style={[styles.liquid, { backgroundColor: brand.primary, height: a.level.interpolate({ inputRange: [0, 1.25], outputRange: [0, glassH] }) }]} />
        <Animated.View
          style={[
            styles.band,
            {
              height: bandH,
              borderColor: '#22C55E',
              bottom: Animated.subtract(Animated.multiply(a.band, scale), bandH / 2),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bleed: { flex: 1, padding: 0, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, gap: 0 },
  intro: { flex: 1, padding: spacing.xl, gap: spacing.lg, justifyContent: 'center' },
  rules: { gap: spacing.sm },
  play: { flex: 1, alignItems: 'center', paddingTop: spacing.lg, gap: spacing.md },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: spacing.xl, gap: spacing.md },
  dots: { flexDirection: 'row', gap: 4, flex: 1, justifyContent: 'center', flexWrap: 'wrap' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  field: { borderRadius: radius.lg, borderWidth: 2, overflow: 'hidden' },
  gateBar: { position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3 },
  gatePost: { position: 'absolute', width: 8, height: 60, borderRadius: 4 },
  chicken: { position: 'absolute', left: 0, width: 48, alignItems: 'center' },
  chickenEmoji: { fontSize: 36, lineHeight: 42 },
  catchZone: { position: 'absolute', top: 40, height: 4, borderRadius: 2, borderWidth: 1, opacity: 0.5 },
  aim: { position: 'absolute', left: 0, width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  eggBox: { position: 'absolute', left: 0, top: 0, width: 32, alignItems: 'center' },
  eggEmoji: { fontSize: 28, lineHeight: 34 },
  launcher: { position: 'absolute', width: 40, textAlign: 'center', fontSize: 22 },
  outcome: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pourWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: spacing.xxl },
  glass: { borderWidth: 3, borderTopWidth: 0, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, overflow: 'hidden', justifyContent: 'flex-end' },
  liquid: { width: '100%' },
  band: { position: 'absolute', left: 0, right: 0, borderTopWidth: 2, borderBottomWidth: 2, backgroundColor: 'rgba(34,197,94,0.15)' },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  box: { width: 92, height: 92, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)' },
  boxEmoji: { fontSize: 44, lineHeight: 52 },
});
