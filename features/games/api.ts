import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';

const brandSchema = z
  .object({ primary: z.string().optional(), background: z.string().optional(), text: z.string().optional(), logo_url: z.string().optional() })
  .catch({});

const gameSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  client_name: z.string(),
  template: z.enum(['catch', 'pour', 'penalty']),
  title: z.string(),
  subtitle: z.string().nullable(),
  rules: z.string().nullable(),
  rules_text: z.string(),
  brand: brandSchema,
  attempts: z.number(),
  target_score: z.number(),
  difficulty: z.string(),
  reward_days: z.number(),
  ends_at: z.string().nullable(),
  max_sessions_per_day: z.number(),
  max_wins_per_user: z.number(),
  sold_out: z.boolean(),
  me: z.object({
    plays_today: z.number(),
    wins: z.number(),
    last_started_at: z.string().nullable(),
    next_play_at: z.string().nullable(),
    open_session: z.string().nullable(),
  }),
});
export type Game = z.infer<typeof gameSchema>;

export async function fetchMyGames(): Promise<Game[]> {
  const { data, error } = await getSupabase().rpc('get_my_games');
  if (error) throw error;
  return z.array(gameSchema).parse(data);
}

/** Why a game cannot start now, in plain words (null = it can). */
export function blockedReason(g: Game, now = Date.now()): string | null {
  if (g.sold_out) return 'Bu kampaniyaning sovg‘alari tugadi.';
  if (g.me.wins >= g.max_wins_per_user) return 'Siz bu kampaniyada sovg‘a yutib bo‘lgansiz.';
  if (g.me.plays_today >= g.max_sessions_per_day) return 'Bugungi o‘yinlar tugadi. Ertaga qayta urinib ko‘ring.';
  if (g.me.next_play_at && new Date(g.me.next_play_at).getTime() > now) return 'Keyingi o‘yin biroz vaqtdan keyin ochiladi.';
  return null;
}

export async function startGame(campaignId: string): Promise<{ session_id: string; attempts: number; target_score: number; template: Game['template'] }> {
  const { data, error } = await getSupabase().rpc('game_start', { p_campaign: campaignId });
  if (error) throw error;
  return data as never;
}

export async function nextAttempt(sessionId: string): Promise<{ n: number; params: Record<string, number> }> {
  const { data, error } = await getSupabase().rpc('game_next_attempt', { p_session: sessionId });
  if (error) throw error;
  return data as never;
}

export async function submitAttempt(sessionId: string, n: number, tapMs: number): Promise<{ n: number; hit: boolean; valid: boolean }> {
  const { data, error } = await getSupabase().rpc('game_submit_attempt', { p_session: sessionId, p_n: n, p_tap_ms: Math.round(tapMs) });
  if (error) throw error;
  return data as never;
}

/** Penalty: the shot at zone 0…14; the server answers with the goalkeeper's zone and goal / save. */
export async function shoot(sessionId: string, n: number, zone: number): Promise<{ n: number; zone: number; keeper: number; goal: boolean; valid: boolean }> {
  const { data, error } = await getSupabase().rpc('game_shoot', { p_session: sessionId, p_n: n, p_zone: zone });
  if (error) throw error;
  return data as never;
}

export async function finishGame(sessionId: string): Promise<{ score: number; attempts: number; target_score: number; boxes: boolean; flagged: boolean }> {
  const { data, error } = await getSupabase().rpc('game_finish', { p_session: sessionId });
  if (error) throw error;
  return data as never;
}

export async function openBox(sessionId: string, box: number): Promise<{ box: number; won: boolean; days?: number; ends_at?: string; sold_out?: boolean }> {
  const { data, error } = await getSupabase().rpc('game_open_box', { p_session: sessionId, p_box: box });
  if (error) throw error;
  return data as never;
}

const GAME_ERRORS: Record<string, string> = {
  GAME_COOLDOWN: 'Keyingi o‘yin biroz vaqtdan keyin ochiladi.',
  GAME_DAILY_LIMIT: 'Bugungi o‘yinlar tugadi. Ertaga qayta urinib ko‘ring.',
  GAME_MAX_WINS: 'Siz bu kampaniyada sovg‘a yutib bo‘lgansiz.',
  GAME_NOT_AVAILABLE: 'Bu o‘yin hozir mavjud emas.',
  GAME_SESSION_CLOSED: 'O‘yin vaqti tugadi. Qaytadan boshlang.',
  GAME_NO_ATTEMPTS_LEFT: 'Urinishlar tugadi.',
  GAME_ATTEMPT_CLOSED: 'Bu urinish yakunlangan.',
};

export function gameErrorMessage(error: unknown): string | null {
  const message = (error as { message?: string } | null)?.message;
  return message && GAME_ERRORS[message] ? GAME_ERRORS[message] : null;
}
