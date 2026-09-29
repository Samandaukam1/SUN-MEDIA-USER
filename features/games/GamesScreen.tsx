import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Card, QueryView, Screen, SkeletonCards, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatShortDateTime } from '@/lib/time';
import { useNav } from '@/lib/routes';
import { blockedReason, fetchMyGames, type Game } from './api';
import { DIFFICULTY_LABEL } from './physics';

/** Akkaunt → O‘yinlar: the client's branded campaigns with their real rules and when the next game opens. */
export function GamesScreen() {
  const games = useQuery({ queryKey: ['games', 'mine'], queryFn: fetchMyGames });
  return (
    <Screen edges={[]} refreshing={games.isRefetching} onRefresh={() => games.refetch()}>
      <Stack.Screen options={{ title: 'O‘yinlar' }} />
      <QueryView
        query={games}
        skeleton={<SkeletonCards count={2} />}
        isEmpty={(d) => d.length === 0}
        empty={{ icon: 'gift', title: 'Hozir o‘yin yo‘q', description: 'SUN MEDIA yangi kampaniya boshlaganda shu yerda paydo bo‘ladi.' }}
      >
        {(list) => (
          <View style={styles.list}>
            {list.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

export function GameCard({ game, compact = false }: { game: Game; compact?: boolean }) {
  const { colors } = useTheme();
  const nav = useNav();
  const blocked = blockedReason(game);
  const primary = game.brand.primary ?? colors.accent;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={game.title} onPress={() => nav.go(`/games/${game.id}`)}>
      <Card style={[styles.card, { borderColor: primary, backgroundColor: game.brand.background ?? colors.surface }]}>
        <View style={styles.top}>
          <Text style={styles.icon}>{game.template === 'catch' ? '🐔' : '🥤'}</Text>
          <View style={styles.text}>
            <Text variant="label" style={{ color: primary }}>
              {game.client_name}
            </Text>
            <Text variant="heading" style={{ color: game.brand.text ?? colors.text }}>
              {game.title}
            </Text>
          </View>
          <Badge label={`${game.reward_days} kun Pro`} tone="accent" />
        </View>
        {!compact ? (
          <>
            <Text variant="caption" tone="secondary">
              {game.rules_text}
            </Text>
            <Text variant="caption" tone="tertiary">
              {[`${game.attempts} urinish`, DIFFICULTY_LABEL[game.difficulty], game.ends_at ? `${formatShortDateTime(game.ends_at)} gacha` : null].filter(Boolean).join(' · ')}
            </Text>
          </>
        ) : null}
        <Text variant="captionMedium" style={{ color: blocked ? colors.textTertiary : primary }}>
          {blocked ?? 'O‘ynash →'}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: { gap: spacing.sm, borderWidth: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { fontSize: 30, lineHeight: 36 },
  text: { flex: 1, gap: 2 },
});
