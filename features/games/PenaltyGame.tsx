import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Text } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { nextAttempt, shoot, type Game } from './api';

type Brand = { primary: string; background: string; text: string };
type Shot = { zone: number; keeper: number; goal: boolean };

const ROWS = 3;
const COLS = 5;
const USE_NATIVE = Platform.OS !== 'web';
const tap = (kind: 'shot' | 'goal' | 'save') => {
  if (Platform.OS === 'web') return;
  if (kind === 'shot') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  else Haptics.notificationAsync(kind === 'goal' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
};

/**
 * SAFI penalty: pick one of 15 zones of the goal; the chicken goalkeeper dives where the server decided when the
 * attempt started (never known to the app before the shot). Goal = +1, the egg breaks on the net; a save keeps it.
 */
export function PenaltyAttempts({
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
  onMark: (goal: boolean) => void;
  onDone: () => void;
  onError: (e: unknown) => void;
}) {
  const { width } = useWindowDimensions();
  const W = Math.min(width - spacing.xl * 2, 460);
  const H = Math.round(W * 1.12);
  // The goal mouth: 88% wide, upper part of the scene.
  const goal = { x: W * 0.06, y: H * 0.1, w: W * 0.88, h: H * 0.5 };
  const cell = { w: goal.w / COLS, h: goal.h / ROWS };
  const zoneCentre = (z: number) => ({ x: goal.x + (z % COLS) * cell.w + cell.w / 2, y: goal.y + Math.floor(z / COLS) * cell.h + cell.h / 2 });
  const keeperHome = { x: goal.x + goal.w / 2, y: goal.y + goal.h - 34 };
  const spot = { x: W / 2, y: H - 46 };

  const [n, setN] = useState(0);
  const [ready, setReady] = useState(false);
  const [shot, setShot] = useState<Shot | null>(null);
  const [aimed, setAimed] = useState<number | null>(null);
  const busy = useRef(false);
  const cb = useRef({ onMark, onDone, onError });
  cb.current = { onMark, onDone, onError };

  const egg = useRef(new Animated.Value(0)).current; // 0 spot → 1 target
  const eggTarget = useRef(new Animated.ValueXY({ x: spot.x, y: spot.y })).current;
  const dive = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const tilt = useRef(new Animated.Value(0)).current; // -1 … 1
  const fall = useRef(new Animated.Value(0)).current; // 0 … 1 after a miss
  const splat = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    try {
      const next = await nextAttempt(session);
      egg.setValue(0);
      dive.setValue({ x: 0, y: 0 });
      tilt.setValue(0);
      fall.setValue(0);
      splat.setValue(0);
      setShot(null);
      setAimed(null);
      setN(next.n);
      busy.current = false;
      // The server refuses shots faster than a human can react (≈ ¼ s); open the goal just after that.
      setReady(false);
      setTimeout(() => setReady(true), 320);
    } catch (e) {
      cb.current.onError(e);
    }
  }, [session, egg, dive, tilt, fall, splat]);

  useEffect(() => {
    load();
  }, [load]);

  const fire = async (zone: number) => {
    if (!ready || busy.current || !n) return;
    busy.current = true;
    setAimed(zone);
    tap('shot');
    const target = zoneCentre(zone);
    eggTarget.setValue(target);
    const flight = Animated.timing(egg, { toValue: 1, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    flight.start();
    let result: Shot;
    try {
      const r = await shoot(session, n, zone);
      result = { zone, keeper: r.keeper, goal: r.goal };
    } catch (e) {
      cb.current.onError(e);
      return;
    }
    // A save: the goalkeeper reaches the ball. A goal: it dives to its own (wrong) zone and falls.
    const to = result.goal ? zoneCentre(result.keeper) : target;
    const dir = Math.sign(to.x - keeperHome.x) || (result.keeper % COLS >= 2 ? 1 : -1);
    Animated.parallel([
      Animated.timing(dive, { toValue: { x: to.x - keeperHome.x, y: to.y - keeperHome.y }, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE }),
      Animated.timing(tilt, { toValue: dir, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE }),
    ]).start(() => {
      setShot(result);
      tap(result.goal ? 'goal' : 'save');
      if (result.goal) {
        Animated.parallel([
          Animated.spring(splat, { toValue: 1, useNativeDriver: USE_NATIVE, friction: 6, tension: 120 }),
          Animated.timing(fall, { toValue: 1, duration: 520, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE }),
        ]).start();
      }
      cb.current.onMark(result.goal);
      setTimeout(() => {
        if (n >= game.attempts) cb.current.onDone();
        else load();
      }, 1400);
    });
  };

  // Egg path: a gentle arc from the spot to the chosen zone, shrinking with distance.
  const t = [0, 0.25, 0.5, 0.75, 1];
  const eggX = Animated.add(spot.x - 16, Animated.multiply(egg, Animated.subtract(eggTarget.x, spot.x)));
  const eggY = Animated.add(
    Animated.add(spot.y - 18, Animated.multiply(egg, Animated.subtract(eggTarget.y, spot.y))),
    egg.interpolate({ inputRange: t, outputRange: t.map((v) => -Math.sin(Math.PI * v) * 36) }),
  );
  const eggScale = egg.interpolate({ inputRange: [0, 1], outputRange: [1, 0.62] });
  const score = marks.filter(Boolean).length;
  const goal2 = shot?.goal;

  return (
    <View style={styles.play}>
      <View style={styles.hud}>
        <Text variant="subheading" style={{ color: brand.text }}>{`${Math.max(n, 1)}/${game.attempts}`}</Text>
        <View style={styles.dots}>
          {Array.from({ length: game.attempts }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: marks[i] == null ? 'rgba(0,0,0,0.12)' : marks[i] ? brand.primary : '#9CA3AF' }]} />
          ))}
        </View>
        <Text variant="subheading" style={{ color: brand.text }}>{`${score} gol`}</Text>
      </View>

      <View style={[styles.field, { width: W, height: H }]}>
        <Scene W={W} H={H} goal={goal} brand={brand} />

        {/* 15 zones: invisible targets; the chosen one lights up softly */}
        {Array.from({ length: ROWS * COLS }, (_, z) => (
          <Pressable
            key={z}
            accessibilityRole="button"
            accessibilityLabel={`Zona ${Math.floor(z / COLS) + 1}-qator, ${(z % COLS) + 1}-ustun`}
            disabled={!ready || aimed !== null}
            onPress={() => fire(z)}
            style={({ pressed }) => [
              styles.zone,
              {
                left: goal.x + (z % COLS) * cell.w,
                top: goal.y + Math.floor(z / COLS) * cell.h,
                width: cell.w,
                height: cell.h,
                backgroundColor: aimed === z ? `${brand.primary}26` : pressed ? `${brand.primary}14` : 'transparent',
              },
            ]}
          />
        ))}

        {/* Goalkeeper */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.keeper,
            {
              left: keeperHome.x - 32,
              top: keeperHome.y - 36,
              transform: [
                { translateX: dive.x },
                { translateY: Animated.add(dive.y, fall.interpolate({ inputRange: [0, 1], outputRange: [0, 26] })) },
                { rotate: Animated.add(tilt.interpolate({ inputRange: [-1, 0, 1], outputRange: [-0.5, 0, 0.5] }), Animated.multiply(fall, tilt.interpolate({ inputRange: [-1, 1], outputRange: [-1.1, 1.1] }))).interpolate({ inputRange: [-2, 2], outputRange: ['-114deg', '114deg'] }) },
              ],
            },
          ]}
        >
          <Text style={styles.keeperEmoji}>🐔</Text>
        </Animated.View>

        {/* Egg (stays in the goalkeeper's wings on a save; breaks on the net on a goal) */}
        {!goal2 ? (
          <Animated.View pointerEvents="none" style={[styles.egg, { transform: [{ translateX: eggX }, { translateY: eggY }, { scale: eggScale }] }]}>
            <Text style={styles.eggEmoji}>🥚</Text>
          </Animated.View>
        ) : null}
        {goal2 && shot ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.splat, { left: zoneCentre(shot.zone).x - 34, top: zoneCentre(shot.zone).y - 30, opacity: splat, transform: [{ scale: splat }] }]}
          >
            <Splat />
          </Animated.View>
        ) : null}

        {shot ? (
          <View pointerEvents="none" style={styles.banner}>
            <Text variant="title" style={{ color: shot.goal ? brand.primary : brand.text }}>
              {shot.goal ? 'GOL! +1' : 'Ushladi!'}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="caption" align="center" style={[styles.hint, { color: brand.text }]}>
        {ready && aimed === null ? 'Darvozaning istalgan nuqtasini tanlang' : ' '}
      </Text>
    </View>
  );
}

