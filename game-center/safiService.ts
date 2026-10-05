import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useMe } from "@/features/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase";
export const ARENAS = ["classic", "night", "summer", "new_year", "ramadan", "campaign"] as const;
export const presentationSchema = z.object({
  personality: z.enum(["CLASSIC", "SHOWMAN", "SERIOUS"]).default("CLASSIC"),
  arena: z.enum(ARENAS).default("classic"), boss: z.boolean().default(false), eventTitle: z.string().nullable().optional(),
});
export type SafiPresentation = z.infer<typeof presentationSchema>;
const color = z.string().regex(/^#[\dA-Fa-f]{6}$/);
const cosmeticSchema = z.object({
  id: z.string().uuid(), code: z.string(), title: z.string(),
  slot: z.enum(["gloves", "outfit", "arena", "trail", "goal_effect", "nameplate", "badge"]),
  price: z.number().int().nonnegative(), owned: z.boolean(), equipped: z.boolean(),
  appearance: z.object({ color: color.optional(), arena: z.enum(ARENAS).optional(), symbol: z.enum(["star", "shield", "egg"]).optional() }),
});
export const lockerSchema = z.object({
  items: z.array(cosmeticSchema), balance: z.number().int().nonnegative(),
  identity: z.object({ nickname: z.string(), listed: z.boolean() }).nullable(),
});
export type SafiLocker = z.infer<typeof lockerSchema>;
export type Cosmetic = z.infer<typeof cosmeticSchema>;
export const leaderboardSchema = z.object({
  period: z.enum(["daily", "weekly"]), dayKey: z.string(), enabled: z.boolean(),
  entries: z.array(z.object({ rank: z.number().int().positive(), playerId: z.string().uuid(), nickname: z.string(), avatar: z.string().nullable(), bestScore: z.number().int().min(0).max(10), goals: z.number().int().nonnegative(), rounds: z.number().int().nonnegative(), isMe: z.boolean() })),
});
const publicSchema = z.object({ enabled: z.boolean(), practiceEnabled: z.boolean(), rewardEnabled: z.boolean(), leaderboardsEnabled: z.boolean() });
/** All mutations and progress use authenticated RPCs; no table writes or local balance adjustments. */
export async function safiRpc(name: string, args: Record<string, unknown> = {}, signal?: AbortSignal): Promise<unknown> {
  const request = getSupabase().rpc(name as never, args as never);
  const { data, error } = await (signal ? request.abortSignal(signal) : request);
  if (error) throw error;
  return data;
}
export const lockerKey = (userId: string) => ["game-center", "locker", userId] as const;
export function useSafiLocker() {
  const me = useMe();
  return useQuery({ queryKey: lockerKey(me.userId), queryFn: async ({ signal }) => lockerSchema.parse(await safiRpc("get_safi_locker", {}, signal)), enabled: me.kind === "client", staleTime: 15_000 });
}
export function useSafiPublicConfig() {
  const me = useMe();
  return useQuery({ queryKey: ["game-center", "public", me.userId], queryFn: async ({ signal }) => publicSchema.parse(await safiRpc("get_safi_public_config", {}, signal)), enabled: me.kind === "client", staleTime: 20_000 });
}
export function equippedAppearance(locker: SafiLocker | undefined, slot: Cosmetic["slot"]) {
  return locker?.items.find((i) => i.slot === slot && i.equipped)?.appearance;
}
