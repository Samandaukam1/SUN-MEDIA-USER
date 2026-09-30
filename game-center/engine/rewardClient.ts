import { z } from "zod";
import { getSupabase } from "@/lib/supabase";
import type { GameTransport } from "./types";
const zone = z.number().int().min(1).max(15);
const sessionSchema = z.object({
  sessionId: z.string().uuid(),
  gameId: z.string(),
  attempts: z.number().int().positive(),
  score: z.number().int().nonnegative(),
  attemptsUsed: z.number().int().nonnegative(),
  rewardEligible: z.boolean(),
  rewardReason: z.string().nullable(),
  expiresAt: z.string(),
  targetScore: z.number().int(),
  mode: z.enum(["practice", "free", "paid", "legacy"]).optional(),
  proRewardEligible: z.boolean().optional(),
  coinRewardEligible: z.boolean().optional(),
  coinBalance: z.number().int().nonnegative().safe().optional(),
});
const shotSchema = z.object({
  attemptId: z.string().uuid(),
  sessionId: z.string().uuid(),
  attempt: z.number().int().positive(),
  selectedZone: zone,
  goalkeeperZone: zone,
  result: z.enum(["CATCH", "GOAL"]),
  score: z.number().int().nonnegative(),
  attempts: z.number().int().positive(),
});
const finishSchema = z.object({
  score: z.number().int().nonnegative(),
  attempts: z.number().int(),
  boxes: z.boolean(),
  flagged: z.boolean(),
  coinAmount: z.number().int().nonnegative().safe().optional(),
  coinBalance: z.number().int().nonnegative().safe().optional(),
});
const rewardSchema = z.object({
  box: z.number().int(),
  won: z.boolean(),
  days: z.number().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  sold_out: z.boolean().optional(),
});
/** RN and browsers both support AbortController; do not rely on AbortSignal.timeout. */
async function requestWithTimeout<T>(
  request: (signal: AbortSignal) => PromiseLike<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await request(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
export const rewardClient: GameTransport = {
  async startGame(gameId, requestId, mode) {
    const { data, error } = await requestWithTimeout((signal) =>
      getSupabase()
        .rpc("game_center_start_mode", { p_game_key: gameId, p_request: requestId, p_mode: mode })
        .abortSignal(signal),
    );
    if (error) throw error;
    return sessionSchema.parse(data);
  },
  async submitShot(r) {
    const { data, error } = await requestWithTimeout((signal) =>
      getSupabase()
        .rpc("game_center_shoot", {
          p_session: r.sessionId,
          p_request: r.requestId,
          p_n: r.attempt,
          p_zone: r.selectedZone,
        })
        .abortSignal(signal),
    );
    if (error) throw error;
    return shotSchema.parse(data);
  },
  async finishGame(sessionId) {
    const { data, error } = await requestWithTimeout((signal) =>
      getSupabase()
        .rpc("game_center_finish", { p_session: sessionId })
        .abortSignal(signal),
    );
    if (error) throw error;
    return finishSchema.parse(data);
  },
  async claimReward(sessionId, box) {
    const { data, error } = await requestWithTimeout((signal) =>
      getSupabase()
        .rpc("game_center_claim", { p_session: sessionId, p_box: box })
        .abortSignal(signal),
    );
    if (error) throw error;
    return rewardSchema.parse(data);
  },
};
export function rewardModeLabel(eligible: boolean) {
  return eligible ? "Sovg‘ali o‘yin" : "Mashq rejimi";
}
export function rewardReasonText(reason: string | null) {
  return (
    (
      {
        NO_CAMPAIGN: "Sovg‘a kampaniyasi hozir faol emas.",
        SOLD_OUT: "Kampaniya sovg‘alari tugagan.",
        MAX_WINS: "Bu kampaniyadagi sovg‘angizni oldingiz.",
        DAILY_LIMIT: "Bugungi sovg‘ali urinishlar tugadi.",
        COOLDOWN: "Keyingi sovg‘a imkoniyati birozdan so‘ng ochiladi.",
      } as Record<string, string>
    )[reason ?? ""] ?? ""
  );
}