function Scene({ W, H, goal, brand }: { W: number; H: number; goal: { x: number; y: number; w: number; h: number }; brand: Brand }) {
  const post = 7;
  const netV = Array.from({ length: 11 }, (_, i) => goal.x + (goal.w / 10) * i);
  const netH = Array.from({ length: 7 }, (_, i) => goal.y + (goal.h / 6) * i);
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="pitch" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={brand.background} />
          <Stop offset="0.62" stopColor={brand.background} />
          <Stop offset="1" stopColor="#E8EFE3" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill="url(#pitch)" />
      {/* Penalty area line and spot */}
      <Line x1={W * 0.02} y1={goal.y + goal.h} x2={W * 0.98} y2={goal.y + goal.h} stroke="#FFFFFF" strokeWidth={3} strokeOpacity={0.9} />
      <Ellipse cx={W / 2} cy={H - 26} rx={16} ry={5} fill="#FFFFFF" opacity={0.85} />
      {/* Net */}
      {netV.map((x) => (
        <Line key={`v${x}`} x1={x} y1={goal.y} x2={x} y2={goal.y + goal.h} stroke={brand.text} strokeOpacity={0.07} strokeWidth={1} />
      ))}
      {netH.map((y) => (
        <Line key={`h${y}`} x1={goal.x} y1={y} x2={goal.x + goal.w} y2={y} stroke={brand.text} strokeOpacity={0.07} strokeWidth={1} />
      ))}
      {/* Posts and crossbar (brand colour) */}
      <Rect x={goal.x - post} y={goal.y - post} width={goal.w + post * 2} height={post} rx={post / 2} fill={brand.primary} />
      <Rect x={goal.x - post} y={goal.y - post} width={post} height={goal.h + post} rx={post / 2} fill={brand.primary} />
      <Rect x={goal.x + goal.w} y={goal.y - post} width={post} height={goal.h + post} rx={post / 2} fill={brand.primary} />
      {/* Goalkeeper's shadow */}
      <Ellipse cx={goal.x + goal.w / 2} cy={goal.y + goal.h - 2} rx={24} ry={5} fill="#000000" opacity={0.08} />
    </Svg>
  );
}

