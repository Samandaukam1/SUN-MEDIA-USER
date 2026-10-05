import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { z } from "zod";
import { useMe } from "@/features/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase";

const zoneStats = z.object({ zone: z.number().int().min(1).max(15), shots: z.number().int().nonnegative(), goals: z.number().int().nonnegative(), saves: z.number().int().nonnegative() });
const challenge = z.object({
  id: z.string().uuid(), code: z.string(), title: z.string(), description: z.string(), metric: z.string(),
  target: z.number().int().positive(), progress: z.number().int().nonnegative(), completed: z.boolean(),
  rewardCoins: z.number().int().nonnegative(), coinsAwarded: z.number().int().nonnegative(), dayKey: z.string(),
});
const achievement = z.object({
  id: z.string().uuid(), code: z.string(), title: z.string(), description: z.string(),
  target: z.number().int().positive(), progress: z.number().int().nonnegative(), unlocked: z.boolean(),
  unlockedAt: z.string().nullable(), rewardCoins: z.number().int().nonnegative(), coinsAwarded: z.number().int().nonnegative(),
});
export const engagementSchema = z.object({
  serverNow: z.string(), dayKey: z.string(), timezone: z.string(),
  stats: z.object({
    gamesPlayed: z.number().int().nonnegative(), goals: z.number().int().nonnegative(),
    savesFaced: z.number().int().nonnegative(), shots: z.number().int().nonnegative(),
    personalBest: z.number().int().nonnegative(), longestCombo: z.number().int().nonnegative(),
    favoriteZone: z.number().int().min(1).max(15).nullable(), zones: z.array(zoneStats),
    practiceRounds: z.number().int().nonnegative().optional(), rewardRounds: z.number().int().nonnegative().optional(),
    averageScore: z.number().nullable().optional(),
    recentPerformance: z.array(z.object({ score: z.number().int().min(0).max(10), mode: z.string(), completedAt: z.string() })).optional(),
  }),
  streak: z.object({ current: z.number().int().nonnegative(), longest: z.number().int().nonnegative(), lastPlayedDate: z.string().nullable() }),
  challenges: z.array(challenge), achievements: z.array(achievement),
});
export type GameEngagement = z.infer<typeof engagementSchema>;
export const gameEngagementKey = (userId: string) => ["game-center", "engagement", userId] as const;

export async function fetchGameEngagement(signal?: AbortSignal): Promise<GameEngagement> {
  const request = getSupabase().rpc("get_game_engagement" as never, { p_game_key: "safi-penalty" } as never);
  const { data, error } = await (signal ? request.abortSignal(signal) : request);
  if (error) throw error;
  return engagementSchema.parse(data);
}

export function useGameEngagement() {
  const me = useMe();
  const enabled = me.kind === "client";
  const query = useQuery({ queryKey: gameEngagementKey(me.userId), queryFn: ({ signal }) => fetchGameEngagement(signal), enabled, staleTime: 20_000 });
  const { refetch } = query;
  useFocusEffect(useCallback(() => { if (enabled) void refetch(); }, [enabled, refetch]));
  return query;
}