/** Broken egg on the net: yolk, white and three shell pieces. */
function Splat() {
  return (
    <Svg width={68} height={60} viewBox="0 0 68 60">
      <Path d="M34 6c9 0 12 8 20 9s12 9 7 16-1 13-9 16-13 8-21 6-16-3-20-10-8-13-3-19 7-7 10-12 7-6 16-6z" fill="#FFFDF5" stroke="#EDE6D2" strokeWidth={1} />
      <Circle cx={35} cy={31} r={11} fill="#F6B51E" />
      <Circle cx={31} cy={27} r={3} fill="#FFE08A" />
      <Path d="M6 10l6 3-4 5z" fill="#F4EBD6" />
      <Path d="M60 44l-7 1 4 6z" fill="#F4EBD6" />
      <Path d="M58 8l-4 7 7-1z" fill="#F4EBD6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  hint: { opacity: 0.72 },
  play: { flex: 1, alignItems: 'center', paddingTop: spacing.lg, gap: spacing.md },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: spacing.xl, gap: spacing.md },
  dots: { flexDirection: 'row', gap: 4, flex: 1, justifyContent: 'center', flexWrap: 'wrap' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  field: { borderRadius: radius.lg, overflow: 'hidden' },
  zone: { position: 'absolute', borderRadius: 6 },
  keeper: { position: 'absolute', width: 64, alignItems: 'center' },
  keeperEmoji: { fontSize: 52, lineHeight: 60 },
  egg: { position: 'absolute', left: 0, top: 0, width: 32, alignItems: 'center' },
  eggEmoji: { fontSize: 30, lineHeight: 36 },
  splat: { position: 'absolute' },
  banner: { position: 'absolute', left: 0, right: 0, bottom: 64, alignItems: 'center' },
});
